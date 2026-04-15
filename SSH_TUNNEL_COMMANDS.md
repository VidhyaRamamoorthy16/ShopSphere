# SSH Tunnel Commands for Admin Panel Access

## Local Development Access
```bash
# If running on same machine, access directly
http://localhost:3000
```

## Remote Access via SSH Tunnel

### From Local Machine to Remote Server
```bash
# Forward local port 3000 to remote server's localhost:3000
ssh -L 3000:127.0.0.1:3000 user@your-server.com

# Then access in browser:
http://localhost:3000
```

### From Remote Server to Local Development
```bash
# Forward remote port 3000 to your local machine's port 3000
ssh -R 3000:127.0.0.1:3000 user@your-server.com

# Access on remote server via:
http://127.0.0.1:3000
```

### Persistent SSH Tunnel (with autossh)
```bash
# Install autossh first
sudo apt-get install autossh

# Create persistent tunnel
autossh -M 20000 -L 3000:127.0.0.1:3000 user@your-server.com -N -f

# Stop the tunnel
pkill -f "autossh.*3000"
```

## Production Deployment Security

### Docker Compose Production Config
```yaml
# In production docker-compose.yml, admin panel should be:
admin-panel:
  # ... other config
  ports:
    - "127.0.0.1:3000:3000"  # Bind to localhost only
  # OR completely remove ports section for internal-only access
```

### Nginx Configuration for Admin Access
```nginx
# Optional: Add to nginx.conf for restricted admin access
location /admin {
    # Allow only specific IPs
    allow 192.168.1.100;
    allow 10.0.0.0/8;
    deny all;
    
    # Proxy to admin panel
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Security Best Practices

### 1. Firewall Rules
```bash
# Allow SSH only from trusted IPs
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw deny 22

# Block direct access to admin port from external
sudo ufw deny 3000
```

### 2. SSH Key Authentication Only
```bash
# Disable password authentication in /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH service
sudo systemctl restart sshd
```

### 3. Fail2Ban for SSH Protection
```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure for SSH
sudo nano /etc/fail2ban/jail.local
```

## Monitoring Admin Access

### Log SSH Tunnels
```bash
# Monitor active SSH connections
who -u

# Check for established tunnels
sudo netstat -tulpn | grep :3000
```

### Admin Access Audit
```bash
# Check admin panel logs
docker logs admin_panel

# Monitor failed login attempts
docker logs admin_panel | grep "login_failed"
```

## Emergency Access Procedures

### If Admin Panel is Unreachable
1. Check SSH tunnel status: `ps aux | grep ssh`
2. Verify admin panel health: `curl http://127.0.0.1:3000/admin/health`
3. Check logs: `docker logs admin_panel`
4. Restart if needed: `docker restart admin_panel`

### Direct Server Access (Emergency Only)
```bash
# SSH directly to server and access admin panel locally
ssh user@your-server.com
curl http://127.0.0.1:3000/admin/health
```

## Multi-Admin Setup

### Create Additional Admin Users
```bash
# Add to .env file
ADMIN_USERNAME_2=security_admin
ADMIN_PASSWORD_2=$2b$12$...  # Different hashed password

# Update admin_server.py to support multiple admins
```

### Role-Based Access Control
```python
# Extend admin_auth.py with roles
class AdminRole(Enum):
    SUPER_ADMIN = "super_admin"
    SECURITY_ADMIN = "security_admin"
    VIEWER = "viewer"
```

## Backup and Recovery

### Backup Admin Configuration
```bash
# Backup Redis data (contains admin sessions, bans, etc.)
docker exec gateway_redis redis-cli BGSAVE
docker cp gateway_redis:/data/dump.sql ./redis_backup.sql

# Backup environment configuration
cp .env .env.backup
```

### Recovery Procedures
```bash
# Restore Redis data
docker cp ./redis_backup.sql gateway_redis:/data/dump.sql
docker restart gateway_redis

# Restore admin panel
docker-compose up -d admin-panel
```
