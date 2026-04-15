import time
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

# Resilient MongoDB connection
_mongo_online = False
try:
    client = AsyncIOMotorClient(settings.MONGO_URL, serverSelectionTimeoutMS=2000)
    db = client[settings.DATABASE_NAME]
    collection = db[settings.COLLECTION_NAME]
    _mongo_online = True
except Exception as e:
    logger.error(f"MongoDB connection FAILED: {str(e)}. Logging will be disabled.")

async def log_request(data: dict):
    if not _mongo_online:
        logger.info(f"OFLINE LOG: {data.get('path')} | Status: {data.get('status')}")
        return

    try:
        data["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
        await collection.insert_one(data)
    except Exception as e:
        logger.error(f"Error persisting log: {str(e)}")
from supabase import create_client
import os

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

async def log_rate_limit_event(
    ip: str,
    endpoint: str,
    method: str,
    action: str,        # "allowed" | "warned" | "blocked"
    requests_made: int,
    limit_max: int,
    remaining: int,
    user_id: str = None,
    blocked_until=None,
    user_agent: str = None,
    threat_score: float = 0.0
):
    supabase.table("rate_limit_logs").insert({
        "ip_address": ip,
        "endpoint": endpoint,
        "method": method,
        "user_id": user_id,
        "action": action,
        "requests_made": requests_made,
        "limit_max": limit_max,
        "remaining": remaining,
        "blocked_until": str(blocked_until) if blocked_until else None,
        "user_agent": user_agent,
        "threat_score": threat_score
    }).execute()