import redis
import json
import time
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
import logging

logger = logging.getLogger("RateLimiter")

class RedisRateLimiter:
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        default_limits: Dict[str, int] = None,
        prefix: str = "rate_limit"
    ):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.prefix = prefix
        
        # Default limits: requests per minute
        self.default_limits = default_limits or {
            "default": 60,        # 60 requests per minute
            "auth": 10,           # 10 auth requests per minute
            "admin": 100,         # 100 requests per minute for admins
            "upload": 5,          # 5 upload requests per minute
        }
        
        # Sliding window configuration
        self.window_size = 60  # 60 seconds
        
    async def is_allowed(
        self,
        key: str,
        limit: Optional[int] = None,
        window: Optional[int] = None,
        identifier: str = "default"
    ) -> Dict[str, Any]:
        """
        Check if request is allowed using sliding window algorithm
        
        Args:
            key: Unique identifier (IP, user ID, etc.)
            limit: Request limit for the window
            window: Window size in seconds
            identifier: Limit type identifier
            
        Returns:
            Dict with allowance status and metadata
        """
        if limit is None:
            limit = self.default_limits.get(identifier, self.default_limits["default"])
        
        if window is None:
            window = self.window_size
            
        current_time = time.time()
        window_start = current_time - window
        
        # Redis keys
        redis_key = f"{self.prefix}:{identifier}:{key}"
        timestamp_key = f"{redis_key}:timestamps"
        count_key = f"{redis_key}:count"
        
        try:
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove old timestamps outside the window
            pipe.zremrangebyscore(timestamp_key, 0, window_start)
            
            # Get current count
            pipe.zcard(timestamp_key)
            
            # Add current timestamp
            pipe.zadd(timestamp_key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(timestamp_key, window + 60)  # Extra 60s buffer
            
            # Execute pipeline
            results = pipe.execute()
            current_count = results[1]
            
            # Check if limit exceeded
            is_allowed = current_count <= limit
            
            # Calculate remaining requests and reset time
            remaining = max(0, limit - current_count)
            reset_time = int(current_time + window)
            
            # Update count key for quick access
            if is_allowed:
                pipe = self.redis_client.pipeline()
                pipe.incr(count_key)
                pipe.expire(count_key, window + 60)
                pipe.execute()
            
            return {
                "allowed": is_allowed,
                "limit": limit,
                "remaining": remaining,
                "reset_time": reset_time,
                "current_count": current_count,
                "window": window
            }
            
        except redis.RedisError as e:
            logger.error(f"Redis error in rate limiter: {e}")
            # Fail open - allow request if Redis is down
            return {
                "allowed": True,
                "limit": limit,
                "remaining": limit - 1,
                "reset_time": int(current_time + window),
                "current_count": 1,
                "window": window,
                "error": "Redis unavailable"
            }
    
    async def get_usage_stats(
        self,
        key: str,
        identifier: str = "default"
    ) -> Dict[str, Any]:
        """Get current usage statistics for a key"""
        redis_key = f"{self.prefix}:{identifier}:{key}"
        timestamp_key = f"{redis_key}:timestamps"
        
        try:
            current_time = time.time()
            window_start = current_time - self.window_size
            
            # Get count in current window
            count = self.redis_client.zcount(timestamp_key, window_start, current_time)
            
            # Get total count (all time)
            total_count = self.redis_client.get(f"{redis_key}:count") or 0
            
            # Get oldest timestamp
            oldest = self.redis_client.zrange(timestamp_key, 0, 0, withscores=True)
            
            return {
                "current_window_count": count,
                "total_count": int(total_count),
                "oldest_request": oldest[0][1] if oldest else None,
                "window_size": self.window_size
            }
            
        except redis.RedisError as e:
            logger.error(f"Error getting usage stats: {e}")
            return {"error": "Redis unavailable"}
    
    async def reset_key(self, key: str, identifier: str = "default"):
        """Reset rate limit for a specific key"""
        redis_key = f"{self.prefix}:{identifier}:{key}"
        
        try:
            pipe = self.redis_client.pipeline()
            pipe.delete(f"{redis_key}:timestamps")
            pipe.delete(f"{redis_key}:count")
            pipe.execute()
            return True
        except redis.RedisError as e:
            logger.error(f"Error resetting key: {e}")
            return False
    
    async def cleanup_expired_keys(self):
        """Cleanup expired keys (maintenance task)"""
        try:
            pattern = f"{self.prefix}:*"
            keys = self.redis_client.keys(pattern)
            
            deleted_count = 0
            for key in keys:
                ttl = self.redis_client.ttl(key)
                if ttl == -1:  # No expiration set
                    # Check if timestamps are all old
                    oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                    if oldest and time.time() - oldest[0][1] > self.window_size * 2:
                        self.redis_client.delete(key)
                        deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} expired rate limit keys")
            return deleted_count
            
        except redis.RedisError as e:
            logger.error(f"Error during cleanup: {e}")
            return 0

# Rate limiting middleware for FastAPI
class RateLimitMiddleware:
    def __init__(self, rate_limiter: RedisRateLimiter):
        self.rate_limiter = rate_limiter
        
        # Route-specific limits
        self.route_limits = {
            "/auth/login": {"limit": 5, "identifier": "auth"},
            "/auth/register": {"limit": 3, "identifier": "auth"},
            "/auth/refresh": {"limit": 10, "identifier": "auth"},
            "/products": {"limit": 100, "identifier": "default"},
            "/cart": {"limit": 30, "identifier": "default"},
            "/orders": {"limit": 20, "identifier": "default"},
        }
    
    async def check_rate_limit(
        self,
        request: Request,
        identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check rate limit for a request"""
        
        # Get client identifier (IP address or user ID)
        client_ip = request.client.host
        user_id = getattr(request.state, 'user_id', None)
        
        # Use user ID if available, otherwise IP
        key = user_id if user_id else client_ip
        
        # Get route-specific limits
        path = request.url.path
        route_config = self.route_limits.get(path, {})
        
        limit = route_config.get("limit")
        limit_identifier = route_config.get("identifier", "default")
        
        # Check rate limit
        result = await self.rate_limiter.is_allowed(
            key=key,
            limit=limit,
            identifier=limit_identifier
        )
        
        # Log rate limit events
        if not result["allowed"]:
            logger.warning(
                f"Rate limit exceeded for {key} on {path}. "
                f"Count: {result['current_count']}/{result['limit']}"
            )
        
        return result

# Global rate limiter instance
rate_limiter = RedisRateLimiter()
rate_limit_middleware = RateLimitMiddleware(rate_limiter)

# Background task for cleanup
async def cleanup_task():
    """Background task to cleanup expired keys"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            await rate_limiter.cleanup_expired_keys()
        except Exception as e:
            logger.error(f"Cleanup task error: {e}")
            await asyncio.sleep(300)  # Retry after 5 minutes
