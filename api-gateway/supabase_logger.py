import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env variables
load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Supabase client only if credentials are available
supabase: Client = None
try:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key and supabase_url != "your_supabase_url_here":
        supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase connected for logging")
    else:
        logger.warning("⚠️  Supabase credentials not configured - logging to console only")
except Exception as e:
    logger.error(f"❌ Supabase connection failed: {e}")
    supabase = None

# 🔥 Async logging function
async def log_rate_limit_event(
    ip: str,
    endpoint: str,
    method: str,
    action: str,
    requests_made: int,
    limit_max: int,
    remaining: int,
    user_id: str = None,
    blocked_until: str = None,
    user_agent: str = None,
    threat_score: float = 0.0
):
    # Always log to console
    logger.info(f"Rate Limit: {action} | {ip} | {endpoint} | {method} | Score: {threat_score}")
    
    # Try Supabase if available
    if not supabase:
        return
        
    try:
        data = {
            "ip_address": ip,
            "endpoint": endpoint,
            "method": method,
            "action": action,
            "requests_made": requests_made,
            "limit_max": limit_max,
            "remaining": remaining,
            "user_id": user_id,
            "blocked_until": blocked_until,
            "user_agent": user_agent,
            "threat_score": threat_score,
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("rate_limit_logs").insert(data).execute()
        logger.info(f"Logged to Supabase: {action} | {ip} | {endpoint}")
    except Exception as e:
        logger.error(f"Supabase log failed: {str(e)}")