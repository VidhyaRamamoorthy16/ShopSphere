import os
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Import middleware components
from middleware.advanced_rate_limiter import rate_limiter
from middleware.throttler import throttler
from middleware.rate_limit_middleware import add_rate_limit_middleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger("MainApp")

# Initialize FastAPI app
app = FastAPI(
    title="Intelligent API Gateway",
    description="E-commerce API Gateway with Advanced Rate Limiting and Throttling",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add rate limiting middleware (this wraps the entire app)
app = add_rate_limit_middleware(app)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Initialize rate limiter
        await rate_limiter.initialize()
        logger.info("Rate limiter initialized")
        
        # Initialize throttler
        await throttler.initialize()
        logger.info("Throttler initialized")
        
        logger.info("API Gateway started successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        # Close Redis connections
        if rate_limiter.redis_client:
            await rate_limiter.redis_client.close()
        if throttler.redis_client:
            await throttler.redis_client.close()
        
        logger.info("API Gateway shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Intelligent API Gateway",
        "version": "2.0.0",
        "features": [
            "Advanced Rate Limiting",
            "Intelligent Throttling", 
            "User Tier Management",
            "Real-time Monitoring"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        await rate_limiter.redis_client.ping()
        
        return {
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",
            "services": {
                "rate_limiter": "operational",
                "throttler": "operational",
                "redis": "connected"
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": "2024-01-01T00:00:00Z"
            }
        )

@app.get("/api/rate-limit/status")
async def rate_limit_status():
    """Get current rate limiting status (for monitoring)"""
    try:
        # Get Redis info
        redis_info = await rate_limiter.redis_client.info()
        
        return {
            "rate_limiter": {
                "status": "active",
                "strategies": ["fixed_window", "sliding_window", "token_bucket"],
                "user_tiers": ["guest", "user", "admin", "suspended"]
            },
            "redis": {
                "connected_clients": redis_info.get("connected_clients", 0),
                "used_memory": redis_info.get("used_memory_human", "unknown"),
                "uptime_in_seconds": redis_info.get("uptime_in_seconds", 0)
            },
            "throttler": {
                "status": "active",
                "login_failure_tracking": True,
                "search_throttling": True,
                "duplicate_order_prevention": True
            }
        }
        
    except Exception as e:
        logger.error(f"Rate limit status check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get rate limit status")

@app.post("/api/rate-limit/test")
async def test_rate_limit():
    """Test endpoint for rate limiting"""
    return {
        "message": "Rate limit test endpoint",
        "timestamp": "2024-01-01T00:00:00Z",
        "note": "This endpoint is subject to rate limiting"
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "path": request.url.path,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    )

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5001))
    
    logger.info(f"Starting API Gateway on {host}:{port}")
    logger.info("Rate limiting and throttling enabled")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
        access_log=True
    )
