import time
import redis.asyncio as redis
from fastapi import Request, HTTPException
from config import settings
import logging
from datetime import datetime
from supabase_logger import log_rate_limit_event 
logger = logging.getLogger(__name__)

# ── Redis Client ───────────────────────────────────────────────────────────────
r: redis.Redis = None

async def init_redis():
    global r
    r = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True
    )
    try:
        await r.ping()
        logger.info("Redis connected successfully.")
    except Exception as e:
        logger.error(f"Redis connection failed: {str(e)}")

async def close_redis():
    global r
    if r:
        await r.aclose()
        logger.info("Redis connection closed.")


# ── IP Blocklist ───────────────────────────────────────────────────────────────
async def block_ip(ip: str, reason: str = "auto-blocked"):
    """Permanently block an IP in Redis."""
    try:
        await r.sadd("blocked_ips", ip)
        await r.hset(f"block_info:{ip}", mapping={
            "reason": reason,
            "blocked_at": datetime.utcnow().isoformat(),
            "ip": ip
        })
        logger.critical(f"IP {ip} PERMANENTLY BLOCKED. Reason: {reason}")
    except Exception as e:
        logger.error(f"Failed to block IP {ip}: {str(e)}")

async def unblock_ip(ip: str):
    """Remove an IP from the permanent blocklist."""
    try:
        await r.srem("blocked_ips", ip)
        await r.delete(f"block_info:{ip}")
        logger.info(f"IP {ip} has been unblocked.")
    except Exception as e:
        logger.error(f"Failed to unblock IP {ip}: {str(e)}")

async def is_ip_blocked(ip: str) -> bool:
    """Check if an IP is in the permanent blocklist."""
    try:
        return await r.sismember("blocked_ips", ip)
    except:
        return False

async def get_all_blocked_ips() -> list:
    """Return all permanently blocked IPs."""
    try:
        return list(await r.smembers("blocked_ips"))
    except:
        return []


# ── Temporary Ban ──────────────────────────────────────────────────────────────
async def temp_ban_ip(ip: str, duration_seconds: int, reason: str = "temp-ban"):
    """Temporarily ban an IP for a set duration."""
    try:
        ban_key = f"temp_ban:{ip}"
        await r.setex(ban_key, duration_seconds, reason)
        logger.warning(f"IP {ip} TEMP BANNED for {duration_seconds}s. Reason: {reason}")
    except Exception as e:
        logger.error(f"Failed to temp ban IP {ip}: {str(e)}")

async def is_ip_temp_banned(ip: str) -> tuple[bool, int]:
    """Returns (is_banned, seconds_remaining)."""
    try:
        ban_key = f"temp_ban:{ip}"
        ttl = await r.ttl(ban_key)
        if ttl > 0:
            return True, ttl
        return False, 0
    except:
        return False, 0


# ── Fixed Window Rate Limiter ──────────────────────────────────────────────────
async def fixed_window(
    ip: str,
    endpoint: str,
    limit: int,
    window: int
) -> dict:
    """
    Hard cap: N requests per window seconds.
    Used for: login, register, orders, admin.
    """
    key = f"fixed:{endpoint}:{ip}"

    try:
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        results = await pipe.execute()

        count = results[0]
        ttl = results[1]

        if count == 1:
            await r.expire(key, window)
            ttl = window

        remaining = max(0, limit - count)
        reset_at = int(time.time()) + ttl

        if count > limit:
            logger.warning(f"FIXED WINDOW BLOCKED: {ip} on {endpoint} ({count}/{limit})")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {ttl} seconds.",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                    "X-RateLimit-Strategy": "fixed-window",
                    "Retry-After": str(ttl)
                }
            )

        return {
            "limit": limit,
            "remaining": remaining,
            "reset": reset_at,
            "strategy": "fixed-window"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fixed window error: {str(e)}")
        return {"limit": limit, "remaining": limit, "reset": 0, "strategy": "fixed-window"}


# ── Sliding Window Rate Limiter ────────────────────────────────────────────────
async def sliding_window(
    ip: str,
    endpoint: str,
    limit: int,
    window: int
) -> dict:
    """
    Accurate rolling window using Redis sorted sets.
    Used for: product listing, general browsing.
    """
    key = f"sliding:{endpoint}:{ip}"
    now = time.time()
    window_start = now - window

    try:
        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcount(key, "-inf", "+inf")
        pipe.expire(key, window)
        results = await pipe.execute()

        count = results[2]
        remaining = max(0, limit - count)

        if count > limit:
            logger.warning(f"SLIDING WINDOW BLOCKED: {ip} on {endpoint} ({count}/{limit})")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down.",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + window)),
                    "X-RateLimit-Strategy": "sliding-window",
                    "Retry-After": str(window)
                }
            )

        return {
            "limit": limit,
            "remaining": remaining,
            "reset": int(now + window),
            "strategy": "sliding-window"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sliding window error: {str(e)}")
        return {"limit": limit, "remaining": limit, "reset": 0, "strategy": "sliding-window"}


# ── Token Bucket ───────────────────────────────────────────────────────────────
async def token_bucket(
    identifier: str,
    endpoint: str,
    capacity: int,
    refill_rate: int
) -> dict:
    """
    Allows short bursts, refills steadily.
    Used for: cart operations (users add multiple items fast).
    identifier = user_id or IP if unauthenticated.
    refill_rate = tokens per minute.
    """
    key = f"bucket:{endpoint}:{identifier}"
    now = time.time()

    try:
        data = await r.hgetall(key)

        if not data:
            tokens = capacity - 1
            await r.hset(key, mapping={
                "tokens": tokens,
                "last_refill": now
            })
            await r.expire(key, 3600)
            return {
                "limit": capacity,
                "remaining": int(tokens),
                "strategy": "token-bucket"
            }

        tokens = float(data["tokens"])
        last_refill = float(data["last_refill"])

        elapsed = now - last_refill
        refill_amount = elapsed * (refill_rate / 60.0)
        tokens = min(capacity, tokens + refill_amount)

        if tokens < 1:
            retry_after = int((1 - tokens) * 60 / refill_rate)
            logger.warning(f"TOKEN BUCKET BLOCKED: {identifier} on {endpoint}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down.",
                headers={
                    "X-RateLimit-Limit": str(capacity),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Strategy": "token-bucket",
                    "Retry-After": str(retry_after)
                }
            )

        tokens -= 1
        await r.hset(key, mapping={
            "tokens": round(tokens, 4),
            "last_refill": now
        })
        await r.expire(key, 3600)

        return {
            "limit": capacity,
            "remaining": int(tokens),
            "strategy": "token-bucket"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token bucket error: {str(e)}")
        return {"limit": capacity, "remaining": capacity, "strategy": "token-bucket"}


# ── Adaptive Rate Limiter (your original logic, fixed) ─────────────────────────
async def check_rate_limit(ip: str) -> str:
    """
    Adaptive rate limiting + IP blocking check.
    Returns: 'ALLOW' | 'WARN' | 'BLOCK'
    """
    # Step 1 — permanent blocklist check
    if await is_ip_blocked(ip):
        logger.warning(f"BLOCKED (permanent): {ip}")
        return "BLOCK"

    # Step 2 — temp ban check
    is_banned, ttl = await is_ip_temp_banned(ip)
    if is_banned:
        logger.warning(f"BLOCKED (temp ban, {ttl}s remaining): {ip}")
        return "BLOCK"

    try:
        now = int(time.time())
        window_start = now - 60

        key = f"rate_limit:{ip}"
        error_key = f"error_rate:{ip}"
        threat_key = f"threat_history:{ip}"

        pipe = r.pipeline()
        pipe.zadd(key, {str(now): now})
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.expire(key, 60)
        pipe.get(error_key)
        pipe.get(threat_key)
        results = await pipe.execute()

        request_rate = results[2]
        error_count = int(results[4] or 0)
        threat_history = int(results[5] or 0)

        # Adaptive risk score
        risk_score = (
            (0.5 * request_rate) +
            (0.3 * error_count) +
            (0.2 * threat_history)
        )

        logger.debug(
            f"IP={ip} requests={request_rate} errors={error_count} "
            f"threats={threat_history} risk={risk_score:.2f}"
        )

        # Persistent offender — permanent block
        if threat_history >= settings.THREAT_BLOCK_LIMIT:
            await block_ip(ip, reason=f"threat_history={threat_history}")
            return "BLOCK"

        # High risk — temp ban for 30 minutes
        if risk_score > settings.RISK_THRESHOLD_HIGH:
            await temp_ban_ip(ip, duration_seconds=1800, reason=f"risk_score={risk_score:.2f}")
            return "BLOCK"

        # Medium risk — warn
        if risk_score > settings.RISK_THRESHOLD_MEDIUM:
            logger.warning(f"WARN: {ip} risk_score={risk_score:.2f}")
            return "WARN"

        return "ALLOW"

    except Exception as e:
        logger.error(f"Rate limiter error for {ip}: {str(e)}")
        return "ALLOW"


# ── Error & Threat Counters ────────────────────────────────────────────────────
async def increment_error_count(ip: str):
    """Call this when a request returns 4xx/5xx."""
    try:
        await r.incr(f"error_rate:{ip}")
        await r.expire(f"error_rate:{ip}", 3600)
    except Exception as e:
        logger.error(f"increment_error_count failed: {str(e)}")

async def increment_threat_history(ip: str):
    """Call this when ML detector flags a request as malicious."""
    try:
        await r.incr(f"threat_history:{ip}")
        await r.expire(f"threat_history:{ip}", 86400)
    except Exception as e:
        logger.error(f"increment_threat_history failed: {str(e)}")

async def get_ip_stats(ip: str) -> dict:
    """Get full stats for an IP — useful for admin dashboard."""
    try:
        now = int(time.time())
        window_start = now - 60

        pipe = r.pipeline()
        pipe.zcount(f"rate_limit:{ip}", window_start, now)
        pipe.get(f"error_rate:{ip}")
        pipe.get(f"threat_history:{ip}")
        pipe.sismember("blocked_ips", ip)
        pipe.ttl(f"temp_ban:{ip}")
        pipe.hgetall(f"block_info:{ip}")
        results = await pipe.execute()

        return {
            "ip": ip,
            "requests_last_60s": results[0],
            "error_count": int(results[1] or 0),
            "threat_history": int(results[2] or 0),
            "is_permanently_blocked": bool(results[3]),
            "temp_ban_remaining": max(0, results[4]),
            "block_info": results[5] or {}
        }
    except Exception as e:
        logger.error(f"get_ip_stats failed: {str(e)}")
        return {}


# ── Main Middleware ────────────────────────────────────────────────────────────
async def rate_limit_middleware(request: Request, call_next):
    """
    Drop this into main.py as middleware.
    Applies the right strategy per endpoint automatically.
    """
    ip = request.client.host
    path = request.url.path
    method = request.method

    # Extract user identity from JWT if present
    auth_header = request.headers.get("Authorization", "")
    user_id = ip  # fallback to IP if no JWT
    if auth_header.startswith("Bearer "):
        user_id = auth_header  # use token as bucket key

    # Step 1 — adaptive check (your original logic)
    decision = await check_rate_limit(ip)
    if decision == "BLOCK":
        raise HTTPException(
            status_code=429,
            detail="Your IP has been blocked due to suspicious activity.",
            headers={"Retry-After": "1800"}
        )

    # Step 2 — endpoint-specific strategy
    try:
        # Auth endpoints — fixed window, strict
        if path == "/api/auth/login" and method == "POST":
            await fixed_window(ip, "login", limit=5, window=900)

        elif path == "/api/auth/register" and method == "POST":
            await fixed_window(ip, "register", limit=3, window=3600)

        # Products — sliding window
        elif path.startswith("/api/products") and method == "GET":
            await sliding_window(ip, "products", limit=60, window=60)

        # Cart — token bucket (burst-friendly)
        elif path.startswith("/api/cart"):
            await token_bucket(user_id, "cart", capacity=10, refill_rate=30)

        # Orders — fixed window, strict
        elif path == "/api/orders" and method == "POST":
            await fixed_window(ip, "orders", limit=5, window=60)

        elif path.startswith("/api/orders") and method == "GET":
            await fixed_window(ip, "orders_get", limit=30, window=60)

    except HTTPException:
        await increment_error_count(ip)
        raise

    # Step 3 — forward request
    response = await call_next(request)

    # Step 4 — track errors for adaptive scoring
    if response.status_code >= 400:
        await increment_error_count(ip)
    if response.status_code == 429:
        await increment_threat_history(ip)

    return response

