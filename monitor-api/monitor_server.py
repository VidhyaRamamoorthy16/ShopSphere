import redis
import json
import time
import httpx
import logging
import asyncio
import os
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Set
import asyncio

ws_clients: Set[WebSocket] = set()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MonitorAPI")

app = FastAPI(title="ShieldMart Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nqsejbhmuehpaalkhbsh.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xc2VqYmhtdWVocGFhbGtoYnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM5ODM0OSwiZXhwIjoyMDkwOTc0MzQ5fQ.Hf1DLYlEDOiXwv2Tz8AE3RvPD2Dp11yaSO6yG6UOWDc")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

SERVICES = [
    {"name": "API Gateway",       "port": 5001, "url": "http://localhost:5001/health"},
    {"name": "Backend",           "port": 8000, "url": "http://localhost:8000/health"},
    {"name": "Frontend",          "port": 5173, "url": "http://localhost:5173"},
    {"name": "Monitor API",       "port": 3000, "url": "http://localhost:3000/health"},
    {"name": "Monitor Dashboard", "port": 3001, "url": "http://localhost:3001"},
]

# Redis connection
try:
    r = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    r.ping()
    REDIS_OK = True
    logger.info("Redis connected")
except Exception as e:
    logger.error(f"Redis failed: {e}")
    REDIS_OK = False
    r = None


def safe_parse(raw_list):
    parsed = []
    for item in raw_list:
        try:
            parsed.append(json.loads(item))
        except:
            pass
    return parsed


def get_redis_requests():
    if not REDIS_OK or not r:
        return []
    try:
        raw = r.lrange("gateway:requests", 0, 499)
        return safe_parse(raw)
    except:
        return []


def get_redis_blocked():
    if not REDIS_OK or not r:
        return []
    try:
        raw = r.lrange("gateway:blocked", 0, 199)
        return safe_parse(raw)
    except:
        return []


@app.get("/health")
async def health():
    redis_status = "connected" if REDIS_OK else "disconnected"
    total = r.llen("gateway:requests") if REDIS_OK and r else 0
    return {
        "status": "working",
        "service": "Monitor-API",
        "port": 3000,
        "redis": redis_status,
        "total_logged": total
    }


@app.get("/monitor/overview")
async def overview():
    try:
        requests = get_redis_requests()
        blocked = get_redis_blocked()

        total = len(requests)
        blocked_count = len(blocked)
        allowed_count = total - blocked_count
        rate_limited = sum(1 for req in blocked if req.get("reason") == "Rate Limit")
        threats = sum(1 for req in blocked if req.get("reason") not in [None, "Rate Limit"])

        # Average latency
        latencies = [req.get("duration_ms", 0) for req in requests if req.get("duration_ms")]
        avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0

        # Threat score 0-100
        threat_score = min(100, round((blocked_count / max(total, 1)) * 100 * 10))

        # Requests per minute (last 60 data points)
        now = time.time()
        rpm_data = []
        for i in range(29, -1, -1):
            window_start = now - (i + 1) * 60
            window_end = now - i * 60
            count = sum(1 for req in requests if window_start <= req.get("timestamp", 0) < window_end)
            rpm_data.append({"minute": 29 - i, "count": count})

        # Top endpoints
        endpoint_counts = {}
        for req in requests:
            ep = req.get("path", "/unknown")
            endpoint_counts[ep] = endpoint_counts.get(ep, 0) + 1
        top_endpoints = sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:8]

        # Blocked IPs
        blocked_ips_set = list(r.smembers("gateway:blocked_ips")) if REDIS_OK and r else []

        return {
            "total_requests": total,
            "blocked_requests": blocked_count,
            "allowed_requests": allowed_count,
            "rate_limited": rate_limited,
            "threats_detected": threats,
            "threat_score": threat_score,
            "avg_latency_ms": avg_latency,
            "blocked_ips_count": len(blocked_ips_set),
            "rpm_data": rpm_data,
            "top_endpoints": [{"path": ep, "count": cnt} for ep, cnt in top_endpoints],
        }
    except Exception as e:
        logger.error(f"Overview error: {e}")
        return {"total_requests": 0, "blocked_requests": 0, "allowed_requests": 0,
                "rate_limited": 0, "threats_detected": 0, "threat_score": 0,
                "avg_latency_ms": 0, "blocked_ips_count": 0, "rpm_data": [], "top_endpoints": []}


@app.get("/monitor/requests/live")
async def live_requests():
    try:
        requests = get_redis_requests()
        formatted = []
        for req in requests[:50]:
            formatted.append({
                "ip": req.get("ip", "unknown"),
                "method": req.get("method", "GET"),
                "path": req.get("path", "/"),
                "status": req.get("status", 200),
                "duration_ms": req.get("duration_ms", 0),
                "action": req.get("action", "ALLOWED"),
                "reason": req.get("reason"),
                "timestamp": req.get("timestamp_str", ""),
            })
        return {"requests": formatted, "total": len(formatted)}
    except Exception as e:
        logger.error(f"Live requests error: {e}")
        return {"requests": [], "total": 0}


@app.get("/monitor/requests/stats")
async def request_stats():
    try:
        requests = get_redis_requests()
        total = len(requests)
        blocked = sum(1 for req in requests if req.get("action") == "BLOCKED")
        allowed = total - blocked
        methods = {}
        for req in requests:
            m = req.get("method", "GET")
            methods[m] = methods.get(m, 0) + 1
        latencies = [req.get("duration_ms", 0) for req in requests if req.get("duration_ms")]
        return {
            "total": total,
            "allowed": allowed,
            "blocked": blocked,
            "block_rate_pct": round((blocked / max(total, 1)) * 100, 1),
            "methods": methods,
            "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
            "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 2) if len(latencies) > 5 else 0,
        }
    except Exception as e:
        return {"total": 0, "allowed": 0, "blocked": 0}


@app.get("/monitor/threats/live")
async def live_threats():
    try:
        blocked = get_redis_blocked()

        # Also fetch from Supabase for historical data
        supabase_threats = []
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/threat_logs?order=blocked_at.desc&limit=50",
                    headers=SUPABASE_HEADERS
                )
                if resp.status_code == 200:
                    supabase_threats = resp.json()
        except:
            pass

        redis_threats = []
        for req in blocked:
            if req.get("reason") and req.get("reason") != "Rate Limit":
                redis_threats.append({
                    "ip": req.get("ip"),
                    "threat_type": req.get("reason"),
                    "endpoint": req.get("path"),
                    "method": req.get("method"),
                    "payload": req.get("body_preview", "")[:100],
                    "timestamp": req.get("timestamp_str"),
                    "source": "redis"
                })

        for t in supabase_threats:
            redis_threats.append({
                "ip": t.get("ip_address"),
                "threat_type": t.get("threat_type"),
                "endpoint": t.get("endpoint"),
                "method": t.get("method"),
                "payload": t.get("payload", "")[:100],
                "timestamp": t.get("blocked_at"),
                "source": "supabase"
            })

        return {"threats": redis_threats[:50], "total": len(redis_threats)}
    except Exception as e:
        logger.error(f"Threats error: {e}")
        return {"threats": [], "total": 0}


@app.get("/monitor/rate-limits/active")
async def rate_limits():
    try:
        blocked_ips = []
        if REDIS_OK and r:
            ips = list(r.smembers("gateway:blocked_ips"))
            for ip in ips[:20]:
                count = r.get(f"rate:{ip}")
                ttl = r.ttl(f"rate:{ip}")
                blocked_ips.append({
                    "ip": ip,
                    "count": int(count) if count else 0,
                    "limit": 100,
                    "ttl_seconds": ttl if ttl > 0 else 0,
                    "pct": min(100, round((int(count or 0) / 100) * 100))
                })

        # Also fetch from Supabase
        supabase_limits = []
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/rate_limit_logs?order=blocked_at.desc&limit=20",
                    headers=SUPABASE_HEADERS
                )
                if resp.status_code == 200:
                    supabase_limits = resp.json()
        except:
            pass

        return {
            "active": blocked_ips,
            "blocked_ips": [ip["ip"] for ip in blocked_ips],
            "historical": supabase_limits,
            "total_blocked_ips": len(blocked_ips)
        }
    except Exception as e:
        logger.error(f"Rate limits error: {e}")
        return {"active": [], "blocked_ips": [], "historical": [], "total_blocked_ips": 0}


@app.get("/monitor/health")
async def system_health():
    results = []
    async with httpx.AsyncClient(timeout=3.0) as client:
        for svc in SERVICES:
            try:
                t = time.time()
                resp = await client.get(svc["url"])
                ms = round((time.time() - t) * 1000, 1)
                results.append({
                    "name": svc["name"],
                    "port": svc["port"],
                    "status": "online",
                    "status_code": resp.status_code,
                    "response_ms": ms,
                    "url": svc["url"]
                })
            except Exception as e:
                results.append({
                    "name": svc["name"],
                    "port": svc["port"],
                    "status": "offline",
                    "status_code": 0,
                    "response_ms": 0,
                    "error": str(e),
                    "url": svc["url"]
                })

    # Redis health
    redis_ok = False
    redis_keys = 0
    try:
        r2 = redis.Redis(host='localhost', port=6379, decode_responses=True, socket_connect_timeout=1)
        r2.ping()
        redis_ok = True
        redis_keys = r2.dbsize()
    except:
        pass

    online = sum(1 for s in results if s["status"] == "online")
    return {
        "services": results,
        "redis": {"status": "online" if redis_ok else "offline", "keys": redis_keys},
        "summary": {"total": len(results), "online": online, "offline": len(results) - online}
    }


@app.get("/monitor/stats/hourly")
async def hourly_stats():
    """Write current hour stats to Supabase and return 7-day trend"""
    try:
        requests_data = get_redis_requests()
        blocked_data = get_redis_blocked()

        total = len(requests_data)
        blocked_count = len(blocked_data)
        allowed_count = total - blocked_count
        threats = sum(1 for r in blocked_data if r.get("reason") not in [None, "Rate Limit", ""])
        rate_limited = sum(1 for r in blocked_data if r.get("reason") == "Rate Limit")
        latencies = [req.get("duration_ms", 0) for req in requests_data if req.get("duration_ms")]
        avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0

        current_hour = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0).isoformat()

        stat_row = {
            "hour": current_hour,
            "total_requests": total,
            "allowed": allowed_count,
            "blocked": blocked_count,
            "threats": threats,
            "rate_limited": rate_limited,
            "avg_latency_ms": avg_latency
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            upsert_headers = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates"}
            await client.post(
                f"{SUPABASE_URL}/rest/v1/gateway_stats",
                headers=upsert_headers,
                json=stat_row
            )

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/gateway_stats?order=hour.desc&limit=168",
                headers=SUPABASE_HEADERS
            )
            history = resp.json() if resp.status_code == 200 else []

        return {
            "current": stat_row,
            "history": history,
            "days": 7
        }
    except Exception as e:
        logger.error(f"Hourly stats error: {e}")
        return {"current": {}, "history": [], "days": 7}


@app.get("/monitor/stats/summary")
async def stats_summary():
    """7-day aggregated summary from Supabase"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/gateway_stats?order=hour.desc&limit=168",
                headers=SUPABASE_HEADERS
            )
            rows = resp.json() if resp.status_code == 200 else []

        total_7d = sum(r.get("total_requests", 0) for r in rows)
        blocked_7d = sum(r.get("blocked", 0) for r in rows)
        threats_7d = sum(r.get("threats", 0) for r in rows)

        daily = {}
        for row in rows:
            try:
                day = row["hour"][:10]
                if day not in daily:
                    daily[day] = {"date": day, "total": 0, "blocked": 0, "threats": 0}
                daily[day]["total"] += row.get("total_requests", 0)
                daily[day]["blocked"] += row.get("blocked", 0)
                daily[day]["threats"] += row.get("threats", 0)
            except:
                pass

        return {
            "total_7d": total_7d,
            "blocked_7d": blocked_7d,
            "threats_7d": threats_7d,
            "block_rate_pct": round((blocked_7d / max(total_7d, 1)) * 100, 1),
            "daily": list(daily.values())[-7:]
        }
    except Exception as e:
        logger.error(f"Stats summary error: {e}")
        return {"total_7d": 0, "blocked_7d": 0, "threats_7d": 0, "block_rate_pct": 0, "daily": []}


# CSV converter helper
def convert_to_csv(data):
    if not data or len(data) == 0:
        return ""
    headers = ",".join(data[0].keys())
    rows = []
    for row in data:
        values = []
        for v in row.values():
            val = str(v) if v is not None else ""
            if "," in val or '"' in val or "\n" in val:
                val = f'"{val.replace('"', '""')}"'
            values.append(val)
        rows.append(",".join(values))
    return headers + "\n" + "\n".join(rows)


@app.get("/api/export/requests")
async def export_requests():
    """Export request logs as CSV download"""
    try:
        # Use correct Redis key
        raw = redis_client.lrange("gateway:requests", 0, -1)
        
        if not raw:
            # Return empty CSV with headers instead of 404
            empty_csv = "timestamp,ip,method,path,status,duration_ms,action,reason\n"
            return Response(
                content=empty_csv,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=requests.csv"}
            )
        
        # Parse JSON items - handle bytes decoding
        data = []
        for item in raw:
            if isinstance(item, bytes):
                item = item.decode('utf-8')
            try:
                data.append(json.loads(item))
            except json.JSONDecodeError:
                continue  # Skip corrupted entries
        
        if not data:
            empty_csv = "timestamp,ip,method,path,status,duration_ms,action,reason\n"
            return Response(
                content=empty_csv,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=requests.csv"}
            )
        
        # Convert to CSV
        headers = ",".join(data[0].keys())
        rows = []
        for obj in data:
            values = []
            for v in obj.values():
                val = str(v) if v is not None else ""
                # Escape special CSV characters
                if "," in val or '"' in val or "\n" in val:
                    val = f'"{val.replace('"', '""')}"'
                values.append(val)
            rows.append(",".join(values))
        
        csv = headers + "\n" + "\n".join(rows)
        
        return Response(
            content=csv,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=requests.csv"}
        )
    except Exception as e:
        logger.error(f"Export requests error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@app.get("/api/export/threats")
async def export_threats():
    """Export threat logs as JSON"""
    try:
        blocked = get_redis_blocked()
        threats = []
        
        # Get from Redis
        for req in blocked:
            if req.get("reason") and req.get("reason") != "Rate Limit":
                threats.append({
                    "ip": req.get("ip", ""),
                    "threat_type": req.get("reason", ""),
                    "endpoint": req.get("path", ""),
                    "method": req.get("method", ""),
                    "timestamp": req.get("timestamp_str", ""),
                    "source": "redis"
                })
        
        # Also from Supabase
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/threat_logs?order=blocked_at.desc&limit=100",
                    headers=SUPABASE_HEADERS
                )
                if resp.status_code == 200:
                    for t in resp.json():
                        threats.append({
                            "ip": t.get("ip_address", ""),
                            "threat_type": t.get("threat_type", ""),
                            "endpoint": t.get("endpoint", ""),
                            "method": t.get("method", ""),
                            "timestamp": t.get("blocked_at", ""),
                            "source": "supabase"
                        })
        except:
            pass
        
        return {"threats": threats, "count": len(threats)}
    except Exception as e:
        logger.error(f"Export threats error: {e}")
        return {"error": str(e)}


@app.get("/api/export/stats")
async def export_stats():
    """Export 7-day stats as JSON"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/gateway_stats?order=hour.desc&limit=168",
                headers=SUPABASE_HEADERS
            )
            rows = resp.json() if resp.status_code == 200 else []
        
        # Aggregate by day
        daily = {}
        for row in rows:
            try:
                day = row["hour"][:10]
                if day not in daily:
                    daily[day] = {"date": day, "total": 0, "blocked": 0, "threats": 0}
                daily[day]["total"] += row.get("total_requests", 0)
                daily[day]["blocked"] += row.get("blocked", 0)
                daily[day]["threats"] += row.get("threats", 0)
            except:
                pass
        
        summary = {
            "total_7d": sum(r.get("total_requests", 0) for r in rows),
            "blocked_7d": sum(r.get("blocked", 0) for r in rows),
            "threats_7d": sum(r.get("threats", 0) for r in rows),
            "daily": list(daily.values())[-7:]
        }
        
        return summary
    except Exception as e:
        logger.error(f"Export stats error: {e}")
        return {"error": str(e)}


@app.post("/api/admin/flush-cache")
async def flush_cache():
    """Flush all Redis cache"""
    try:
        redis_client.flushdb()
        logger.info("Redis cache flushed")
        return {"message": "Cache flushed successfully"}
    except Exception as e:
        logger.error(f"Flush cache error: {e}")
        return {"error": str(e)}


@app.get("/api/admin/export-logs")
async def export_logs():
    """Export all logs as JSON download"""
    try:
        # Get requests
        raw = redis_client.lrange("gateway:requests", 0, -1)
        requests_data = [json.loads(item) for item in raw] if raw else []
        
        # Get blocked/threats
        blocked_raw = redis_client.lrange("gateway:blocked", 0, -1)
        blocked_data = [json.loads(item) for item in blocked_raw] if blocked_raw else []
        
        # Get rate limits
        rate_keys = redis_client.keys("rate_limit:*")
        rate_data = []
        for key in rate_keys:
            count = redis_client.get(key)
            ip = key.decode().replace("rate_limit:", "") if isinstance(key, bytes) else key.replace("rate_limit:", "")
            rate_data.append({"ip": ip, "count": int(count) if count else 0})
        
        export_data = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "requests_count": len(requests_data),
            "blocked_count": len(blocked_data),
            "requests": requests_data[:1000],
            "blocked": blocked_data[:1000],
            "rate_limits": rate_data
        }
        
        return Response(
            content=json.dumps(export_data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=all_logs.json"}
        )
    except Exception as e:
        logger.error(f"Export logs error: {e}")
        return {"error": str(e)}


@app.post("/api/admin/clear-threats")
async def clear_threats():
    """Clear all threat logs from Redis"""
    try:
        # Clear blocked list
        redis_client.delete("gateway:blocked")
        # Clear rate limit keys
        rate_keys = redis_client.keys("rate_limit:*")
        if rate_keys:
            redis_client.delete(*rate_keys)
        logger.info("Threats cleared from Redis")
        return {"message": "All threats cleared"}
    except Exception as e:
        logger.error(f"Clear threats error: {e}")
        return {"error": str(e)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info(f"WS connected. Total: {len(ws_clients)}")
    last_total = 0
    try:
        while True:
            await asyncio.sleep(0.8)
            if not REDIS_OK or not r:
                continue
            try:
                total = r.llen("gateway:requests")
                if total != last_total:
                    last_total = total
                    raw = r.lrange("gateway:requests", 0, 0)
                    latest = json.loads(raw[0]) if raw else {}
                    blocked = r.llen("gateway:blocked")
                    threat_score = min(100, round((blocked / max(total, 1)) * 1000))
                    await websocket.send_json({
                        "type": "new_request",
                        "request": latest,
                        "stats": {
                            "total_requests": total,
                            "blocked_requests": blocked,
                            "threat_score": threat_score,
                            "allowed_requests": total - blocked
                        }
                    })
            except Exception as e:
                logger.error(f"WS send: {e}")
                break
    except WebSocketDisconnect:
        pass
    finally:
        ws_clients.discard(websocket)
        logger.info(f"WS disconnected. Total: {len(ws_clients)}")
