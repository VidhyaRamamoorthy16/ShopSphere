import asyncio
import time
import logging
from typing import Dict, Optional, Any, Tuple
from datetime import datetime
import redis.asyncio as redis
from fastapi import Request, HTTPException
import json
import hashlib

logger = logging.getLogger("Throttler")

class ThrottleResult:
    def __init__(self, should_delay: bool, delay_seconds: float, 
                 should_block: bool, block_reason: str = ""):
        self.should_delay = should_delay
        self.delay_seconds = delay_seconds
        self.should_block = should_block
        self.block_reason = block_reason

class AdvancedThrottler:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = None
        self.redis_url = redis_url
        
        # Throttling configurations
        self.throttle_configs = {
            # Login failure throttling
            "login_failures": {
                "enable": True,
                "thresholds": {
                    3: {"delay": 2.0, "message": "Multiple failed attempts detected"},
                    4: {"delay": 5.0, "message": "Too many failed attempts"},
                    5: {"delay": 1800.0, "block": True, "message": "Account temporarily locked"}
                },
                "reset_on_success": True
            },
            
            # Search throttling
            "search_warning": {
                "enable": True,
                "warning_thresholds": {
                    0.5: {"delay": 0.5, "message": "Search rate limit warning"},
                    0.7: {"delay": 1.0, "message": "Approaching search limit"},
                    0.9: {"delay": 2.0, "message": "Search limit nearly reached"}
                }
            },
            
            # General warning throttling
            "general_warning": {
                "enable": True,
                "warning_thresholds": {
                    0.7: {"delay": 0.2, "message": "Rate limit warning"},
                    0.85: {"delay": 0.5, "message": "Approaching rate limit"},
                    0.95: {"delay": 1.0, "message": "Rate limit nearly reached"}
                }
            },
            
            # Duplicate order prevention
            "duplicate_order": {
                "enable": True,
                "window": 10,  # 10 seconds
                "delay": 3.0,  # 3 second delay
                "message": "Duplicate order prevention delay"
            }
        }
    
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis_client = await redis.from_url(self.redis_url, decode_responses=True)
    
    async def should_throttle(self, request: Request, rate_limit_result, 
                            endpoint_config: Dict[str, Any]) -> ThrottleResult:
        """Determine if request should be throttled"""
        if not self.redis_client:
            await self.initialize()
        
        path = request.url.path
        method = request.method
        client_ip = self._get_client_ip(request)
        
        # Check login failure throttling
        if "/api/auth/login" in path and method == "POST":
            return await self._check_login_throttling(client_ip, request)
        
        # Check search throttling
        if "search" in path or "q=" in path:
            return await self._check_search_throttling(rate_limit_result)
        
        # Check duplicate order prevention
        if "/api/orders" in path and method == "POST":
            return await self._check_duplicate_order_throttling(request)
        
        # Check general warning throttling
        return await self._check_general_throttling(rate_limit_result)
    
    async def _check_login_throttling(self, client_ip: str, request: Request) -> ThrottleResult:
        """Check login failure throttling"""
        config = self.throttle_configs["login_failures"]
        if not config["enable"]:
            return ThrottleResult(False, 0, False)
        
        # Get failure count
        failure_key = f"login_failures:{client_ip}"
        failure_count = await self.redis_client.get(failure_key)
        failure_count = int(failure_count) if failure_count else 0
        
        # Check thresholds
        thresholds = config["thresholds"]
        for threshold_count, threshold_config in sorted(thresholds.items()):
            if failure_count >= threshold_count:
                if threshold_config.get("block", False):
                    return ThrottleResult(
                        False, 0, True, 
                        threshold_config.get("message", "Account locked")
                    )
                else:
                    return ThrottleResult(
                        True, threshold_config["delay"], False,
                        threshold_config.get("message", "Throttled")
                    )
        
        return ThrottleResult(False, 0, False)
    
    async def _check_search_throttling(self, rate_limit_result) -> ThrottleResult:
        """Check search-specific throttling"""
        config = self.throttle_configs["search_warning"]
        if not config["enable"] or not hasattr(rate_limit_result, 'warning_level'):
            return ThrottleResult(False, 0, False)
        
        warning_level = getattr(rate_limit_result, 'warning_level', 0)
        thresholds = config["warning_thresholds"]
        
        # Find applicable threshold
        applicable_delay = 0
        message = ""
        
        for threshold_level, threshold_config in sorted(thresholds.items()):
            if warning_level >= threshold_level:
                applicable_delay = threshold_config["delay"]
                message = threshold_config.get("message", "Search throttled")
        
        if applicable_delay > 0:
            return ThrottleResult(True, applicable_delay, False, message)
        
        return ThrottleResult(False, 0, False)
    
    async def _check_general_throttling(self, rate_limit_result) -> ThrottleResult:
        """Check general warning throttling"""
        config = self.throttle_configs["general_warning"]
        if not config["enable"] or not hasattr(rate_limit_result, 'warning_level'):
            return ThrottleResult(False, 0, False)
        
        warning_level = getattr(rate_limit_result, 'warning_level', 0)
        thresholds = config["warning_thresholds"]
        
        # Find applicable threshold
        applicable_delay = 0
        message = ""
        
        for threshold_level, threshold_config in sorted(thresholds.items()):
            if warning_level >= threshold_level:
                applicable_delay = threshold_config["delay"]
                message = threshold_config.get("message", "Request throttled")
        
        if applicable_delay > 0:
            return ThrottleResult(True, applicable_delay, False, message)
        
        return ThrottleResult(False, 0, False)
    
    async def _check_duplicate_order_throttling(self, request: Request) -> ThrottleResult:
        """Check duplicate order prevention"""
        config = self.throttle_configs["duplicate_order"]
        if not config["enable"]:
            return ThrottleResult(False, 0, False)
        
        # Extract user info from request
        user_id = await self._extract_user_id(request)
        if not user_id:
            return ThrottleResult(False, 0, False)
        
        # Get request body for cart hash
        try:
            body = await request.body()
            cart_hash = hashlib.md5(body).hexdigest()
        except Exception:
            cart_hash = "unknown"
        
        # Check for recent duplicate
        duplicate_key = f"recent_order:{user_id}"
        recent_cart = await self.redis_client.get(duplicate_key)
        
        if recent_cart == cart_hash:
            # Duplicate detected
            return ThrottleResult(
                True, config["delay"], False, 
                config.get("message", "Duplicate order prevention")
            )
        
        # Store current cart hash
        await self.redis_client.setex(duplicate_key, config["window"], cart_hash)
        
        return ThrottleResult(False, 0, False)
    
    async def _extract_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from JWT token"""
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            token = auth_header[7:]
            # This would need your JWT secret
            import jwt
            payload = jwt.decode(token, "your_jwt_secret", algorithms=["HS256"])
            return payload.get("sub")
        except Exception:
            return None
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host
    
    async def record_failure(self, identifier: str, endpoint: str, failure_type: str = "general"):
        """Record a failure for throttling"""
        if not self.redis_client:
            await self.initialize()
        
        if endpoint == "login":
            failure_key = f"login_failures:{identifier}"
            await self.redis_client.incr(failure_key)
            await self.redis_client.expire(failure_key, 1800)  # 30 minutes
    
    async def clear_failures(self, identifier: str, endpoint: str):
        """Clear failures (e.g., after successful login)"""
        if not self.redis_client:
            await self.initialize()
        
        if endpoint == "login":
            failure_key = f"login_failures:{identifier}"
            await self.redis_client.delete(failure_key)
    
    async def apply_delay(self, delay_seconds: float):
        """Apply throttling delay"""
        if delay_seconds > 0:
            logger.info(f"Applying throttling delay: {delay_seconds}s")
            await asyncio.sleep(delay_seconds)
    
    def get_throttle_headers(self, throttle_result: ThrottleResult) -> Dict[str, str]:
        """Get headers for throttling response"""
        headers = {}
        
        if throttle_result.should_delay:
            headers["X-Throttle-Delay"] = str(throttle_result.delay_seconds)
        
        if throttle_result.should_block:
            headers["X-Throttle-Block"] = "true"
            headers["X-Throttle-Reason"] = throttle_result.block_reason
        
        return headers

# Global throttler instance
throttler = AdvancedThrottler()
