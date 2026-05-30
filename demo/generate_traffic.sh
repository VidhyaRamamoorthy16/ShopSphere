#!/bin/bash
# ════════════════════════════════════════════════
# ShopSphere — Traffic Generator for Live Demo
# Run this to populate the monitor dashboard
# ════════════════════════════════════════════════

GATEWAY="https://shopsphere-gateway.onrender.com"
echo "Generating traffic through ShopSphere gateway..."
echo "Dashboard: https://shopsphere-monitor.vercel.app"
echo ""

# Normal requests
echo "Sending normal requests..."
for i in {1..15}; do
  curl -s "$GATEWAY/api/products"          > /dev/null && echo "  ✅ Products request $i"
  curl -s "$GATEWAY/api/products?category=Electronics" > /dev/null
  curl -s "$GATEWAY/health"               > /dev/null
  sleep 0.5
done

# SQL Injection attempts (will be blocked)
echo ""
echo "Sending attack simulations (will be blocked by ML)..."
curl -s -X POST "$GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'"'"' OR '"'"'1'"'"'='"'"'1","password":"x"}' > /dev/null
echo "  🚫 SQL Injection blocked"

curl -s "$GATEWAY/api/products?id=1 UNION SELECT * FROM users" > /dev/null
echo "  🚫 SQL Injection blocked"

curl -s "$GATEWAY/api/products?search=<script>alert(1)</script>" > /dev/null
echo "  🚫 XSS blocked"

curl -s "$GATEWAY/api/products?file=../../etc/passwd" > /dev/null
echo "  🚫 Path Traversal blocked"

echo ""
echo "Done! Check dashboard in 10 seconds:"
echo "  https://shopsphere-monitor.vercel.app"

# Check overview
echo ""
echo "Current stats:"
curl -s "$GATEWAY/../monitor/overview" 2>/dev/null \
  | python3 -m json.tool 2>/dev/null \
  || curl -s "https://shopsphere-monitor.onrender.com/monitor/overview" \
  | python3 -m json.tool
