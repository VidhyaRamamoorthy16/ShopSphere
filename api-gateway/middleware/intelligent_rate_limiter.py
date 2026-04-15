import redis
import json
import time
import asyncio
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from fastapi import HTTPException, Request
import ipaddress

logger = logging.getLogger("IntelligentRateLimiter")

class RateLimitTier(Enum):
    UNAUTHENTICATED = "unauthenticated"
    AUTHENTICATED = "authenticated"
    ADMIN = "admin"
    SUSPICIOUS = "suspicious"

class RateLimitStrategy(Enum):
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    ADAPTIVE = "adaptive"

@dataclass
class RateLimitConfig:
    requests_per_window: int
    window_seconds: int
    burst_capacity: int = 0
    refill_rate: float = 1.0

@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_time: int
    retry_after: Optional[int] = None
    tier: RateLimitTier = RateLimitTier.UNAUTHENTICATED
    strategy: RateLimitStrategy = RateLimitStrategy.FIXED_WINDOW

class IntelligentRateLimiter:
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        prefix: str = "rate_limit",
        default_window: int = 60
    ):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.prefix = prefix
        self.default_window = default_window
        
        # Tier configurations
        self.tier_configs = {
            RateLimitTier.UNAUTHENTICATED: RateLimitConfig(
                requests_per_window=20,
                window_seconds=60,
                burst_capacity=5,
                refill_rate=1.0
            ),
            RateLimitTier.AUTHENTICATED: RateLimitConfig(
                requests_per_window=100,
                window_seconds=60,
                burst_capacity=20,
                refill_rate=2.0
            ),
            RateLimitTier.ADMIN: RateLimitConfig(
                requests_per_window=500,
                window_seconds=60,
                burst_capacity=50,
                refill_rate=5.0
            ),
            RateLimitTier.SUSPICIOUS: RateLimitConfig(
                requests_per_window=5,
                window_seconds=60,
                burst_capacity=1,
                refill_rate=0.5
            )
        }
        
        # Adaptive rate limiting
        self.adaptive_multipliers = {}
        self.attack_detection_threshold = 10  # requests in 30 seconds
        
        # Performance metrics
        self.metrics = {
            'total_requests': 0,
            'blocked_requests': 0,
            'tier_downgrades': 0,
            'adaptive_adjustments': 0
        }

    async def is_allowed(
        self,
        identifier: str,
        tier: RateLimitTier = RateLimitTier.UNAUTHENTICATED,
        strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW,
        request_context: Optional[Dict[str, Any]] = None
    ) -> RateLimitResult:
        """
        Check if request is allowed using intelligent rate limiting
        
        Args:
            identifier: Unique identifier (IP, user ID, etc.)
            tier: Rate limit tier for the identifier
            strategy: Rate limiting strategy to use
            request_context: Additional context for adaptive limiting
            
        Returns:
            RateLimitResult with detailed information
        """
        start_time = time.time()
        self.metrics['total_requests'] += 1
        
        try:
            # Check if identifier is in suspicious mode
            actual_tier = await self._get_actual_tier(identifier, tier)
            config = self.tier_configs[actual_tier]
            
            # Apply adaptive multiplier if needed
            multiplier = await self._get_adaptive_multiplier(identifier)
            adjusted_config = self._apply_adaptive_multiplier(config, multiplier)
            
            # Execute rate limiting strategy
            if strategy == RateLimitStrategy.FIXED_WINDOW:
                result = await self._fixed_window_limit(identifier, adjusted_config)
            elif strategy == RateLimitStrategy.SLIDING_WINDOW:
                result = await self._sliding_window_limit(identifier, adjusted_config)
            elif strategy == RateLimitStrategy.TOKEN_BUCKET:
                result = await self._token_bucket_limit(identifier, adjusted_config)
            elif strategy == RateLimitStrategy.ADAPTIVE:
                result = await self._adaptive_limit(identifier, adjusted_config, request_context)
            else:
                result = await self._sliding_window_limit(identifier, adjusted_config)
            
            # Update result with tier information
            result.tier = actual_tier
            result.strategy = strategy
            
            # Log rate limit events
            if not result.allowed:
                self.metrics['blocked_requests'] += 1
                logger.warning(f"Rate limit exceeded for {identifier} (tier: {actual_tier.value})")
                
                # Auto-downgrade tier if suspicious activity
                if actual_tier != RateLimitTier.SUSPICIOUS:
                    await self._downgrade_tier(identifier)
            
            # Update performance metrics
            processing_time = time.time() - start_time
            logger.debug(f"Rate limit check completed in {processing_time:.3f}s for {identifier}")
            
            return result
            
        except Exception as e:
            logger.error(f"Rate limiting error for {identifier}: {e}")
            # Fail open - allow request if rate limiter fails
            return RateLimitResult(
                allowed=True,
                limit=self.tier_configs[tier].requests_per_window,
                remaining=self.tier_configs[tier].requests_per_window - 1,
                reset_time=int(time.time() + self.default_window),
                tier=tier,
                strategy=strategy
            )

    async def _get_actual_tier(self, identifier: str, default_tier: RateLimitTier) -> RateLimitTier:
        """Get actual tier, considering suspicious mode"""
        suspicious_key = f"{self.prefix}:suspicious:{identifier}"
        if await self.redis_client.exists(suspicious_key):
            return RateLimitTier.SUSPICIOUS
        return default_tier

    async def _downgrade_tier(self, identifier: str, duration: int = 3600):
        """Downgrade identifier to suspicious tier"""
        suspicious_key = f"{self.prefix}:suspicious:{identifier}"
        await self.redis_client.setex(suspicious_key, duration, "1")
        self.metrics['tier_downgrades'] += 1
        logger.warning(f"Downgraded {identifier} to suspicious tier for {duration}s")

    async def _get_adaptive_multiplier(self, identifier: str) -> float:
        """Get adaptive rate limiting multiplier"""
        multiplier_key = f"{self.prefix}:multiplier:{identifier}"
        multiplier = await self.redis_client.get(multiplier_key)
        return float(multiplier) if multiplier else 1.0

    async def _set_adaptive_multiplier(self, identifier: str, multiplier: float, ttl: int = 300):
        """Set adaptive multiplier for identifier"""
        multiplier_key = f"{self.prefix}:multiplier:{identifier}"
        await self.redis_client.setex(multiplier_key, ttl, str(multiplier))
        self.metrics['adaptive_adjustments'] += 1

    def _apply_adaptive_multiplier(self, config: RateLimitConfig, multiplier: float) -> RateLimitConfig:
        """Apply adaptive multiplier to rate limit config"""
        return RateLimitConfig(
            requests_per_window=max(1, int(config.requests_per_window * multiplier)),
            window_seconds=config.window_seconds,
            burst_capacity=max(1, int(config.burst_capacity * multiplier)),
            refill_rate=config.refill_rate * multiplier
        )

    async def _fixed_window_limit(self, identifier: str, config: RateLimitConfig) -> RateLimitResult:
        """Fixed window rate limiting"""
        window_key = f"{self.prefix}:fixed:{identifier}"
        current_time = int(time.time())
        window_start = current_time - (current_time % config.window_seconds)
        
        # Use Redis pipeline for atomic operations
        pipe = self.redis_client.pipeline()
        
        # Remove old window data
        pipe.zremrangebyscore(window_key, 0, window_start - 1)
        
        # Get current count
        pipe.zcard(window_key)
        
        # Add current request
        pipe.zadd(window_key, {str(current_time): current_time})
        
        # Set expiration
        pipe.expire(window_key, config.window_seconds + 60)
        
        results = pipe.execute()
        current_count = results[1]
        
        is_allowed = current_count < config.requests_per_window
        remaining = max(0, config.requests_per_window - current_count - 1)
        reset_time = window_start + config.window_seconds
        
        return RateLimitResult(
            allowed=is_allowed,
            limit=config.requests_per_window,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=None if is_allowed else reset_time - current_time
        )

    async def _sliding_window_limit(self, identifier: str, config: RateLimitConfig) -> RateLimitResult:
        """Sliding window rate limiting"""
        window_key = f"{self.prefix}:sliding:{identifier}"
        current_time = time.time()
        window_start = current_time - config.window_seconds
        
        # Use Redis pipeline for atomic operations
        pipe = self.redis_client.pipeline()
        
        # Remove old requests outside the window
        pipe.zremrangebyscore(window_key, 0, window_start)
        
        # Get current count
        pipe.zcard(window_key)
        
        # Add current request
        pipe.zadd(window_key, {str(current_time): current_time})
        
        # Set expiration
        pipe.expire(window_key, config.window_seconds + 60)
        
        results = pipe.execute()
        current_count = results[1]
        
        is_allowed = current_count < config.requests_per_window
        remaining = max(0, config.requests_per_window - current_count - 1)
        reset_time = int(current_time + config.window_seconds)
        
        return RateLimitResult(
            allowed=is_allowed,
            limit=config.requests_per_window,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=None if is_allowed else int(window_start + config.window_seconds - current_time)
        )

    async def _token_bucket_limit(self, identifier: str, config: RateLimitConfig) -> RateLimitResult:
        """Token bucket rate limiting"""
        bucket_key = f"{self.prefix}:bucket:{identifier}"
        current_time = time.time()
        
        # Get current bucket state
        pipe = self.redis_client.pipeline()
        pipe.hmget(bucket_key, 'tokens', 'last_refill')
        pipe.ttl(bucket_key)
        
        results = pipe.execute()
        tokens = float(results[0][0] or config.burst_capacity)
        last_refill = float(results[0][1] or current_time)
        ttl = results[1]
        
        # Refill tokens based on time passed
        time_passed = current_time - last_refill
        tokens_to_add = time_passed * config.refill_rate
        tokens = min(config.burst_capacity, tokens + tokens_to_add)
        
        # Check if request can be processed
        if tokens >= 1:
            tokens -= 1
            is_allowed = True
        else:
            is_allowed = False
        
        # Update bucket state
        pipe = self.redis_client.pipeline()
        pipe.hset(bucket_key, {
            'tokens': tokens,
            'last_refill': current_time
        })
        
        # Set expiration if not exists
        if ttl == -1:
            pipe.expire(bucket_key, config.window_seconds * 2)
        
        pipe.execute()
        
        remaining = int(tokens)
        reset_time = int(current_time + (1 - tokens) / config.refill_rate) if not is_allowed else int(current_time)
        
        return RateLimitResult(
            allowed=is_allowed,
            limit=config.requests_per_window,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=None if is_allowed else int((1 - tokens) / config.refill_rate)
        )

    async def _adaptive_limit(self, identifier: str, config: RateLimitConfig, context: Optional[Dict[str, Any]]) -> RateLimitResult:
        """Adaptive rate limiting based on request patterns"""
        # Check for attack patterns
        if context:
            attack_detected = await self._detect_attack_pattern(identifier, context)
            if attack_detected:
                # Reduce rate limit by 50%
                multiplier = 0.5
                await self._set_adaptive_multiplier(identifier, multiplier, ttl=300)
                config = self._apply_adaptive_multiplier(config, multiplier)
        
        # Use sliding window as base strategy
        return await self._sliding_window_limit(identifier, config)

    async def _detect_attack_pattern(self, identifier: str, context: Dict[str, Any]) -> bool:
        """Detect attack patterns in request context"""
        recent_key = f"{self.prefix}:recent:{identifier}"
        current_time = time.time()
        
        # Add current request to recent requests
        pipe = self.redis_client.pipeline()
        pipe.zadd(recent_key, {str(current_time): current_time})
        pipe.zremrangebyscore(recent_key, 0, current_time - 30)  # Last 30 seconds
        pipe.zcard(recent_key)
        pipe.expire(recent_key, 60)
        
        results = pipe.execute()
        recent_count = results[2]
        
        return recent_count >= self.attack_detection_threshold

    async def get_usage_stats(self, identifier: str) -> Dict[str, Any]:
        """Get comprehensive usage statistics for identifier"""
        stats = {}
        
        # Check each strategy
        for strategy in [RateLimitStrategy.FIXED_WINDOW, RateLimitStrategy.SLIDING_WINDOW, RateLimitStrategy.TOKEN_BUCKET]:
            strategy_key = f"{self.prefix}:{strategy.value}:{identifier}"
            count = await self.redis_client.zcard(strategy_key)
            stats[f"{strategy.value}_count"] = count
        
        # Get current tier
        actual_tier = await self._get_actual_tier(identifier, RateLimitTier.UNAUTHENTICATED)
        stats['current_tier'] = actual_tier.value
        
        # Get adaptive multiplier
        multiplier = await self._get_adaptive_multiplier(identifier)
        stats['adaptive_multiplier'] = multiplier
        
        return stats

    async def reset_identifier(self, identifier: str):
        """Reset all rate limiting data for identifier"""
        patterns = [
            f"{self.prefix}:fixed:{identifier}",
            f"{self.prefix}:sliding:{identifier}",
            f"{self.prefix}:bucket:{identifier}",
            f"{self.prefix}:recent:{identifier}",
            f"{self.prefix}:multiplier:{identifier}",
            f"{self.prefix}:suspicious:{identifier}"
        ]
        
        pipe = self.redis_client.pipeline()
        for pattern in patterns:
            pipe.delete(pattern)
        pipe.execute()
        
        logger.info(f"Reset rate limiting data for {identifier}")

    async def cleanup_expired_keys(self) -> int:
        """Cleanup expired keys (maintenance task)"""
        pattern = f"{self.prefix}:*"
        keys = self.redis_client.keys(pattern)
        
        deleted_count = 0
        for key in keys:
            ttl = self.redis_client.ttl(key)
            if ttl == -1:  # No expiration set
                # Check if key is very old
                if 'sliding' in key or 'fixed' in key:
                    oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                    if oldest and time.time() - oldest[0][1] > 3600:  # 1 hour old
                        self.redis_client.delete(key)
                        deleted_count += 1
        
        logger.info(f"Cleaned up {deleted_count} expired rate limit keys")
        return deleted_count

    def get_metrics(self) -> Dict[str, Any]:
        """Get rate limiting metrics"""
        return self.metrics.copy()

# Global rate limiter instance
rate_limiter = IntelligentRateLimiter()

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
