import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Gateway Config
    GATEWAY_PORT: int = 5001 # 5001 to avoid macOS conflict
    GATEWAY_HOST: str = "0.0.0.0"
    
    # Backend Service
    BACKEND_URL: str = "http://localhost:8000"
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # JWT Configuration
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    
    # Security Rule thresholds
    RATE_LIMIT_MAX: int = 100 # 100 requests per minute
    BLACKLIST_TTL: int = 3600
    
    # ML Model Config
    RISK_THRESHOLD_HIGH: float = 80.0
    RISK_THRESHOLD_MEDIUM: float = 40.0
    THREAT_BLOCK_LIMIT: int = 10
    
    class Config:
        env_file = ".env"

settings = Settings()