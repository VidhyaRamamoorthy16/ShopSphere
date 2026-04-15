import os
import sys
import asyncio
import logging
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import redis
import uvicorn
from pydantic import BaseModel
import json
import ipaddress
from contextlib import asynccontextmanager

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from middleware.intelligent_logger import intelligent_logger
from middleware.intelligent_rate_limiter import rate_limiter
from middleware.ml_detector_complete import threat_detector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger("AdminServer")

# Configuration
ADMIN_PORT = int(os.getenv('ADMIN_PORT', 3000))
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5KS')  # 'admin123'
ADMIN_JWT_SECRET = os.getenv('ADMIN_JWT_SECRET', secrets.token_urlsafe(32))
ADMIN_JWT_EXPIRY = int(os.getenv('ADMIN_JWT_EXPIRY', 900))  # 15 minutes
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Redis client for admin operations
admin_redis = redis.from_url(REDIS_URL, decode_responses=True)

# Security headers
SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    logger.info("Admin server starting up...")
    
    # Initialize admin session tracking
    await initialize_admin_system()
    
    yield
    
    logger.info("Admin server shutting down...")

# Initialize FastAPI app
admin_app = FastAPI(
    title="Admin Control Panel",
    description="Isolated admin control panel for API Gateway",
    version="1.0.0",
    docs_url=None,  # Disable docs in production
    redoc_url=None,
    lifespan=lifespan
)

# CORS - Only allow localhost
admin_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security middleware
@admin_app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    
    return response

# Rate limiting middleware for admin
@admin_app.middleware("http")
async def admin_rate_limit(request: Request, call_next):
    """Apply rate limiting to admin endpoints"""
    if not request.url.path.startswith("/admin/"):
        return await call_next(request)
    
    client_ip = request.client.host
    
    # Use rate limiter with strict limits for admin
    result = await rate_limiter.is_allowed(
        identifier=f"admin:{client_ip}",
        tier=rate_limiter.RateLimitTier.SUSPICIOUS,  # Use strictest tier
        strategy=rate_limiter.RateLimitStrategy.SLIDING_WINDOW
    )
    
    if not result.allowed:
        logger.warning(f"Admin rate limit exceeded for {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers={
                "X-RateLimit-Limit": str(result.limit),
                "X-RateLimit-Remaining": str(result.remaining),
                "X-RateLimit-Reset": str(result.reset_time)
            }
        )
    
    response = await call_next(request)
    
    # Add rate limit headers
    response.headers.update({
        "X-RateLimit-Limit": str(result.limit),
        "X-RateLimit-Remaining": str(result.remaining),
        "X-RateLimit-Reset": str(result.reset_time)
    })
    
    return response

# Pydantic models
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class RateLimitUpdate(BaseModel):
    tier: str
    limit: int
    window_seconds: int

class IPBanRequest(BaseModel):
    ip: str
    duration_hours: int
    reason: str

class WhitelistRequest(BaseModel):
    ip: str
    reason: Optional[str] = None

class MLThresholdUpdate(BaseModel):
    allow: float = 0.3
    flag: float = 0.6
    alert: float = 0.8
    block: float = 0.9

class MiddlewareToggle(BaseModel):
    module: str
    enabled: bool

class MLFeedbackRequest(BaseModel):
    request_id: str
    was_false_positive: bool
    feedback_notes: Optional[str] = None

async def initialize_admin_system():
    """Initialize admin system components"""
    try:
        # Verify admin credentials
        if not ADMIN_USERNAME or not ADMIN_PASSWORD:
            raise ValueError("Admin credentials not configured")
        
        # Test Redis connection
        admin_redis.ping()
        
        # Initialize admin session tracking
        admin_sessions_key = "admin:sessions"
        if not admin_redis.exists(admin_sessions_key):
            admin_redis.hset(admin_sessions_key, "initialized", datetime.now().isoformat())
        
        # Initialize login attempt tracking
        login_attempts_key = "admin:login_attempts"
        if not admin_redis.exists(login_attempts_key):
            admin_redis.hset(login_attempts_key, "initialized", datetime.now().isoformat())
        
        logger.info("Admin system initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize admin system: {e}")
        raise

def verify_admin_password(plain_password: str, hashed_password: str) -> bool:
    """Verify admin password against bcrypt hash"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_admin_jwt() -> str:
    """Create admin JWT token"""
    import jwt
    
    payload = {
        "sub": ADMIN_USERNAME,
        "type": "admin",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(seconds=ADMIN_JWT_EXPIRY),
        "jti": secrets.token_urlsafe(16)  # Unique token ID
    }
    
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")

def verify_admin_jwt(token: str) -> Dict[str, Any]:
    """Verify admin JWT token"""
    import jwt
    
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        
        # Check if token is blacklisted
        jti = payload.get("jti")
        if jti and admin_redis.exists(f"admin:blacklist:{jti}"):
            raise jwt.InvalidTokenError("Token is blacklisted")
        
        # Verify token type
        if payload.get("type") != "admin":
            raise jwt.InvalidTokenError("Invalid token type")
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise jwt.InvalidTokenError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid token: {str(e)}")

async def log_admin_action(
    admin_user: str,
    action: str,
    target: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip: Optional[str] = None
):
    """Log admin action for audit trail"""
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "admin_user": admin_user,
            "action": action,
            "target": target,
            "old_value": old_value,
            "new_value": new_value,
            "ip": ip
        }
        
        # Store in Redis with 30-day retention
        log_key = f"admin:audit:{datetime.now().strftime('%Y%m%d')}"
        await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.lpush, log_key, json.dumps(log_entry)
        )
        await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.expire, log_key, 30 * 24 * 3600
        )
        
        logger.info(f"Admin action logged: {admin_user} -> {action}")
        
    except Exception as e:
        logger.error(f"Failed to log admin action: {e}")

async def check_login_attempts(ip: str) -> bool:
    """Check if IP is locked due to failed login attempts"""
    attempts_key = f"admin:login_attempts:{ip}"
    attempts = await asyncio.get_event_loop().run_in_executor(
        None, admin_redis.get, attempts_key
    )
    
    if attempts:
        attempt_data = json.loads(attempts)
        if attempt_data["count"] >= 5:
            lock_until = datetime.fromisoformat(attempt_data["locked_until"])
            if datetime.now() < lock_until:
                return False  # Still locked
    
    return True  # Allowed to attempt login

async def record_login_attempt(ip: str, success: bool):
    """Record login attempt"""
    attempts_key = f"admin:login_attempts:{ip}"
    
    if success:
        # Clear failed attempts on successful login
        await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.delete, attempts_key
        )
    else:
        # Increment failed attempts
        current = await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.get, attempts_key
        )
        
        if current:
            attempt_data = json.loads(current)
            attempt_data["count"] += 1
        else:
            attempt_data = {"count": 1, "first_attempt": datetime.now().isoformat()}
        
        # Lock after 5 attempts
        if attempt_data["count"] >= 5:
            attempt_data["locked_until"] = (datetime.now() + timedelta(minutes=30)).isoformat()
        
        await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.setex, attempts_key, 1800, json.dumps(attempt_data)  # 30 min TTL
        )

# Authentication endpoints
@admin_app.post("/admin/login")
async def admin_login(request: AdminLoginRequest, http_request: Request):
    """Admin login endpoint"""
    client_ip = http_request.client.host
    
    # Check if IP is locked
    if not await check_login_attempts(client_ip):
        logger.warning(f"Login attempt from locked IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again later."
        )
    
    # Validate credentials
    if request.username != ADMIN_USERNAME:
        await record_login_attempt(client_ip, False)
        await log_admin_action("unknown", "login_failed", target=request.username, ip=client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_admin_password(request.password, ADMIN_PASSWORD):
        await record_login_attempt(client_ip, False)
        await log_admin_action("unknown", "login_failed", target=request.username, ip=client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Successful login
    await record_login_attempt(client_ip, True)
    
    # Create JWT
    access_token = create_admin_jwt()
    
    # Create refresh token (stored in Redis)
    refresh_token = secrets.token_urlsafe(32)
    refresh_key = f"admin:refresh:{refresh_token}"
    refresh_data = {
        "username": ADMIN_USERNAME,
        "created_at": datetime.now().isoformat(),
        "last_used": datetime.now().isoformat()
    }
    
    await asyncio.get_event_loop().run_in_executor(
        None, admin_redis.setex, refresh_key, ADMIN_JWT_EXPIRY * 2, json.dumps(refresh_data)
    )
    
    # Set httpOnly cookie
    response = JSONResponse(
        content=AdminLoginResponse(
            access_token=access_token,
            expires_in=ADMIN_JWT_EXPIRY
        ).dict()
    )
    
    response.set_cookie(
        key="admin_refresh_token",
        value=refresh_token,
        max_age=ADMIN_JWT_EXPIRY * 2,
        path="/",
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="strict"
    )
    
    await log_admin_action(ADMIN_USERNAME, "login_success", ip=client_ip)
    logger.info(f"Admin login successful from {client_ip}")
    
    return response

@admin_app.post("/admin/refresh")
async def refresh_admin_token(request: Request):
    """Refresh admin token using httpOnly cookie"""
    refresh_token = request.cookies.get("admin_refresh_token")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")
    
    # Validate refresh token
    refresh_key = f"admin:refresh:{refresh_token}"
    refresh_data = await asyncio.get_event_loop().run_in_executor(
        None, admin_redis.get, refresh_key
    )
    
    if not refresh_data:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    try:
        token_data = json.loads(refresh_data)
        
        # Update last used timestamp
        token_data["last_used"] = datetime.now().isoformat()
        await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.setex, refresh_key, ADMIN_JWT_EXPIRY * 2, json.dumps(token_data)
        )
        
        # Create new access token
        access_token = create_admin_jwt()
        
        await log_admin_action(token_data["username"], "token_refresh", ip=request.client.host)
        
        return JSONResponse(content={
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ADMIN_JWT_EXPIRY
        })
        
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(status_code=401, detail="Token refresh failed")

@admin_app.post("/admin/logout")
async def admin_logout(request: Request):
    """Admin logout - invalidate refresh token and blacklist JWT"""
    refresh_token = request.cookies.get("admin_refresh_token")
    
    if refresh_token:
        # Delete refresh token
        refresh_key = f"admin:refresh:{refresh_token}"
        await asyncio.get_event_loop().run_in_executor(
            None, admin_redis.delete, refresh_key
        )
    
    # Get JWT from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = verify_admin_jwt(token)
            jti = payload.get("jti")
            
            if jti:
                # Blacklist token
                blacklist_key = f"admin:blacklist:{jti}"
                await asyncio.get_event_loop().run_in_executor(
                    None, admin_redis.setex, blacklist_key, ADMIN_JWT_EXPIRY, "1"
                )
            
            await log_admin_action(payload["sub"], "logout", ip=request.client.host)
            
        except Exception:
            pass  # Token invalid, but still proceed with logout
    
    # Clear refresh cookie
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key="admin_refresh_token",
        path="/",
        httponly=True,
        secure=False,
        samesite="strict"
    )
    
    return response

# Admin authentication dependency
async def get_current_admin(request: Request) -> Dict[str, Any]:
    """Get current admin from JWT token"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = auth_header[7:]
    
    try:
        payload = verify_admin_jwt(token)
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

# Health check (no auth required)
@admin_app.get("/admin/health")
async def health_check():
    """Admin server health check"""
    try:
        # Check Redis
        admin_redis.ping()
        
        # Check main gateway components
        gateway_status = {
            "redis": "healthy",
            "rate_limiter": "loaded",
            "ml_detector": "loaded",
            "logger": "loaded"
        }
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": gateway_status
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

# Import admin routes
from admin_routes import router as admin_router

# Include admin routes with authentication
admin_app.include_router(
    admin_router,
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)]
)

# Serve static files for React app
admin_app.mount("/", StaticFiles(directory="admin_frontend/build", html=True), name="static")

if __name__ == "__main__":
    logger.info(f"Starting admin server on port {ADMIN_PORT}")
    logger.info("Admin server bound to 127.0.0.1 only - not accessible from external networks")
    
    uvicorn.run(
        "admin_server:admin_app",
        host="127.0.0.1",  # Bind to localhost only
        port=ADMIN_PORT,
        log_level="info",
        access_log=True
    )
