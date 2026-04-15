import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Gateway Config
    GATEWAY_PORT: int = 5001 # 5001 to avoid macOS conflict
    GATEWAY_HOST: str = "0.0.0.0"
    
    # Backend Service
    BACKEND_URL: str = "http://localhost:8000"
    
    # Security Rule thresholds
    RATE_LIMIT_MAX: int = 100 # 100 requests per minute
    
    class Config:
        env_file = ".env"

settings = Settings()
RISK_THRESHOLD_HIGH: float = 80.0
RISK_THRESHOLD_MEDIUM: float = 40.0
THREAT_BLOCK_LIMIT: int = 10