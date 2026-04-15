import time
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

# Simple in-memory storage
rate_limit_db = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Gateway starting up...")
    yield
    logging.info("Gateway shutting down...")

app = FastAPI(title="Intelligent API Gateway", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(name)s | %(message)s')
logger = logging.getLogger("Gateway")

@app.get("/health")
async def health():
    return {"status": "working", "service": "API-Gateway", "port": 5001}

@app.get("/api/test")
async def api_test():
    return {"status": "working", "endpoint": "/api/test"}

@app.middleware("http")
async def gateway_middleware(request: Request, call_next):
    ip = request.client.host
    path = request.url.path
    method = request.method
    
    # Skip for health checks and docs
    if path in ["/health", "/", "/docs", "/openapi.json"] or request.method == "OPTIONS":
        return await call_next(request)
    
    # Basic rate limiting
    now = time.time()
    if ip not in rate_limit_db or (now - rate_limit_db[ip].get('reset', 0)) > 60:
        rate_limit_db[ip] = {'count': 1, 'reset': now}
    else:
        rate_limit_db[ip]['count'] = rate_limit_db[ip].get('count', 0) + 1
    
    if rate_limit_db[ip]['count'] > 100:
        logger.warning(f"Rate Limit Exceeded for {ip}")
        return JSONResponse(status_code=429, content={"error": "Rate limit exceeded"})
    
    logger.info(f"Request: {method} {path} from {ip}")
    
    # Forward to backend
    if path.startswith("/api/"):
        try:
            backend_path = path[5:]
            backend_url = f"http://localhost:8000/{backend_path}"
            
            async with httpx.AsyncClient() as client:
                body = await request.body()
                headers = {k: v for k, v in request.headers.items() 
                          if k.lower() not in ['host', 'content-length']}
                
                response = await client.request(
                    method=method,
                    url=backend_url,
                    headers=headers,
                    content=body,
                    timeout=30.0
                )
                return Response(
                    content=response.content,
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
        except Exception as e:
            logger.error(f"Backend error: {e}")
            return JSONResponse(status_code=503, content={"error": "Backend unavailable"})
    
    return await call_next(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
