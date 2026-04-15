# Shared JWT Configuration
# This file should be identical in both Python and Node.js environments

JWT_CONFIG = {
    # Algorithm - must be the same everywhere
    "ALGORITHM": "HS256",
    
    # Token lifetimes
    "ACCESS_TOKEN_LIFETIME": 900,  # 15 minutes in seconds
    "REFRESH_TOKEN_LIFETIME": 604800,  # 7 days in seconds
    
    # Issuer and audience for validation
    "ISSUER": "ecommerce-api",
    "AUDIENCE": "ecommerce-client",
    
    # Token type claims
    "ACCESS_TOKEN_TYPE": "access",
    "REFRESH_TOKEN_TYPE": "refresh",
    
    # Required claims
    "REQUIRED_CLAIMS": ["userId", "email", "role", "type", "iat", "exp"],
    
    # Clock skew tolerance (seconds)
    "CLOCK_SKEW": 30,
    
    # Version for secret rotation
    "SECRET_VERSION": "1"
}

# Environment variable mapping
ENV_SECRETS = {
    "JWT_SECRET": "JWT_SECRET",
    "JWT_REFRESH_SECRET": "JWT_REFRESH_SECRET"
}
