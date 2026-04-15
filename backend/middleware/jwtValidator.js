const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTValidator {
  constructor() {
    this.config = {
      ALGORITHM: 'HS256',
      ACCESS_TOKEN_LIFETIME: 900, // 15 minutes
      REFRESH_TOKEN_LIFETIME: 604800, // 7 days
      ISSUER: 'ecommerce-api',
      AUDIENCE: 'ecommerce-client',
      ACCESS_TOKEN_TYPE: 'access',
      REFRESH_TOKEN_TYPE: 'refresh',
      REQUIRED_CLAIMS: ['userId', 'email', 'role', 'type', 'iat', 'exp'],
      CLOCK_SKEW: 30,
      SECRET_VERSION: '1'
    };
    
    // Cache for validation performance
    this._blacklistCache = new Set();
    this._lastBlacklistUpdate = 0;
    this._blacklistTTL = 300; // 5 minutes
    
    // Rate limiting for token refresh
    this.refreshTokenLimiter = new Map();
  }

  getSecret(tokenType) {
    // Get the appropriate secret based on token type
    if (tokenType === this.config.REFRESH_TOKEN_TYPE) {
      return process.env.JWT_REFRESH_SECRET;
    }
    return process.env.JWT_SECRET;
  }

  validateToken(token, expectedType = null) {
    /**
     * Validate JWT token with comprehensive checks
     * @param {string} token - JWT token string
     * @param {string} expectedType - Expected token type (access/refresh)
     * @returns {Object} Decoded token payload
     * @throws {Error} If token is invalid
     */
    if (!token) {
      const error = new Error('Token required');
      error.status = 401;
      throw error;
    }

    try {
      // Remove "Bearer " prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      // Decode without verification first to get token type
      const unverifiedPayload = jwt.decode(token, { complete: false });
      const tokenType = unverifiedPayload?.type;

      // Validate token type
      if (expectedType && tokenType !== expectedType) {
        const error = new Error(`Expected ${expectedType} token, got ${tokenType}`);
        error.status = 401;
        throw error;
      }

      // Get appropriate secret
      const secret = this.getSecret(tokenType || 'access');

      // Decode with full verification
      const payload = jwt.verify(token, secret, {
        algorithms: [this.config.ALGORITHM],
        audience: this.config.AUDIENCE,
        issuer: this.config.ISSUER,
        clockTolerance: this.config.CLOCK_SKEW
      });

      // Additional payload validation
      this._validatePayload(payload, tokenType);

      // Check if token is blacklisted
      if (this._isTokenBlacklisted(token)) {
        const error = new Error('Token has been revoked');
        error.status = 401;
        throw error;
      }

      return payload;

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const expiredError = new Error('Token expired');
        expiredError.status = 401;
        throw expiredError;
      } else if (error.name === 'JsonWebTokenError') {
        console.warn(`Invalid token: ${error.message}`);
        const invalidError = new Error('Invalid token');
        invalidError.status = 401;
        throw invalidError;
      } else if (error.status) {
        throw error;
      } else {
        console.error(`Token validation error: ${error.message}`);
        const validationError = new Error('Token validation failed');
        validationError.status = 401;
        throw validationError;
      }
    }
  }

  _validatePayload(payload, tokenType) {
    // Check required claims
    for (const claim of this.config.REQUIRED_CLAIMS) {
      if (!(claim in payload)) {
        const error = new Error(`Missing required claim: ${claim}`);
        error.status = 401;
        throw error;
      }
    }

    // Validate token type
    if (tokenType && payload.type !== tokenType) {
      const error = new Error('Invalid token type');
      error.status = 401;
      throw error;
    }

    // Validate user ID format
    const userId = payload.userId;
    if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
      const error = new Error('Invalid user ID in token');
      error.status = 401;
      throw error;
    }

    // Validate email format
    const email = payload.email;
    if (email && !email.includes('@')) {
      const error = new Error('Invalid email in token');
      error.status = 401;
      throw error;
    }

    // Validate role
    const role = payload.role;
    const validRoles = ['user', 'admin'];
    if (role && !validRoles.includes(role)) {
      const error = new Error('Invalid role in token');
      error.status = 401;
      throw error;
    }
  }

  _isTokenBlacklisted(token) {
    // Check if token is blacklisted (revoked)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Update cache if needed
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - this._lastBlacklistUpdate > this._blacklistTTL) {
      this._updateBlacklistCache();
      this._lastBlacklistUpdate = currentTime;
    }

    return this._blacklistCache.has(tokenHash);
  }

  _updateBlacklistCache() {
    // Update blacklist cache from database or external source
    // This would typically fetch from Redis or database
    // For now, using empty set (no blacklisted tokens)
    this._blacklistCache.clear();
  }

  createToken(payload, tokenType = 'access') {
    /**
     * Create a new JWT token
     * @param {Object} payload - Token payload data
     * @param {string} tokenType - Type of token (access/refresh)
     * @returns {string} JWT token string
     */
    // Add standard claims
    const now = Math.floor(Date.now() / 1000);
    
    const lifetime = tokenType === 'access' 
      ? this.config.ACCESS_TOKEN_LIFETIME 
      : this.config.REFRESH_TOKEN_LIFETIME;

    const tokenPayload = {
      ...payload,
      type: tokenType,
      iat: now,
      exp: now + lifetime,
      iss: this.config.ISSUER,
      aud: this.config.AUDIENCE,
      version: this.config.SECRET_VERSION
    };

    // Get appropriate secret
    const secret = this.getSecret(tokenType);

    // Create token
    const token = jwt.sign(tokenPayload, secret, {
      algorithm: this.config.ALGORITHM
    });

    return token;
  }

  refreshAccessToken(refreshToken) {
    /**
     * Create new access token from refresh token
     * @param {string} refreshToken - Valid refresh token
     * @returns {string} New access token
     */
    // Validate refresh token
    const payload = this.validateToken(refreshToken, this.config.REFRESH_TOKEN_TYPE);

    // Create new access token with same user data
    const accessPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };

    return this.createToken(accessPayload, 'access');
  }

  revokeToken(token) {
    /**
     * Revoke a token by adding it to blacklist
     * @param {string} token - Token to revoke
     * @returns {boolean} True if revoked successfully
     */
    try {
      // Validate token first
      const payload = this.validateToken(token);

      // Add to blacklist
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      this._blacklistCache.add(tokenHash);

      // In production, persist to database/Redis
      console.log(`Token revoked for user ${payload.userId}`);
      return true;

    } catch (error) {
      console.error(`Failed to revoke token: ${error.message}`);
      return false;
    }
  }

  checkRefreshRateLimit(userId) {
    /**
     * Prevent token refresh abuse
     * @param {string} userId - User ID
     * @returns {boolean} True if rate limit allows refresh
     */
    const now = Math.floor(Date.now() / 1000);
    const userKey = String(userId);

    if (this.refreshTokenLimiter.has(userKey)) {
      const lastRefresh = this.refreshTokenLimiter.get(userKey);
      if (now - lastRefresh < 60) { // 1 minute cooldown
        return false;
      }
    }

    this.refreshTokenLimiter.set(userKey, now);
    return true;
  }
}

// Global validator instance
const jwtValidator = new JWTValidator();

// Express middleware for JWT validation
const validateJWTToken = (expectedType = null) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    try {
      const payload = jwtValidator.validateToken(authHeader, expectedType);

      // Add user info to request object
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      };

      next();
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(401).json({ error: 'Token validation failed' });
    }
  };
};

// Middleware for access tokens
const requireAccessToken = validateJWTToken('access');

// Middleware for refresh tokens
const requireRefreshToken = validateJWTToken('refresh');

// Middleware for admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = {
  JWTValidator,
  jwtValidator,
  validateJWTToken,
  requireAccessToken,
  requireRefreshToken,
  requireAdmin
};
