import jwt
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from fastapi import HTTPException, Request
import logging
from config import settings

logger = logging.getLogger("JWTValidator")

class JWTValidator:
    def __init__(self):
        self.config = {
            "ALGORITHM": "HS256",
            "ACCESS_TOKEN_LIFETIME": 900,  # 15 minutes
            "REFRESH_TOKEN_LIFETIME": 604800,  # 7 days
            "ISSUER": "ecommerce-api",
            "AUDIENCE": "ecommerce-client",
            "ACCESS_TOKEN_TYPE": "access",
            "REFRESH_TOKEN_TYPE": "refresh",
            "REQUIRED_CLAIMS": ["userId", "email", "role", "type", "iat", "exp"],
            "CLOCK_SKEW": 30,
            "SECRET_VERSION": "1"
        }
        
        # Cache for validation performance
        self._blacklist_cache = set()
        self._last_blacklist_update = 0
        self._blacklist_ttl = 300  # 5 minutes
    
    def get_secret(self, token_type: str) -> str:
        """Get the appropriate secret based on token type"""
        if token_type == self.config["REFRESH_TOKEN_TYPE"]:
            return settings.JWT_REFRESH_SECRET
        return settings.JWT_SECRET
    
    def validate_token(self, token: str, expected_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate JWT token with comprehensive checks
        
        Args:
            token: JWT token string
            expected_type: Expected token type (access/refresh)
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid
        """
        if not token:
            raise HTTPException(status_code=401, detail="Token required")
        
        try:
            # Remove "Bearer " prefix if present
            if token.startswith("Bearer "):
                token = token[7:]
            
            # Decode without verification first to get token type
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            token_type = unverified_payload.get("type")
            
            # Validate token type
            if expected_type and token_type != expected_type:
                raise HTTPException(
                    status_code=401, 
                    detail=f"Expected {expected_type} token, got {token_type}"
                )
            
            # Get appropriate secret
            secret = self.get_secret(token_type or "access")
            
            # Decode with full verification
            payload = jwt.decode(
                token,
                secret,
                algorithms=[self.config["ALGORITHM"]],
                audience=self.config["AUDIENCE"],
                issuer=self.config["ISSUER"],
                options={
                    "require": self.config["REQUIRED_CLAIMS"],
                    "leeway": self.config["CLOCK_SKEW"]
                }
            )
            
            # Additional payload validation
            self._validate_payload(payload, token_type)
            
            # Check if token is blacklisted
            if self._is_token_blacklisted(token):
                raise HTTPException(status_code=401, detail="Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(status_code=401, detail="Token validation failed")
    
    def _validate_payload(self, payload: Dict[str, Any], token_type: Optional[str]) -> None:
        """Validate token payload structure"""
        # Check required claims
        for claim in self.config["REQUIRED_CLAIMS"]:
            if claim not in payload:
                raise HTTPException(status_code=401, detail=f"Missing required claim: {claim}")
        
        # Validate token type
        if token_type and payload.get("type") != token_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        # Validate user ID format
        user_id = payload.get("userId")
        if not user_id or not isinstance(user_id, (str, int)):
            raise HTTPException(status_code=401, detail="Invalid user ID in token")
        
        # Validate email format
        email = payload.get("email")
        if email and "@" not in email:
            raise HTTPException(status_code=401, detail="Invalid email in token")
        
        # Validate role
        role = payload.get("role")
        valid_roles = ["user", "admin"]
        if role and role not in valid_roles:
            raise HTTPException(status_code=401, detail="Invalid role in token")
    
    def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted (revoked)"""
        # Simple in-memory blacklist cache
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Update cache if needed
        current_time = time.time()
        if current_time - self._last_blacklist_update > self._blacklist_ttl:
            self._update_blacklist_cache()
            self._last_blacklist_update = current_time
        
        return token_hash in self._blacklist_cache
    
    def _update_blacklist_cache(self) -> None:
        """Update blacklist cache from database or external source"""
        # This would typically fetch from Redis or database
        # For now, using empty set (no blacklisted tokens)
        self._blacklist_cache = set()
    
    def create_token(self, payload: Dict[str, Any], token_type: str = "access") -> str:
        """
        Create a new JWT token
        
        Args:
            payload: Token payload data
            token_type: Type of token (access/refresh)
            
        Returns:
            JWT token string
        """
        # Add standard claims
        now = int(time.time())
        
        if token_type == "access":
            lifetime = self.config["ACCESS_TOKEN_LIFETIME"]
        else:
            lifetime = self.config["REFRESH_TOKEN_LIFETIME"]
        
        token_payload = {
            **payload,
            "type": token_type,
            "iat": now,
            "exp": now + lifetime,
            "iss": self.config["ISSUER"],
            "aud": self.config["AUDIENCE"],
            "version": self.config["SECRET_VERSION"]
        }
        
        # Get appropriate secret
        secret = self.get_secret(token_type)
        
        # Create token
        token = jwt.encode(
            token_payload,
            secret,
            algorithm=self.config["ALGORITHM"]
        )
        
        return token
    
    def refresh_access_token(self, refresh_token: str) -> str:
        """
        Create new access token from refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            New access token
        """
        # Validate refresh token
        payload = self.validate_token(refresh_token, self.config["REFRESH_TOKEN_TYPE"])
        
        # Create new access token with same user data
        access_payload = {
            "userId": payload["userId"],
            "email": payload["email"],
            "role": payload["role"]
        }
        
        return self.create_token(access_payload, "access")
    
    def revoke_token(self, token: str) -> bool:
        """
        Revoke a token by adding it to blacklist
        
        Args:
            token: Token to revoke
            
        Returns:
            True if revoked successfully
        """
        try:
            # Validate token first
            payload = self.validate_token(token)
            
            # Add to blacklist
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            self._blacklist_cache.add(token_hash)
            
            # In production, persist to database/Redis
            logger.info(f"Token revoked for user {payload.get('userId')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke token: {str(e)}")
            return False

# Global validator instance
jwt_validator = JWTValidator()

# Middleware function for FastAPI
async def validate_jwt_token(request: Request, expected_type: Optional[str] = None) -> Dict[str, Any]:
    """
    FastAPI dependency for JWT validation
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        payload = jwt_validator.validate_token(auth_header, expected_type)
        
        # Add user info to request state
        request.state.user_id = payload["userId"]
        request.state.user_email = payload["email"]
        request.state.user_role = payload["role"]
        
        return payload
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JWT validation middleware error: {str(e)}")
        raise HTTPException(status_code=401, detail="Token validation failed")

# Rate limiting for token refresh
refresh_token_limiter = {}

def check_refresh_rate_limit(user_id: str) -> bool:
    """Prevent token refresh abuse"""
    now = time.time()
    user_key = str(user_id)
    
    if user_key in refresh_token_limiter:
        last_refresh = refresh_token_limiter[user_key]
        if now - last_refresh < 60:  # 1 minute cooldown
            return False
    
    refresh_token_limiter[user_key] = now
    return True
