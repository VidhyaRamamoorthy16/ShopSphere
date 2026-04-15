# Intelligent API Gateway with Admin Control Panel
# Complete Setup and Deployment Instructions

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- Redis server (if not using Docker)
- Supabase account (for database)

## Step 1: Environment Configuration

1. Copy the template environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
```bash
# Required changes:
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
JWT_SECRET=generate_32_character_random_string
ADMIN_JWT_SECRET=generate_different_32_character_random_string

# Optional changes:
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=generate_bcrypt_hash_of_your_password
```

3. Generate secure secrets:
```bash
# Generate JWT secrets
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for ADMIN_JWT_SECRET

# Generate bcrypt hash for admin password
python3 -c "
import bcrypt
password = 'your_admin_password'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(hashed.decode('utf-8'))
"
```

## Step 2: Database Setup

1. Create Supabase tables:
```sql
-- Security logs table
CREATE TABLE security_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(20) NOT NULL,
    ip INET NOT NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    user_agent TEXT,
    threat_score FLOAT DEFAULT 0.0,
    rate_limit_tier VARCHAR(20),
    action_taken VARCHAR(20),
    response_time_ms INTEGER,
    user_id VARCHAR(100),
    request_id VARCHAR(100) UNIQUE,
    threat_type VARCHAR(50),
    fingerprint VARCHAR(100),
    headers JSONB,
    payload_size INTEGER DEFAULT 0,
    status_code INTEGER,
    error_message TEXT
);

-- Security alerts table
CREATE TABLE security_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    ip INET NOT NULL,
    threat_score FLOAT DEFAULT 0.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    alert_type VARCHAR(50) NOT NULL,
    action_taken VARCHAR(50),
    additional_data JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- Create indexes
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX idx_security_logs_ip ON security_logs(ip);
CREATE INDEX idx_security_logs_threat_score ON security_logs(threat_score);
CREATE INDEX idx_security_alerts_timestamp ON security_alerts(timestamp);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);
```

## Step 3: Docker Deployment

1. Build and start all services:
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

2. Initialize ML models:
```bash
# Train initial ML models
docker-compose exec api-gateway python train_model.py --samples 5000

# Verify models are created
docker-compose exec api-gateway ls -la models/
```

3. Check service health:
```bash
# Main gateway health
curl http://localhost:5001/health

# Admin panel health (local only)
curl http://127.0.0.1:3000/admin/health

# Backend health
curl http://localhost:8000/health
```

## Step 4: Admin Panel Access

### Local Development Access
```bash
# Direct access (if running locally)
http://localhost:3000

# Default credentials (change in production)
Username: admin
Password: admin123
```

### Remote Access via SSH Tunnel
```bash
# Create SSH tunnel from your local machine
ssh -L 3000:127.0.0.1:3000 user@your-server.com

# Then access in browser
http://localhost:3000
```

## Step 5: Local Development Setup

### Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### Admin Panel (React)
```bash
cd admin_frontend
npm install
npm run dev
```

### API Gateway (Python)
```bash
cd api-gateway
pip install -r requirements.txt
python admin_server.py  # For admin panel
python main.py          # For main gateway
```

## Step 6: Testing the System

### 1. Test Basic Gateway Functionality
```bash
# Test gateway forwarding
curl -H "Content-Type: application/json" \
     -d '{"test": "data"}' \
     http://localhost:5001/api/test

# Test rate limiting
for i in {1..100}; do
    curl http://localhost:5001/api/products
done
```

### 2. Test Security Features
```bash
# Test SQL injection detection
curl -X POST \
     -H "Content-Type: application/json" \
     -d "{'query': \"SELECT * FROM users;--\"}" \
     http://localhost:5001/api/search

# Test XSS detection
curl -X POST \
     -H "Content-Type: application/json" \
     -d "{'comment': \"<script>alert('xss')</script>\"}" \
     http://localhost:5001/api/comments
```

### 3. Test Admin Panel
1. Login to admin panel
2. Check dashboard metrics
3. Test rate limit configuration
4. Test IP banning/unbanning
5. Check ML model status
6. View security logs

## Step 7: Production Deployment

### Security Hardening
```bash
# 1. Change default admin password
# Edit .env and update ADMIN_PASSWORD

# 2. Generate new JWT secrets
# Edit .env and update JWT_SECRET and ADMIN_JWT_SECRET

# 3. Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 3000   # Block admin port externally
sudo ufw enable

# 4. Set up SSL certificates
sudo certbot --nginx -d your-domain.com
```

### Production Docker Compose
```bash
# Use production profile
docker-compose --profile production up -d

# This will include:
# - Nginx reverse proxy
# - SSL termination
# - Admin panel bound to localhost only
```

### Monitoring Setup
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/docker-containers

# Configure monitoring
# Add Prometheus/Grafana if needed
```

## Step 8: Maintenance

### Daily Tasks
```bash
# Check system health
curl http://127.0.0.1:3000/admin/system/health

# Review security alerts
# Check admin panel > Security Alerts

# Monitor logs
docker-compose logs -f --tail=100
```

### Weekly Tasks
```bash
# Retrain ML models with new data
docker-compose exec api-gateway python train_model.py --samples 10000

# Clean up old logs
docker-compose exec gateway_redis redis-cli --eval cleanup.lua

# Backup configuration
cp .env .env.backup.$(date +%Y%m%d)
```

### Monthly Tasks
```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Review and update security rules
# Check admin panel > Blocklist > Review bans

# Performance tuning
# Monitor metrics and adjust rate limits
```

## Troubleshooting

### Common Issues

1. **Admin panel not accessible**
   ```bash
   # Check if admin panel is running
   docker-compose ps admin-panel
   
   # Check logs
   docker-compose logs admin-panel
   
   # Verify port binding
   netstat -tulpn | grep 3000
   ```

2. **Rate limiting not working**
   ```bash
   # Check Redis connection
   docker-compose exec gateway_redis redis-cli ping
   
   # Check rate limiter logs
   docker-compose logs api-gateway | grep rate_limit
   ```

3. **ML model not loading**
   ```bash
   # Check if models exist
   docker-compose exec api-gateway ls -la models/
   
   # Retrain models
   docker-compose exec api-gateway python train_model.py
   ```

4. **High memory usage**
   ```bash
   # Check resource usage
   docker stats
   
   # Clean up Redis
   docker-compose exec gateway_redis redis-cli FLUSHDB
   ```

### Emergency Procedures

1. **System down**
   ```bash
   # Restart all services
   docker-compose restart
   
   # Check each service individually
   docker-compose restart api-gateway
   docker-compose restart admin-panel
   ```

2. **Admin locked out**
   ```bash
   # Clear admin sessions
   docker-compose exec gateway_redis redis-cli DEL admin:sessions:admin
   
   # Reset login attempts
   docker-compose exec gateway_redis redis-cli FLUSHDB
   ```

3. **Security breach**
   ```bash
   # Immediately ban suspicious IPs
   # Use admin panel or direct API calls
   
   # Rotate all secrets
   # Update JWT secrets in .env
   
   # Force logout all users
   docker-compose restart admin-panel
   ```

## Performance Optimization

### Rate Limiting Tuning
```bash
# Adjust based on traffic patterns
# Admin Panel > Rate Limits > Update tiers
```

### ML Model Optimization
```bash
# Retrain with more data
docker-compose exec api-gateway python train_model.py --samples 50000

# Adjust thresholds
# Admin Panel > ML Model > Update thresholds
```

### Redis Optimization
```bash
# Monitor Redis memory
docker-compose exec gateway_redis redis-cli INFO memory

# Configure maxmemory if needed
# Add to redis.conf: maxmemory 1gb
```

## Support and Monitoring

### Log Locations
- Gateway logs: `docker-compose logs api-gateway`
- Admin panel logs: `docker-compose logs admin-panel`
- Redis logs: `docker-compose logs redis`
- Backend logs: `docker-compose logs backend`

### Metrics Collection
- Admin panel provides real-time metrics
- Consider Prometheus for advanced monitoring
- Set up alerts for critical security events

### Backup Strategy
1. Daily Redis backup
2. Weekly configuration backup
3. Monthly full system backup
4. Store backups offsite

This completes the setup of your Intelligent API Gateway with isolated Admin Control Panel. The system is now ready for production use with comprehensive security monitoring and control capabilities.
