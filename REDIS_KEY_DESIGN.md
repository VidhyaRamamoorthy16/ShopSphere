# Redis Key Design for Advanced Rate Limiting and Throttling
# Complete schema with TTLs and data types

## 1. FIXED WINDOW RATE LIMITING

### Key Pattern
```
fixed:{endpoint}:{identifier}:{window_timestamp}
```

### Examples
```
fixed:/api/auth/login:192.168.1.100:1704067200
fixed:/api/auth/register:192.168.1.100:1704060000
fixed:/api/products:192.168.1.100:1704067140
```

### Data Type
- **Type**: String (integer counter)
- **TTL**: Equal to window size (e.g., 900 seconds for 15-minute windows)

### Operations
- `INCR` - Increment request count
- `EXPIRE` - Set TTL on first creation
- `GET` - Get current count

### Example Values
```
"3"  # 3 requests in current window
```

---

## 2. SLIDING WINDOW RATE LIMITING

### Key Pattern
```
sliding:{endpoint}:{identifier}
```

### Examples
```
sliding:/api/products:192.168.1.100
sliding:/api/products/search:user123
sliding:/api/orders:user456
```

### Data Type
- **Type**: Sorted Set (ZSET)
- **Score**: Unix timestamp (float)
- **Member**: Timestamp as string (unique identifier)

### TTL
- **TTL**: Window size + 1 second buffer (e.g., 61 seconds for 1-minute windows)

### Operations
- `ZADD` - Add current request timestamp
- `ZREMRANGEBYSCORE` - Remove old entries outside window
- `ZCARD` - Count requests in current window
- `ZRANGE` - Get oldest request for reset time calculation

### Example Values
```
# Sorted set members with scores:
"1704067140.123" -> 1704067140.123
"1704067145.456" -> 1704067145.456
"1704067150.789" -> 1704067150.789
```

---

## 3. TOKEN BUCKET RATE LIMITING

### Key Pattern
```
bucket:{endpoint}:{identifier}
```

### Examples
```
bucket:/api/cart:user123
bucket:/api/cart:192.168.1.100
bucket:/api/orders:user456
```

### Data Type
- **Type**: Hash
- **Fields**: 
  - `tokens` (string/float) - Current token count
  - `last_refill` (string/float) - Last refill timestamp

### TTL
- **TTL**: 3600 seconds (1 hour) - prevents stale buckets

### Operations
- `HGETALL` - Get bucket state
- `HSET` - Update bucket state
- `EXPIRE` - Set TTL on creation/update

### Example Values
```
{
  "tokens": "15.5",
  "last_refill": "1704067140.123"
}
```

---

## 4. FAILURE TRACKING FOR THROTTLING

### Login Failures
#### Key Pattern
```
login_failures:{client_ip}
```

#### Examples
```
login_failures:192.168.1.100
login_failures:10.0.0.15
```

#### Data Type
- **Type**: String (integer counter)
- **TTL**: 1800 seconds (30 minutes)

#### Operations
- `INCR` - Increment failure count
- `GET` - Get current failure count
- `DEL` - Clear on successful login

#### Example Values
```
"3"  # 3 failed login attempts
```

---

## 5. DUPLICATE ORDER PREVENTION

### Key Pattern
```
duplicate_order:{user_id}
```

### Examples
```
duplicate_order:user123
duplicate_order:user456
```

### Data Type
- **Type**: String (cart hash)
- **TTL**: 10 seconds (duplicate prevention window)

### Operations
- `GET` - Check for existing cart hash
- `SETEX` - Set cart hash with TTL

### Example Values
```
"a1b2c3d4e5f6..."  # MD5 hash of cart contents
```

---

## 6. RATE LIMIT STATISTICS

### Request Tracking
#### Key Pattern
```
stats:requests:{date}:{hour}
```

#### Examples
```
stats:requests:2024-01-01:14
stats:requests:2024-01-01:15
```

#### Data Type
- **Type**: Hash
- **Fields**: Endpoint names
- **Values**: Request counts

#### TTL
- **TTL**: 30 days (2592000 seconds)

#### Example Values
```
{
  "/api/products": "1250",
  "/api/auth/login": "45",
  "/api/cart": "89",
  "/api/orders": "23"
}
```

---

## 7. USER SESSION TRACKING

### Active User Tracking
#### Key Pattern
```
active_users:{tier}:{timestamp}
```

#### Examples
```
active_users:user:1704067140
active_users:guest:1704067140
active_users:admin:1704067140
```

#### Data Type
- **Type**: Set
- **Members**: User IDs or IP addresses

#### TTL
- **TTL**: 300 seconds (5 minutes)

---

## 8. RATE LIMIT VIOLATIONS LOG

### Violation Tracking
#### Key Pattern
```
violations:{date}
```

#### Examples
```
violations:2024-01-01
violations:2024-01-02
```

#### Data Type
- **Type**: List
- **Values**: JSON strings of violation details

#### TTL
- **TTL**: 90 days (7776000 seconds)

#### Example Values
```
[
  "{\"timestamp\": \"2024-01-01T12:30:45Z\", \"ip\": \"192.168.1.100\", \"endpoint\": \"/api/auth/login\", \"reason\": \"rate_limit_exceeded\"}",
  "{\"timestamp\": \"2024-01-01T12:31:15Z\", \"ip\": \"10.0.0.15\", \"endpoint\": \"/api/products\", \"reason\": \"throttle_applied\"}"
]
```

---

## 9. RATE LIMIT CONFIGURATION CACHE

### Dynamic Configuration
#### Key Pattern
```
config:rate_limit:{endpoint}
```

#### Examples
```
config:rate_limit:/api/auth/login
config:rate_limit:/api/products
config:rate_limit:/api/cart
```

#### Data Type
- **Type**: Hash
- **Fields**: Configuration parameters

#### TTL
- **TTL**: No expiry (manual deletion)

#### Example Values
```
{
  "strategy": "fixed_window",
  "guest_limit": "5",
  "user_limit": "10",
  "window": "900",
  "throttle_enabled": "true"
}
```

---

## 10. PERFORMANCE MONITORING

### Redis Performance Metrics
#### Key Pattern
```
perf:redis:{hour}
```

#### Examples
```
perf:redis:2024-01-01-14
perf:redis:2024-01-01-15
```

#### Data Type
- **Type**: Hash
- **Fields**: Performance metrics

#### TTL
- **TTL**: 7 days (604800 seconds)

#### Example Values
```
{
  "operations": "15420",
  "avg_response_time": "0.005",
  "memory_used": "125MB",
  "connected_clients": "12"
}
```

---

## TTL SUMMARY

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `fixed:*` | Window size | Fixed window counters |
| `sliding:*` | Window + 1s | Sliding window timestamps |
| `bucket:*` | 3600s | Token bucket state |
| `login_failures:*` | 1800s | Login failure tracking |
| `duplicate_order:*` | 10s | Duplicate prevention |
| `stats:requests:*` | 2592000s | Request statistics |
| `active_users:*` | 300s | Active user tracking |
| `violations:*` | 7776000s | Violation logs |
| `config:rate_limit:*` | No expiry | Dynamic config |
| `perf:redis:*` | 604800s | Performance metrics |

## MEMORY USAGE ESTIMATES

### Per Active User/IP
- Fixed window: ~50 bytes
- Sliding window: ~100 bytes per request in window
- Token bucket: ~100 bytes
- Failure tracking: ~50 bytes

### Total Memory Estimate
- 10,000 active users: ~2-5 MB
- 100,000 active users: ~20-50 MB
- With 1M requests/hour: ~100-200 MB

## CLEANUP STRATEGIES

### Automatic Cleanup
- TTL-based expiration
- Sliding window auto-cleanup on each request

### Manual Cleanup
```bash
# Clean old statistics
redis-cli --eval cleanup_stats.lua

# Clean old violations
redis-cli --eval cleanup_violations.lua

# Memory optimization
redis-cli MEMORY PURGE
```

### Monitoring Memory Usage
```bash
# Check memory usage by pattern
redis-cli --scan --pattern "fixed:*" | xargs redis-cli MEMORY USAGE

# Check total memory
redis-cli INFO memory
```

This Redis key design provides efficient, scalable rate limiting with automatic cleanup and comprehensive monitoring capabilities.
