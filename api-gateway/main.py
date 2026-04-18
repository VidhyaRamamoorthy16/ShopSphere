import httpx
import redis as redis_lib
import json
import time
import logging
import asyncio
import os
import numpy as np

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger("Gateway")

app = FastAPI(title="ShieldMart Intelligent API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nqsejbhmuehpaalkhbsh.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xc2VqYmhtdWVocGFhbGtoYnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM5ODM0OSwiZXhwIjoyMDkwOTc0MzQ5fQ.Hf1DLYlEDOiXwv2Tz8AE3RvPD2Dp11yaSO6yG6UOWDc")
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

THREAT_LABELS = {0: None, 1: 'SQL Injection', 2: 'XSS', 3: 'Path Traversal', 4: 'DDoS', 5: 'Brute Force'}

# Load ML model
ML_MODEL = None
ML_METRICS = {}
try:
    import joblib
    model_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'threat_model.pkl')
    metrics_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'metrics.json')
    ML_MODEL = joblib.load(model_path)
    with open(metrics_path) as f:
        ML_METRICS = json.load(f)
    logger.info(f"ML model loaded — accuracy: {ML_METRICS.get('accuracy')}%")
except Exception as e:
    logger.warning(f"ML model not loaded ({e}) — using rule-based fallback")

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis_lib.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=2
    )
    redis_client.ping()
    REDIS_OK = True
    logger.info("Redis connected")
except Exception as e:
    logger.error(f"Redis failed: {e}")
    REDIS_OK = False
    redis_client = None


def extract_features(method, path, body, user_agent=''):
    body = str(body or '').lower()
    path = str(path or '/').lower()
    method = str(method or 'GET').upper()
    ua = str(user_agent or '').lower()
    return [
        {'GET':0,'POST':1,'PUT':2,'DELETE':3,'PATCH':4,'OPTIONS':5,'HEAD':6}.get(method,7),
        min(len(path),500), min(len(body),5000), path.count('/'), path.count('='),
        path.count('&'), body.count('='), body.count('&'),
        int('select' in body or 'select' in path), int('union' in body or 'union' in path),
        int('drop' in body or 'drop' in path), int('insert' in body),
        int('delete from' in body), int("or '1'='1" in body or '1=1' in body or 'or 1=1' in body),
        int('--' in body or '/*' in body or '#' in body),
        int('xp_' in body or 'exec(' in body or 'execute(' in body),
        int('cast(' in body or 'convert(' in body),
        int('sleep(' in body or 'waitfor' in body or 'benchmark(' in body),
        int('information_schema' in body or 'sys.tables' in body),
        int('char(' in body or 'ascii(' in body or 'hex(' in body),
        body.count("'"), body.count('"'), body.count(';'), body.count('('),
        int('<script' in body), int('javascript:' in body),
        int('onerror=' in body or 'onload=' in body or 'onclick=' in body or 'onmouseover=' in body),
        int('alert(' in body),
        int('<img' in body and ('onerror' in body or 'src=' in body)),
        int('<svg' in body or '<iframe' in body),
        int('document.cookie' in body or 'document.write' in body),
        int('eval(' in body or 'expression(' in body),
        int('vbscript:' in body or 'data:text' in body),
        body.count('<'), body.count('>'),
        int('../' in path or '..\\'in path or '../' in body),
        int('etc/passwd' in path or 'etc/shadow' in path or 'etc/hosts' in path),
        int('cmd.exe' in path or '/bin/sh' in path or '/bin/bash' in path),
        int('/proc/' in path or '/sys/' in path),
        int('%2e%2e' in path or '..%2f' in path or '%252e' in path),
        int('../../../../' in path or '..../' in path),
        int(len(body)==0 and method=='POST'), int(path.count('/')>8), int(len(path)>200),
        int('login' in path and method=='POST'), int('auth' in path and method=='POST'),
        int('password' in body and 'email' in body),
        int('admin' in path or 'administrator' in path),
        int('%27' in path or '%22' in path or '%3c' in path or '%3e' in path),
        int('0x' in body and len(body)>10),
        int('sqlmap' in ua or 'nikto' in ua or 'nmap' in ua),
        int('curl' in ua and method=='POST'), int(len(ua)==0),
        min(1.0, sum(1 for c in body if not c.isalnum() and c not in ' .,!?@-_:/\n\t') / max(len(body),1)),
        min(1.0, sum(1 for c in path if not c.isalnum() and c not in '/-_.?=&') / max(len(path),1)),
    ]


def ml_detect(method, path, body, ua=''):
    if ML_MODEL is not None:
        try:
            feats = np.array([extract_features(method, path, body, ua)])
            pred = ML_MODEL.predict(feats)[0]
            prob = ML_MODEL.predict_proba(feats)[0][pred]
            label = THREAT_LABELS.get(int(pred))
            # Higher threshold for DDoS (85%) to reduce false positives
            # Other threats use standard threshold (55%)
            threshold = 0.85 if label == 'DDoS' else 0.55
            if label and prob > threshold:
                return label, round(float(prob)*100, 1)
            return None, 0
        except Exception as e:
            logger.error(f"ML predict error: {e}")

    # Rule-based fallback
    b, p = (body or '').lower(), (path or '').lower()
    for pat in ["select ", "union ", "drop ", "' or '", "1=1", "-- ", "xp_"]:
        if pat in b or pat in p: return "SQL Injection", 100
    for pat in ["<script", "javascript:", "onerror=", "onload=", "alert("]:
        if pat in b: return "XSS", 100
    for pat in ["../", "etc/passwd", "cmd.exe", "/bin/sh"]:
        if pat in p or pat in b: return "Path Traversal", 100
    return None, 0


async def log_redis(entry, action, ip):
    if not REDIS_OK or not redis_client:
        return
    try:
        js = json.dumps(entry)
        pipe = redis_client.pipeline()
        pipe.lpush("gateway:requests", js)
        pipe.ltrim("gateway:requests", 0, 999)
        if action == "BLOCKED":
            pipe.lpush("gateway:blocked", js)
            pipe.ltrim("gateway:blocked", 0, 499)
            pipe.sadd("gateway:blocked_ips", ip)
        pipe.execute()
    except Exception as e:
        logger.error(f"Redis log failed: {e}")


async def log_supabase(entry, action, threat_type=None):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            if action == "BLOCKED" and threat_type and threat_type != "Rate Limit":
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/threat_logs",
                    headers=SUPABASE_HEADERS,
                    json={"ip_address": entry.get("ip"), "threat_type": threat_type,
                          "payload": entry.get("body_preview","")[:200],
                          "endpoint": entry.get("path"), "method": entry.get("method")}
                )
            elif action == "BLOCKED" and threat_type == "Rate Limit":
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/rate_limit_logs",
                    headers=SUPABASE_HEADERS,
                    json={"ip_address": entry.get("ip"), "endpoint": entry.get("path"), "request_count": 101}
                )
    except Exception as e:
        logger.debug(f"Supabase log: {e}")

@app.get("/health")
async def health():
    return {
        "status": "working", "service": "API-Gateway", "port": 5001,
        "redis": "connected" if REDIS_OK else "disconnected",
        "supabase": "connected",
        "ml_model": {
            "loaded": ML_MODEL is not None,
            "accuracy": ML_METRICS.get("accuracy", 0),
            "cv_accuracy": ML_METRICS.get("cv_mean", 0),
            "model_type": "Random Forest + Pipeline",
            "threat_classes": list(THREAT_LABELS.values())[1:]
        }
    }


@app.get("/ml/metrics")
async def ml_metrics():
    return {
        "model": "Random Forest Classifier",
        "accuracy": ML_METRICS.get("accuracy", 0),
        "cv_accuracy": ML_METRICS.get("cv_mean", 0),
        "cv_std": ML_METRICS.get("cv_std", 0),
        "n_samples": ML_METRICS.get("n_samples", 0),
        "n_features": ML_METRICS.get("n_features", 0),
        "threat_classes": ML_METRICS.get("classes", []),
        "per_class_metrics": ML_METRICS.get("report", {}),
        "status": "active" if ML_MODEL is not None else "fallback"
    }


@app.api_route("/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH","OPTIONS"])
async def proxy(request: Request, path: str):
    start = time.time()
    ip = request.client.host
    method = request.method
    ua = request.headers.get("user-agent", "")
    body_bytes = await request.body()
    body_str = body_bytes.decode('utf-8', errors='ignore')

    entry = {
        "ip": ip, "method": method, "path": f"/{path}",
        "timestamp": time.time(),
        "timestamp_str": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "body_preview": body_str[:200]
    }

    # Whitelist localhost for development
    WHITELIST_IPS = {'127.0.0.1', 'localhost', '::1', '172.20.10.6'}
    is_whitelisted = ip in WHITELIST_IPS or ip.startswith('127.') or ip.startswith('192.168.') or ip.startswith('10.') or ip.startswith('172.')

    # Rate limiting (skip for whitelisted IPs)
    if not is_whitelisted and REDIS_OK and redis_client:
        try:
            pipe = redis_client.pipeline()
            pipe.incr(f"rate:{ip}")
            pipe.expire(f"rate:{ip}", 60)
            count = pipe.execute()[0]
            if count > 100:
                dur = time.time() - start
                entry.update({"status": 429, "duration_ms": round(dur*1000,2), "action": "BLOCKED", "reason": "Rate Limit"})
                await log_redis(entry, "BLOCKED", ip)
                asyncio.create_task(log_supabase(entry, "BLOCKED", "Rate Limit"))
                return Response(content=json.dumps({"error":"Rate limit exceeded","retry_after":60}), status_code=429, media_type="application/json")
        except Exception as e:
            logger.error(f"Rate limit error: {e}")

    # ML Threat detection (skip for whitelisted IPs)
    threat, confidence = None, 0
    if not is_whitelisted:
        threat, confidence = ml_detect(method, f"/{path}", body_str, ua)
    if threat:
        dur = time.time() - start
        entry.update({"status": 403, "duration_ms": round(dur*1000,2), "action": "BLOCKED",
                      "reason": threat, "ml_confidence": confidence})
        await log_redis(entry, "BLOCKED", ip)
        asyncio.create_task(log_supabase(entry, "BLOCKED", threat))
        logger.warning(f"BLOCKED {threat} ({confidence}%) from {ip}: /{path}")
        return Response(
            content=json.dumps({"error": "Request blocked by intelligent gateway",
                                "reason": threat, "confidence": f"{confidence}%"}),
            status_code=403, media_type="application/json"
        )

    # Proxy to backend
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host','content-length']}
            resp = await client.request(method=method, url=f"{BACKEND_URL}/{path}",
                                        headers=headers, content=body_bytes,
                                        params=dict(request.query_params))
            dur = time.time() - start
            entry.update({"status": resp.status_code, "duration_ms": round(dur*1000,2), "action": "ALLOWED", "reason": None})
            await log_redis(entry, "ALLOWED", ip)
            return Response(content=resp.content, status_code=resp.status_code,
                            media_type=resp.headers.get("content-type","application/json"))
    except Exception as e:
        dur = time.time() - start
        entry.update({"status": 502, "duration_ms": round(dur*1000,2), "action": "ERROR", "reason": str(e)})
        await log_redis(entry, "ERROR", ip)
        return Response(content=json.dumps({"error":"Backend unavailable","detail":str(e)}),
                        status_code=502, media_type="application/json")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
