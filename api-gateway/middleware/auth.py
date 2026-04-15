import redis
from jose import jwt, JWTError
from fastapi import Request, HTTPException
from config import settings
import logging

logger = logging.getLogger(__name__)

# Redis for Blacklist
r_blacklist = redis.Redis(
    host=settings.REDIS_HOST, 
    port=settings.REDIS_PORT, 
    db=settings.REDIS_DB, 
    decode_responses=True
)

def blacklist_token(token: str):
    """Adds a token to the Redis blacklist."""
    try:
        r_blacklist.setex(f"blacklist:{token}", settings.BLACKLIST_TTL, "true")
        logger.info("Token successfully blacklisted.")
    except Exception as e:
        logger.error(f"Failed to blacklist token: {str(e)}")

def is_token_blacklisted(token: str):
    """Checks if a token is in the Redis blacklist."""
    try:
        return r_blacklist.exists(f"blacklist:{token}")
    except:
        return False

async def verify_token(request: Request):
    """
    Verifies JWT token and checks if it's blacklisted.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
        
    try:
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token format")
            
        token = auth_header.split(" ")[1]
        
        # Security Feature: Blacklist Check
        if is_token_blacklisted(token):
            logger.warning("Blacklisted token attempted access.")
            raise HTTPException(status_code=401, detail="Session expired. Please Login again.")
        
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")
