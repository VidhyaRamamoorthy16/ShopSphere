#!/usr/bin/env python3
"""
Adaptive Rate Limiting - Conference Paper Implementation
3-Tier System: Normal (100/min) → Restricted (30/min) → Blocked (0/min)
Dynamic limits based on RiskScore = (0.5 × RequestRate) + (0.3 × ErrorRate) + (0.2 × ThreatHistory)
"""

import time
import asyncio
import logging
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from fastapi import Request, HTTPException
from config import settings
from supabase_logger import log_rate_limit_event

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

class AdaptiveRateLimiter:
    """3-Tier Adaptive Rate Limiting System"""
    
    def __init__(self):
        self.redis: redis.Redis = None
        self.risk_cache = {}  # In-memory cache for risk scores
        self.cache_ttl = 60  # Cache risk scores for 60 seconds
        
        # Paper-defined thresholds
        self.RISK_THRESHOLD_NORMAL = 30    # RS < 30 → Normal tier (100/min)
        self.RISK_THRESHOLD_RESTRICTED = 70  # RS < 70 → Restricted tier (30/min)
        self.RISK_THRESHOLD_BLOCKED = 70    # RS >= 70 → Blocked tier (0/min)
        
        # Tier limits (requests per minute)
        self.TIER_LIMITS = {
            "normal": 100,
            "restricted": 30,
            "blocked": 0
        }
        
        # Background task management
        self.background_task = None
        self.running = False
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "normal_tier_requests": 0,
            "restricted_tier_requests": 0,
            "blocked_requests": 0,
            "risk_recalculations": 0,
            "avg_risk_score": 0.0,
            "last_update": datetime.now()
        }
    
    async def init_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True
            )
            await self.redis.ping()
            logger.info("✅ Redis connected for adaptive rate limiting")
            
            # Start background risk calculation task
            await self.start_background_task()
            
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            raise
    
    async def close_redis(self):
        """Close Redis connection and stop background tasks"""
        self.running = False
        if self.background_task:
            self.background_task.cancel()
            try:
                await self.background_task
            except asyncio.CancelledError:
                pass
        
        if self.redis:
            await self.redis.aclose()
            logger.info("✅ Redis connection closed")
    
    async def calculate_risk_score(self, ip: str) -> float:
        """
        Calculate RiskScore using paper formula:
        RiskScore = (0.5 × RequestRate) + (0.3 × ErrorRate) + (0.2 × ThreatHistory)
        """
        try:
            now = int(time.time())
            window_start = now - 60  # Last 60 seconds
            
            # Step 1: Get RequestRate[IP] = requests in last 60 seconds
            request_key = f"requests:{ip}"
            await self.redis.zremrangebyscore(request_key, 0, window_start)
            request_rate = await self.redis.zcard(request_key)
            
            # Step 2: Get ErrorRate[IP] = 4xx/5xx count in last window
            error_key = f"errors:{ip}"
            error_count = await self.redis.get(error_key)
            error_rate = int(error_count) if error_count else 0
            
            # Step 3: Get ThreatHistory[IP] = prior threat detections
            threat_key = f"threats:{ip}"
            threat_count = await self.redis.get(threat_key)
            threat_history = int(threat_count) if threat_count else 0
            
            # Step 4: Apply paper formula
            risk_score = (0.5 * request_rate) + (0.3 * error_rate) + (0.2 * threat_history)
            
            # Cache the result
            self.risk_cache[ip] = {
                "score": risk_score,
                "timestamp": now,
                "request_rate": request_rate,
                "error_rate": error_rate,
                "threat_history": threat_history
            }
            
            # Update statistics
            self.stats["risk_recalculations"] += 1
            self._update_avg_risk_score(risk_score)
            
            logger.debug(f"🔍 Risk Score for {ip}: {risk_score:.2f} (req:{request_rate}, err:{error_rate}, threat:{threat_history})")
            
            return risk_score
            
        except Exception as e:
            logger.error(f"Risk score calculation error for {ip}: {e}")
            return 0.0  # Default to safe on error
    
    def get_cached_risk_score(self, ip: str) -> Optional[float]:
        """Get cached risk score if still valid"""
        if ip in self.risk_cache:
            cached = self.risk_cache[ip]
            if time.time() - cached["timestamp"] < self.cache_ttl:
                return cached["score"]
        return None
    
    def determine_tier(self, risk_score: float) -> str:
        """Determine tier based on risk score (paper thresholds)"""
        if risk_score < self.RISK_THRESHOLD_NORMAL:
            return "normal"
        elif risk_score < self.RISK_THRESHOLD_RESTRICTED:
            return "restricted"
        else:
            return "blocked"
    
    async def get_dynamic_limit(self, ip: str) -> Tuple[str, int]:
        """Get dynamic limit for IP based on current risk score"""
        # Try cache first
        cached_score = self.get_cached_risk_score(ip)
        if cached_score is not None:
            tier = self.determine_tier(cached_score)
            return tier, self.TIER_LIMITS[tier]
        
        # Calculate fresh risk score
        risk_score = await self.calculate_risk_score(ip)
        tier = self.determine_tier(risk_score)
        
        return tier, self.TIER_LIMITS[tier]
    
    async def check_request_limit(self, request: Request) -> bool:
        """
        Main rate limiting check with 3-tier adaptive system
        Returns True if request is allowed, False if blocked
        """
        ip = request.client.host
        path = request.url.path
        method = request.method
        
        try:
            self.stats["total_requests"] += 1
            
            # Get dynamic limit based on risk score
            tier, limit = await self.get_dynamic_limit(ip)
            
            # Update tier statistics
            if tier == "normal":
                self.stats["normal_tier_requests"] += 1
            elif tier == "restricted":
                self.stats["restricted_tier_requests"] += 1
            else:
                self.stats["blocked_requests"] += 1
            
            # If blocked tier, immediately deny
            if tier == "blocked":
                logger.warning(f"🚫 IP {ip} BLOCKED - Risk score too high")
                await self._log_rate_limit_event(ip, request, "blocked", tier, 0, 0)
                raise HTTPException(
                    status_code=429,
                    detail="Access temporarily blocked due to suspicious activity",
                    headers={
                        "X-RateLimit-Limit": "0",
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time()) + 1800),  # 30 minutes
                        "X-RateLimit-Tier": tier,
                        "X-Risk-Score": str(self.get_cached_risk_score(ip) or 0),
                        "Retry-After": "1800"
                    }
                )
            
            # Check current request count against dynamic limit
            current_count = await self._get_current_requests(ip)
            
            if current_count >= limit:
                logger.warning(f"⚠️ IP {ip} RATE LIMITED - {current_count}/{limit} (tier: {tier})")
                await self._log_rate_limit_event(ip, request, "rate_limited", tier, limit, 0)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Current limit: {limit} requests per minute",
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time()) + 60),
                        "X-RateLimit-Tier": tier,
                        "X-Risk-Score": str(self.get_cached_risk_score(ip) or 0),
                        "Retry-After": "60"
                    }
                )
            
            # Allow request and increment counter
            await self._increment_request_counter(ip)
            remaining = max(0, limit - current_count - 1)
            
            # Log successful request
            await self._log_rate_limit_event(ip, request, "allowed", tier, limit, remaining)
            
            logger.debug(f"✅ IP {ip} ALLOWED - {current_count + 1}/{limit} (tier: {tier})")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting error for {ip}: {e}")
            # Fail-safe: allow request on error
            return True
    
    async def _get_current_requests(self, ip: str) -> int:
        """Get current request count for IP in last minute"""
        try:
            now = int(time.time())
            window_start = now - 60
            request_key = f"requests:{ip}"
            
            # Clean old entries
            await self.redis.zremrangebyscore(request_key, 0, window_start)
            
            # Count current requests
            return await self.redis.zcard(request_key)
            
        except Exception as e:
            logger.error(f"Error getting current requests: {e}")
            return 0
    
    async def _increment_request_counter(self, ip: str):
        """Increment request counter for IP"""
        try:
            now = time.time()
            request_key = f"requests:{ip}"
            
            # Add current request timestamp
            await self.redis.zadd(request_key, {str(now): now})
            await self.redis.expire(request_key, 120)  # 2 minutes expiry
            
        except Exception as e:
            logger.error(f"Error incrementing request counter: {e}")
    
    async def increment_error_counter(self, ip: str):
        """Increment error counter for IP"""
        try:
            error_key = f"errors:{ip}"
            await self.redis.incr(error_key)
            await self.redis.expire(error_key, 3600)  # 1 hour expiry
            
        except Exception as e:
            logger.error(f"Error incrementing error counter: {e}")
    
    async def increment_threat_counter(self, ip: str):
        """Increment threat detection counter for IP"""
        try:
            threat_key = f"threats:{ip}"
            await self.redis.incr(threat_key)
            await self.redis.expire(threat_key, 86400)  # 24 hours expiry
            
        except Exception as e:
            logger.error(f"Error incrementing threat counter: {e}")
    
    async def _log_rate_limit_event(self, ip: str, request: Request, action: str, tier: str, limit: int, remaining: int):
        """Log rate limiting event to Supabase"""
        try:
            await log_rate_limit_event(
                ip=ip,
                endpoint=request.url.path,
                method=request.method,
                action=action,
                requests_made=await self._get_current_requests(ip),
                limit_max=limit,
                remaining=remaining,
                user_agent=request.headers.get("user-agent"),
                threat_score=self.get_cached_risk_score(ip) or 0.0
            )
        except Exception as e:
            logger.error(f"Failed to log rate limit event: {e}")
    
    def _update_avg_risk_score(self, new_score: float):
        """Update average risk score"""
        total = self.stats["risk_recalculations"]
        current_avg = self.stats["avg_risk_score"]
        self.stats["avg_risk_score"] = ((current_avg * (total - 1)) + new_score) / total
    
    async def start_background_task(self):
        """Start background task for continuous risk score recalculation"""
        if self.running:
            return
        
        self.running = True
        self.background_task = asyncio.create_task(self._background_risk_calculation())
        logger.info("🔄 Started background risk calculation task")
    
    async def _background_risk_calculation(self):
        """Background task that recalculates risk scores every 60 seconds"""
        while self.running:
            try:
                logger.debug("🔄 Running background risk score recalculation")
                
                # Get all IPs with recent activity
                ips = await self._get_active_ips()
                
                for ip in ips:
                    try:
                        await self.calculate_risk_score(ip)
                        # Small delay to avoid overwhelming Redis
                        await asyncio.sleep(0.01)
                    except Exception as e:
                        logger.error(f"Error recalculating risk for {ip}: {e}")
                
                logger.info(f"🔄 Recalculated risk scores for {len(ips)} active IPs")
                
                # Wait 60 seconds before next calculation
                for _ in range(60):
                    if not self.running:
                        break
                    await asyncio.sleep(1)
                    
            except asyncio.CancelledError:
                logger.info("Background risk calculation task cancelled")
                break
            except Exception as e:
                logger.error(f"Background risk calculation error: {e}")
                await asyncio.sleep(10)  # Wait before retrying
    
    async def _get_active_ips(self) -> list:
        """Get list of IPs with recent activity"""
        try:
            # Get IPs from request keys
            request_keys = await self.redis.keys("requests:*")
            ips = [key.split(":")[1] for key in request_keys]
            return list(set(ips))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error getting active IPs: {e}")
            return []
    
    async def get_ip_details(self, ip: str) -> Dict:
        """Get detailed information about an IP"""
        try:
            # Get cached risk score
            cached = self.risk_cache.get(ip, {})
            
            # Get current request count
            current_requests = await self._get_current_requests(ip)
            
            # Get error and threat counts
            error_count = await self.redis.get(f"errors:{ip}")
            threat_count = await self.redis.get(f"threats:{ip}")
            
            # Determine current tier
            risk_score = cached.get("score", 0)
            tier = self.determine_tier(risk_score)
            limit = self.TIER_LIMITS[tier]
            
            return {
                "ip": ip,
                "risk_score": risk_score,
                "tier": tier,
                "limit": limit,
                "current_requests": current_requests,
                "remaining": max(0, limit - current_requests),
                "error_count": int(error_count) if error_count else 0,
                "threat_count": int(threat_count) if threat_count else 0,
                "request_rate": cached.get("request_rate", 0),
                "last_updated": cached.get("timestamp", 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting IP details: {e}")
            return {"error": str(e)}
    
    async def get_statistics(self) -> Dict:
        """Get comprehensive rate limiting statistics"""
        try:
            # Get active IP count
            active_ips = await self._get_active_ips()
            
            # Calculate tier distribution
            total = max(self.stats["total_requests"], 1)
            tier_distribution = {
                "normal": self.stats["normal_tier_requests"] / total,
                "restricted": self.stats["restricted_tier_requests"] / total,
                "blocked": self.stats["blocked_requests"] / total
            }
            
            return {
                **self.stats,
                "active_ips": len(active_ips),
                "tier_distribution": tier_distribution,
                "tier_limits": self.TIER_LIMITS,
                "risk_thresholds": {
                    "normal": self.RISK_THRESHOLD_NORMAL,
                    "restricted": self.RISK_THRESHOLD_RESTRICTED,
                    "blocked": self.RISK_THRESHOLD_BLOCKED
                },
                "cache_size": len(self.risk_cache),
                "background_task_running": self.running
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"error": str(e)}

# Global adaptive rate limiter instance
adaptive_limiter = AdaptiveRateLimiter()

# Middleware integration
async def adaptive_rate_limit_middleware(request: Request, call_next):
    """
    FastAPI middleware for adaptive rate limiting
    Usage: app.middleware("http")(adaptive_rate_limit_middleware)
    """
    try:
        # Check rate limit
        await adaptive_limiter.check_request_limit(request)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        ip = request.client.host
        tier, limit = await adaptive_limiter.get_dynamic_limit(ip)
        current_requests = await adaptive_limiter._get_current_requests(ip)
        remaining = max(0, limit - current_requests)
        
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Tier"] = tier
        response.headers["X-Risk-Score"] = str(adaptive_limiter.get_cached_risk_score(ip) or 0)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Adaptive rate limiting middleware error: {e}")
        # Fail-safe: allow request
        return await call_next(request)

# Initialization and cleanup functions
async def init_adaptive_rate_limiter():
    """Initialize adaptive rate limiter"""
    await adaptive_limiter.init_redis()

async def close_adaptive_rate_limiter():
    """Close adaptive rate limiter"""
    await adaptive_limiter.close_redis()

# Helper functions for other components
async def increment_error_counter(ip: str):
    """Increment error counter for IP"""
    await adaptive_limiter.increment_error_counter(ip)

async def increment_threat_counter(ip: str):
    """Increment threat counter for IP"""
    await adaptive_limiter.increment_threat_counter(ip)

async def get_ip_statistics(ip: str) -> Dict:
    """Get statistics for specific IP"""
    return await adaptive_limiter.get_ip_details(ip)

async def get_global_statistics() -> Dict:
    """Get global rate limiting statistics"""
    return await adaptive_limiter.get_statistics()

if __name__ == "__main__":
    # Test the adaptive rate limiter
    async def test_adaptive_limiter():
        await init_adaptive_rate_limiter()
        
        # Mock request for testing
        class MockRequest:
            def __init__(self, ip="127.0.0.1", path="/api/test", method="GET"):
                self.url = type('obj', (object,), {'path': path})()
                self.method = method
                self.client = type('obj', (object,), {'host': ip})()
                self.headers = {"user-agent": "test"}
        
        # Test multiple requests from same IP
        request = MockRequest()
        
        for i in range(10):
            try:
                await adaptive_limiter.check_request_limit(request)
                print(f"Request {i+1}: Allowed")
            except HTTPException as e:
                print(f"Request {i+1}: Blocked - {e.detail}")
                break
            
            await asyncio.sleep(0.1)
        
        # Get statistics
        stats = await adaptive_limiter.get_statistics()
        print(f"Statistics: {stats}")
        
        await close_adaptive_rate_limiter()
    
    asyncio.run(test_adaptive_limiter())
