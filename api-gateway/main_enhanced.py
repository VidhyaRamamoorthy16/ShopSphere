import time
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from config import settings
from utils.forwarder import forward_request
from middleware.redis_rate_limiter import rate_limit_middleware, cleanup_task
import asyncio

# Simple Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(name)s | %(message)s')
logger = logging.getLogger("Gateway-Baseline")

app = FastAPI(title="Enhanced API Gateway with Redis Rate Limiting")

# Step 2: ADD CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks"""
    # Start cleanup task
    asyncio.create_task(cleanup_task())
    logger.info("API Gateway started with Redis rate limiting")

@app.get("/health")
async def health():
    return {"status": "working", "service": "API-Gateway", "rate_limiter": "Redis"}

@app.get("/api/test")
async def api_test():
    return {"status": "working", "endpoint": "/api/test"}

# Step 3: ENHANCED GLOBAL MIDDLEWARE
@app.middleware("http")
async def api_gateway_middleware(request: Request, call_next):
    
    # --- 1. Extract Details ---
    ip = request.client.host
    path = request.url.path
    method = request.method
    
    # --- Skip middleware for OPTIONS requests (CORS preflight) ---
    if request.method == "OPTIONS":
        return await call_next(request)

    if path == "/" or path == "/health":
        return await call_next(request)
        
    body = await request.body()
    
    # --- 1.2 Sanitize Headers (Do not forward Supabase internal keys) ---
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'apikey']}

    # --- 2. Enhanced Rate Limiting with Redis ---
    rate_limit_result = await rate_limit_middleware.check_rate_limit(request)
    
    if not rate_limit_result["allowed"]:
        logger.warning(f"Rate limit exceeded for {ip} on {path}")
        return JSONResponse(
            status_code=429, 
            content={
                "error": "Rate limit exceeded",
                "limit": rate_limit_result["limit"],
                "window": rate_limit_result["window"],
                "reset_time": rate_limit_result["reset_time"]
            },
            headers={
                "X-RateLimit-Limit": str(rate_limit_result["limit"]),
                "X-RateLimit-Remaining": str(rate_limit_result["remaining"]),
                "X-RateLimit-Reset": str(rate_limit_result["reset_time"])
            }
        )

    # --- 3. Authentication (Enhanced JWT validation) ---
    auth_header = request.headers.get("Authorization")
    user_id = None
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            # Basic JWT validation (can be enhanced with shared secret)
            import jwt
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("userId")
            request.state.user_id = user_id
            
            # Add user info to headers for backend
            headers["X-User-ID"] = str(user_id)
            headers["X-User-Role"] = payload.get("role", "user")
            
        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired token from {ip} on {path}")
            return JSONResponse(status_code=401, content={"error": "Token expired"})
        except jwt.InvalidTokenError:
            logger.warning(f"Invalid token from {ip} on {path}")
            return JSONResponse(status_code=401, content={"error": "Invalid token"})

    # --- 4. Basic Security Check (Rule-based) ---
    malicious_payloads = ["DROP TABLE", "<script>", "1=1", "UNION SELECT", "javascript:"]
    request_content = f"{path} {body.decode('utf-8', errors='ignore')}"
    for payload in malicious_payloads:
        if payload.lower() in request_content.lower():
            logger.critical(f"Security Alert: Malicious pattern '{payload}' detected from {ip}")
            return JSONResponse(status_code=403, content={"error": "Malicious request detected"})

    # --- 5 & 6. Forward Request & Receive Response ---
    if path.startswith("/api/"):
        # Map: /api/products -> /products
        backend_path = path[5:] 
        backend_url = f"{settings.BACKEND_URL}/{backend_path}"
        
        logger.info(f"Forwarding: {method} {path} -> {backend_url} (User: {user_id or 'anonymous'})")
        backend_response = forward_request(method, backend_url, headers, body)
        
        if backend_response is None:
            return JSONResponse(status_code=500, content={"error": "Internal Error: Backend Unreachable"})
            
        # --- 7. Return Response to Client ---
        # Exclude transfer-encoding to avoid conflicts
        resp_headers = {k: v for k, v in backend_response.headers.items() if k.lower() != 'transfer-encoding'}
        
        # Add rate limit headers
        resp_headers.update({
            "X-RateLimit-Limit": str(rate_limit_result["limit"]),
            "X-RateLimit-Remaining": str(rate_limit_result["remaining"]),
            "X-RateLimit-Reset": str(rate_limit_result["reset_time"])
        })
        
        return Response(
            content=backend_response.content,
            status_code=backend_response.status_code,
            headers=resp_headers
        )
    
    # Default for non-api routes
    return await call_next(request)

# Rate limit management endpoints
@app.get("/admin/rate-limit/stats/{identifier}")
async def get_rate_limit_stats(identifier: str, request: Request):
    """Get rate limit statistics (admin only)"""
    # This would need proper admin authentication
    client_ip = request.client.host
    stats = await rate_limit_middleware.rate_limiter.get_usage_stats(client_ip, identifier)
    return stats

@app.post("/admin/rate-limit/reset/{identifier}")
async def reset_rate_limit(identifier: str, request: Request):
    """Reset rate limit for a user (admin only)"""
    client_ip = request.client.host
    success = await rate_limit_middleware.rate_limiter.reset_key(client_ip, identifier)
    return {"success": success, "message": "Rate limit reset" if success else "Failed to reset"}

if __name__ == "__main__":
    import uvicorn
    # Use standard uvicorn targeted programmatic run
    uvicorn.run(app, host=settings.GATEWAY_HOST, port=settings.GATEWAY_PORT)
