import asyncio
import time
import json
import logging
from typing import Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from enum import Enum
import redis.asyncio as redis
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import hashlib

logger = logging.getLogger("RateLimiter")

class RateLimitStrategy(Enum):
    FIXED_WINDOW = "fixed"
    SLIDING_WINDOW = "sliding"
    TOKEN_BUCKET = "bucket"

class UserTier(Enum):
    GUEST = "guest"
    USER = "user"
    ADMIN = "admin"
    SUSPENDED = "suspended"

class RateLimitResult:
    def __init__(self, allowed: bool, remaining: int, reset_time: int, 
                 strategy: str, limit: int, retry_after: Optional[int] = None,
                 warning_level: float = 0.0):
        self.allowed = allowed
        self.remaining = remaining
        self.reset_time = reset_time
        self.strategy = strategy
        self.limit = limit
        self.retry_after = retry_after
        self.warning_level = warning_level

class AdvancedRateLimiter:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = None
        self.redis_url = redis_url
        self.jwt_secret = "your_jwt_secret_here"  # Get from environment
        
        # Endpoint configurations
        self.endpoint_configs = {
            # Auth endpoints
            "/api/auth/login": {
                "strategy": RateLimitStrategy.FIXED_WINDOW,
                "limits": {
                    UserTier.GUEST: {"requests": 5, "window": 900},  # 5 per 15 min
                    UserTier.USER: {"requests": 10, "window": 900},
                    UserTier.ADMIN: {"requests": 1000, "window": 900},  # Basically unlimited
                    UserTier.SUSPENDED: {"requests": 0, "window": 900}
                },
                "throttle_config": {
                    "enable": True,
                    "failure_thresholds": {
                        3: 2.0,   # 2s delay after 3 failures
                        4: 5.0,   # 5s delay after 4 failures
                        5: 1800.0 # 30 min block after 5 failures
                    }
                }
            },
            "/api/auth/register": {
                "strategy": RateLimitStrategy.FIXED_WINDOW,
                "limits": {
                    UserTier.GUEST: {"requests": 3, "window": 3600},  # 3 per hour
                    UserTier.USER: {"requests": 5, "window": 3600},
                    UserTier.ADMIN: {"requests": 1000, "window": 3600},
                    UserTier.SUSPENDED: {"requests": 0, "window": 3600}
                },
                "throttle_config": {"enable": False}
            },
            
            # Product endpoints
            "/api/products": {
                "strategy": RateLimitStrategy.SLIDING_WINDOW,
                "limits": {
                    UserTier.GUEST: {"requests": 60, "window": 60},   # 60 per minute
                    UserTier.USER: {"requests": 200, "window": 60},  # 200 per minute
                    UserTier.ADMIN: {"requests": 1000, "window": 60},
                    UserTier.SUSPENDED: {"requests": 0, "window": 60}
                },
                "throttle_config": {"enable": False}
            },
            "/api/products/search": {
                "strategy": RateLimitStrategy.SLIDING_WINDOW,
                "limits": {
                    UserTier.GUEST: {"requests": 20, "window": 60},   # 20 per minute
                    UserTier.USER: {"requests": 50, "window": 60},
                    UserTier.ADMIN: {"requests": 1000, "window": 60},
                    UserTier.SUSPENDED: {"requests": 0, "window": 60}
                },
                "throttle_config": {
                    "enable": True,
                    "warning_thresholds": {
                        0.5: 0.5,   # 500ms delay at 50% (10 searches)
                        0.8: 1.0    # 1000ms delay at 80%
                    }
                }
            },
            
            # Cart endpoints
            "/api/cart": {
                "strategy": RateLimitStrategy.TOKEN_BUCKET,
                "limits": {
                    UserTier.GUEST: {"requests": 10, "window": 60, "burst": 5, "refill_rate": 10/60},
                    UserTier.USER: {"requests": 30, "window": 60, "burst": 10, "refill_rate": 30/60},
                    UserTier.ADMIN: {"requests": 1000, "window": 60, "burst": 100, "refill_rate": 1000/60},
                    UserTier.SUSPENDED: {"requests": 0, "window": 60, "burst": 0, "refill_rate": 0}
                },
                "throttle_config": {"enable": False}
            },
            
            # Order endpoints
            "/api/orders": {
                "strategy": RateLimitStrategy.SLIDING_WINDOW,
                "limits": {
                    UserTier.GUEST: {"requests": 2, "window": 60},    # 2 per minute for guests
                    UserTier.USER: {"requests": 5, "window": 60},    # 5 per minute for users
                    UserTier.ADMIN: {"requests": 1000, "window": 60},
                    UserTier.SUSPENDED: {"requests": 0, "window": 60}
                },
                "throttle_config": {
                    "enable": True,
                    "duplicate_prevention": {
                        "window": 10,  # 10 seconds
                        "delay": 3.0   # 3 second delay
                    }
                }
            },
            
            # Default for other endpoints
            "default": {
                "strategy": RateLimitStrategy.SLIDING_WINDOW,
                "limits": {
                    UserTier.GUEST: {"requests": 30, "window": 60},
                    UserTier.USER: {"requests": 100, "window": 60},
                    UserTier.ADMIN: {"requests": 1000, "window": 60},
                    UserTier.SUSPENDED: {"requests": 0, "window": 60}
                },
                "throttle_config": {"enable": False}
            }
        }
    
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis_client = await redis.from_url(self.redis_url, decode_responses=True)
    
    def extract_user_tier(self, request: Request) -> Tuple[UserTier, Optional[str]]:
        """Extract user tier from JWT token"""
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return UserTier.GUEST, None
            
            token = auth_header[7:]
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            
            role = payload.get("role", "user")
            user_id = payload.get("sub")
            
            if role == "admin":
                return UserTier.ADMIN, user_id
            elif role == "suspended":
                return UserTier.SUSPENDED, user_id
            else:
                return UserTier.USER, user_id
                
        except jwt.ExpiredSignatureError:
            return UserTier.GUEST, None
        except jwt.InvalidTokenError:
            return UserTier.GUEST, None
        except Exception as e:
            logger.error(f"Error extracting user tier: {e}")
            return UserTier.GUEST, None
    
    def get_endpoint_config(self, path: str, method: str) -> Dict[str, Any]:
        """Get configuration for specific endpoint"""
        # Normalize path for dynamic routes
        if path.startswith("/api/products/") and method == "GET":
            if "q=" in path or "search" in path:
                return self.endpoint_configs["/api/products/search"]
            else:
                return self.endpoint_configs["/api/products"]
        elif path.startswith("/api/cart") and method in ["POST", "PUT", "DELETE"]:
            return self.endpoint_configs["/api/cart"]
        elif path.startswith("/api/orders") and method == "POST":
            return self.endpoint_configs["/api/orders"]
        elif path.startswith("/api/auth/login") and method == "POST":
            return self.endpoint_configs["/api/auth/login"]
        elif path.startswith("/api/auth/register") and method == "POST":
            return self.endpoint_configs["/api/auth/register"]
        else:
            return self.endpoint_configs["default"]
    
    async def check_rate_limit(self, request: Request) -> RateLimitResult:
        """Main rate limiting check"""
        if not self.redis_client:
            await self.initialize()
        
        path = request.url.path
        method = request.method
        client_ip = self.get_client_ip(request)
        user_tier, user_id = self.extract_user_tier(request)
        
        # Get endpoint configuration
        config = self.get_endpoint_config(path, method)
        strategy = config["strategy"]
        limits = config["limits"][user_tier]
        throttle_config = config.get("throttle_config", {})
        
        # Suspended users are always blocked
        if user_tier == UserTier.SUSPENDED:
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=int(time.time()) + 3600,
                strategy=strategy.value,
                limit=0,
                retry_after=3600
            )
        
        # Admin users bypass rate limiting
        if user_tier == UserTier.ADMIN:
            return RateLimitResult(
                allowed=True,
                remaining=999999,
                reset_time=int(time.time()) + 3600,
                strategy=strategy.value,
                limit=999999
            )
        
        # Apply the appropriate strategy
        if strategy == RateLimitStrategy.FIXED_WINDOW:
            return await self._fixed_window_check(client_ip, path, method, limits, user_tier)
        elif strategy == RateLimitStrategy.SLIDING_WINDOW:
            return await self._sliding_window_check(client_ip, path, method, limits, user_tier)
        elif strategy == RateLimitStrategy.TOKEN_BUCKET:
            return await self._token_bucket_check(user_id or client_ip, path, method, limits, user_tier)
        else:
            # Default to sliding window
            return await self._sliding_window_check(client_ip, path, method, limits, user_tier)
    
    async def _fixed_window_check(self, identifier: str, path: str, method: str, 
                                 limits: Dict[str, int], user_tier: UserTier) -> RateLimitResult:
        """Fixed window rate limiting"""
        window = limits["window"]
        max_requests = limits["requests"]
        
        # Create window key
        current_time = int(time.time())
        window_start = (current_time // window) * window
        key = f"fixed:{path}:{identifier}:{window_start}"
        
        # Get current count
        count = await self.redis_client.get(key)
        count = int(count) if count else 0
        
        if count >= max_requests:
            # Rate limited
            reset_time = window_start + window
            retry_after = reset_time - current_time
            
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=reset_time,
                strategy="fixed",
                limit=max_requests,
                retry_after=retry_after
            )
        else:
            # Increment counter
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            await pipe.execute()
            
            return RateLimitResult(
                allowed=True,
                remaining=max_requests - count - 1,
                reset_time=window_start + window,
                strategy="fixed",
                limit=max_requests
            )
    
    async def _sliding_window_check(self, identifier: str, path: str, method: str,
                                   limits: Dict[str, int], user_tier: UserTier) -> RateLimitResult:
        """Sliding window rate limiting using Redis sorted sets"""
        window = limits["window"]
        max_requests = limits["requests"]
        
        key = f"sliding:{path}:{identifier}"
        current_time = time.time()
        window_start = current_time - window
        
        # Remove old entries outside the window
        await self.redis_client.zremrangebyscore(key, 0, window_start)
        
        # Count current requests in window
        count = await self.redis_client.zcard(key)
        
        if count >= max_requests:
            # Rate limited
            oldest_request = await self.redis_client.zrange(key, 0, 0, withscores=True)
            reset_time = int(oldest_request[0][1]) + window if oldest_request else int(current_time + window)
            retry_after = max(1, reset_time - int(current_time))
            
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=reset_time,
                strategy="sliding",
                limit=max_requests,
                retry_after=retry_after
            )
        else:
            # Add current request
            await self.redis_client.zadd(key, {str(current_time): current_time})
            await self.redis_client.expire(key, window + 1)  # +1 second buffer
            
            # Calculate warning level
            warning_level = count / max_requests
            
            return RateLimitResult(
                allowed=True,
                remaining=max_requests - count - 1,
                reset_time=int(current_time + window),
                strategy="sliding",
                limit=max_requests,
                warning_level=warning_level
            )
    
    async def _token_bucket_check(self, identifier: str, path: str, method: str,
                                 limits: Dict[str, Any], user_tier: UserTier) -> RateLimitResult:
        """Token bucket rate limiting"""
        max_tokens = limits["requests"]
        refill_rate = limits["refill_rate"]
        burst_capacity = limits.get("burst", max_tokens)
        
        key = f"bucket:{path}:{identifier}"
        current_time = time.time()
        
        # Get current bucket state
        bucket_data = await self.redis_client.hgetall(key)
        
        if not bucket_data:
            # Initialize bucket
            tokens = min(max_tokens, burst_capacity)
            last_refill = current_time
        else:
            tokens = float(bucket_data.get("tokens", 0))
            last_refill = float(bucket_data.get("last_refill", current_time))
            
            # Refill tokens based on time elapsed
            time_elapsed = current_time - last_refill
            tokens_to_add = time_elapsed * refill_rate
            tokens = min(max_tokens, tokens + tokens_to_add)
        
        if tokens >= 1:
            # Allow request
            new_tokens = tokens - 1
            pipe = self.redis_client.pipeline()
            pipe.hset(key, mapping={
                "tokens": new_tokens,
                "last_refill": current_time
            })
            pipe.expire(key, 3600)  # 1 hour expiry
            await pipe.execute()
            
            return RateLimitResult(
                allowed=True,
                remaining=int(new_tokens),
                reset_time=int(current_time + (max_tokens - new_tokens) / refill_rate),
                strategy="bucket",
                limit=max_tokens
            )
        else:
            # Rate limited
            reset_time = current_time + (1 - tokens) / refill_rate
            retry_after = int(reset_time - current_time)
            
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=int(reset_time),
                strategy="bucket",
                limit=max_requests,
                retry_after=retry_after
            )
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host
    
    async def track_failure(self, identifier: str, endpoint: str, failure_type: str = "general"):
        """Track failures for throttling"""
        key = f"failures:{endpoint}:{identifier}"
        
        # Increment failure count
        failure_count = await self.redis_client.incr(key)
        
        # Set expiry based on endpoint
        if "login" in endpoint:
            await self.redis_client.expire(key, 1800)  # 30 minutes for login failures
        else:
            await self.redis_client.expire(key, 3600)  # 1 hour for others
        
        return failure_count
    
    async def get_failure_count(self, identifier: str, endpoint: str) -> int:
        """Get current failure count"""
        key = f"failures:{endpoint}:{identifier}"
        count = await self.redis_client.get(key)
        return int(count) if count else 0
    
    async def clear_failures(self, identifier: str, endpoint: str):
        """Clear failure count (e.g., after successful login)"""
        key = f"failures:{endpoint}:{identifier}"
        await self.redis_client.delete(key)
    
    async def check_duplicate_order(self, user_id: str, cart_hash: str) -> bool:
        """Check for duplicate order submission"""
        key = f"duplicate_order:{user_id}"
        
        # Check if this cart hash was submitted recently
        existing = await self.redis_client.get(key)
        if existing and existing == cart_hash:
            return True
        
        # Store current cart hash
        await self.redis_client.setex(key, 10, cart_hash)  # 10 second window
        return False

# Global rate limiter instance
rate_limiter = AdvancedRateLimiter()
