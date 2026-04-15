import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import bcrypt
import redis
from fastapi import HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import asyncio

logger = logging.getLogger("AdminAuth")

class AdminAuthManager:
    """Manages admin authentication, sessions, and security"""
    
    def __init__(self):
        self.admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        self.admin_password = os.getenv('ADMIN_PASSWORD', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5KS')
        self.jwt_secret = os.getenv('ADMIN_JWT_SECRET', secrets.token_urlsafe(32))
        self.jwt_expiry = int(os.getenv('ADMIN_JWT_EXPIRY', 900))  # 15 minutes
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        
        # Security settings
        self.max_login_attempts = 5
        self.lockout_duration = 1800  # 30 minutes
        self.session_timeout = 900  # 15 minutes
        self.max_sessions = 3  # Max concurrent admin sessions
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against bcrypt hash"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def create_access_token(self, username: str) -> tuple[str, str]:
        """Create JWT access token and refresh token"""
        now = datetime.utcnow()
        jti = secrets.token_urlsafe(16)
        
        # Access token payload
        access_payload = {
            "sub": username,
            "type": "admin_access",
            "iat": now,
            "exp": now + timedelta(seconds=self.jwt_expiry),
            "jti": jti
        }
        
        # Create access token
        access_token = jwt.encode(access_payload, self.jwt_secret, algorithm="HS256")
        
        # Create refresh token
        refresh_token = secrets.token_urlsafe(32)
        
        return access_token, refresh_token
    
    def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT access token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            
            # Check token type
            if payload.get("type") != "admin_access":
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check if token is blacklisted
            jti = payload.get("jti")
            if jti and self.redis_client.exists(f"admin:blacklist:{jti}"):
                raise jwt.InvalidTokenError("Token is blacklisted")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise jwt.InvalidTokenError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise jwt.InvalidTokenError(f"Invalid token: {str(e)}")
    
    async def create_refresh_session(self, refresh_token: str, username: str, ip: str) -> bool:
        """Create refresh token session"""
        try:
            session_key = f"admin:refresh:{refresh_token}"
            session_data = {
                "username": username,
                "ip": ip,
                "created_at": datetime.now().isoformat(),
                "last_used": datetime.now().isoformat(),
                "user_agent": ""  # Will be set by caller
            }
            
            # Store with 2x expiry of access token
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.setex, session_key, 
                self.jwt_expiry * 2, json.dumps(session_data)
            )
            
            # Track active sessions for this user
            user_sessions_key = f"admin:sessions:{username}"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lpush, user_sessions_key, refresh_token
            )
            
            # Limit number of active sessions
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.ltrim, user_sessions_key, 0, self.max_sessions - 1
            )
            
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.expire, user_sessions_key, self.jwt_expiry * 2
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error creating refresh session: {e}")
            return False
    
    async def validate_refresh_token(self, refresh_token: str, ip: str) -> Optional[Dict[str, Any]]:
        """Validate refresh token and return session data"""
        try:
            session_key = f"admin:refresh:{refresh_token}"
            session_data = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.get, session_key
            )
            
            if not session_data:
                return None
            
            session = json.loads(session_data)
            
            # Optional: Validate IP matches (comment out if IP can change)
            # if session.get("ip") != ip:
            #     logger.warning(f"Refresh token IP mismatch: {session.get('ip')} vs {ip}")
            #     return None
            
            # Update last used timestamp
            session["last_used"] = datetime.now().isoformat()
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.setex, session_key, 
                self.jwt_expiry * 2, json.dumps(session)
            )
            
            return session
            
        except Exception as e:
            logger.error(f"Error validating refresh token: {e}")
            return None
    
    async def revoke_refresh_token(self, refresh_token: str) -> bool:
        """Revoke a specific refresh token"""
        try:
            session_key = f"admin:refresh:{refresh_token}"
            session_data = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.get, session_key
            )
            
            if session_data:
                session = json.loads(session_data)
                username = session.get("username")
                
                # Remove from user's active sessions
                if username:
                    user_sessions_key = f"admin:sessions:{username}"
                    await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_client.lrem, user_sessions_key, 1, refresh_token
                    )
            
            # Delete the session
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.delete, session_key
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error revoking refresh token: {e}")
            return False
    
    async def blacklist_token(self, jti: str) -> bool:
        """Add token to blacklist until expiry"""
        try:
            blacklist_key = f"admin:blacklist:{jti}"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.setex, blacklist_key, self.jwt_expiry, "1"
            )
            return True
        except Exception as e:
            logger.error(f"Error blacklisting token: {e}")
            return False
    
    async def check_login_attempts(self, ip: str) -> tuple[bool, Optional[str]]:
        """Check if IP is locked due to failed login attempts"""
        try:
            attempts_key = f"admin:login_attempts:{ip}"
            attempts_data = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.get, attempts_key
            )
            
            if attempts_data:
                attempts = json.loads(attempts_data)
                if attempts["count"] >= self.max_login_attempts:
                    lock_until = datetime.fromisoformat(attempts["locked_until"])
                    if datetime.now() < lock_until:
                        remaining_time = int((lock_until - datetime.now()).total_seconds())
                        return False, f"Account locked. Try again in {remaining_time // 60} minutes."
                    else:
                        # Lock expired, remove it
                        await asyncio.get_event_loop().run_in_executor(
                            None, self.redis_client.delete, attempts_key
                        )
            
            return True, None
            
        except Exception as e:
            logger.error(f"Error checking login attempts: {e}")
            return True, None
    
    async def record_login_attempt(self, ip: str, success: bool, username: Optional[str] = None) -> bool:
        """Record login attempt for rate limiting"""
        try:
            attempts_key = f"admin:login_attempts:{ip}"
            
            if success:
                # Clear failed attempts on successful login
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.delete, attempts_key
                )
                
                # Log successful login
                await self.log_security_event(
                    "login_success", 
                    username=username or "unknown", 
                    ip=ip,
                    details={"action": "admin_login"}
                )
                
            else:
                # Increment failed attempts
                current_data = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.get, attempts_key
                )
                
                if current_data:
                    attempts = json.loads(current_data)
                    attempts["count"] += 1
                else:
                    attempts = {
                        "count": 1,
                        "first_attempt": datetime.now().isoformat(),
                        "ip": ip
                    }
                
                # Lock if max attempts reached
                if attempts["count"] >= self.max_login_attempts:
                    attempts["locked_until"] = (datetime.now() + timedelta(seconds=self.lockout_duration)).isoformat()
                
                # Store with TTL
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.setex, attempts_key, 
                    self.lockout_duration, json.dumps(attempts)
                )
                
                # Log failed attempt
                await self.log_security_event(
                    "login_failed", 
                    username=username or "unknown", 
                    ip=ip,
                    details={
                        "attempt_count": attempts["count"],
                        "locked": attempts["count"] >= self.max_login_attempts
                    }
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording login attempt: {e}")
            return False
    
    async def revoke_all_sessions(self, username: str) -> int:
        """Revoke all active sessions for a user"""
        try:
            user_sessions_key = f"admin:sessions:{username}"
            refresh_tokens = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lrange, user_sessions_key, 0, -1
            )
            
            revoked_count = 0
            for refresh_token in refresh_tokens:
                if await self.revoke_refresh_token(refresh_token):
                    revoked_count += 1
            
            # Delete the user sessions list
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.delete, user_sessions_key
            )
            
            await self.log_security_event(
                "all_sessions_revoked",
                username=username,
                details={"revoked_count": revoked_count}
            )
            
            return revoked_count
            
        except Exception as e:
            logger.error(f"Error revoking all sessions: {e}")
            return 0
    
    async def get_active_sessions(self, username: str) -> list:
        """Get active sessions for a user"""
        try:
            user_sessions_key = f"admin:sessions:{username}"
            refresh_tokens = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lrange, user_sessions_key, 0, -1
            )
            
            sessions = []
            for refresh_token in refresh_tokens:
                session_key = f"admin:refresh:{refresh_token}"
                session_data = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.get, session_key
                )
                
                if session_data:
                    session = json.loads(session_data)
                    sessions.append({
                        "refresh_token": refresh_token[:8] + "...",  # Partial token for display
                        "created_at": session.get("created_at"),
                        "last_used": session.get("last_used"),
                        "ip": session.get("ip")
                    })
            
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting active sessions: {e}")
            return []
    
    async def log_security_event(self, event_type: str, username: str, ip: str, details: Optional[Dict] = None):
        """Log security event for audit trail"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type,
                "username": username,
                "ip": ip,
                "details": details or {}
            }
            
            # Store in daily log
            log_key = f"admin:audit:{datetime.now().strftime('%Y%m%d')}"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lpush, log_key, json.dumps(log_entry)
            )
            
            # Set 30-day retention
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.expire, log_key, 30 * 24 * 3600
            )
            
            # Also store in recent events (last 100)
            recent_key = "admin:audit:recent"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lpush, recent_key, json.dumps(log_entry)
            )
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.ltrim, recent_key, 0, 99
            )
            
            logger.info(f"Security event logged: {event_type} by {username} from {ip}")
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    async def get_security_events(self, limit: int = 50, event_type: Optional[str] = None) -> list:
        """Get recent security events"""
        try:
            recent_key = "admin:audit:recent"
            events_data = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lrange, recent_key, 0, limit - 1
            )
            
            events = []
            for event_data in events_data:
                event = json.loads(event_data)
                if event_type is None or event.get("event_type") == event_type:
                    events.append(event)
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting security events: {e}")
            return []
    
    def get_session_timeout_warning_time(self) -> int:
        """Get time before session timeout warning (2 minutes before expiry)"""
        return max(60, self.jwt_expiry - 120)  # 2 minutes before expiry, minimum 1 minute

# Global auth manager instance
auth_manager = AdminAuthManager()

# FastAPI Security Bearer
security = HTTPBearer(auto_error=False)

async def get_current_admin(request: Request) -> Dict[str, Any]:
    """FastAPI dependency to get current admin from JWT"""
    credentials = await security(request)
    
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        payload = auth_manager.verify_access_token(credentials.credentials)
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def get_optional_admin(request: Request) -> Optional[Dict[str, Any]]:
    """Optional authentication - returns None if no valid token"""
    credentials = await security(request)
    
    if not credentials:
        return None
    
    try:
        payload = auth_manager.verify_access_token(credentials.credentials)
        return payload
    except Exception:
        return None

async def admin_required(request: Request) -> Dict[str, Any]:
    """Strict admin authentication - always required"""
    return await get_current_admin(request)

# Middleware for session timeout warning
async def add_session_timeout_warning(request: Request, call_next):
    """Add session timeout warning headers"""
    response = await call_next(request)
    
    # Add timeout warning header
    warning_time = auth_manager.get_session_timeout_warning_time()
    response.headers["X-Session-Timeout-Warning"] = str(warning_time)
    
    return response
