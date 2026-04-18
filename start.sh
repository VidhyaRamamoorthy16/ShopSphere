#!/bin/bash

# ————————————————————————————————————————
#  ShieldMart — Master Startup Script
#  Starts all 5 services in correct order
# ————————————————————————————————————————

PROJECT="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo ""
echo -e "${PURPLE}${BOLD}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}${BOLD}║         ShieldMart — Intelligent API Gateway        ║${NC}"
echo -e "${PURPLE}${BOLD}║              Master Startup Script                  ║${NC}"
echo -e "${PURPLE}${BOLD}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# —— Kill all old processes —————————
echo -e "${YELLOW}[1/8] Stopping old processes...${NC}"
pkill -9 -f "uvicorn.*5001" 2>/dev/null
pkill -9 -f "uvicorn.*3000" 2>/dev/null
pkill -9 -f "node server.js" 2>/dev/null
pkill -9 -f "vite.*5173" 2>/dev/null
pkill -9 -f "vite.*3001" 2>/dev/null
sleep 2
echo -e "${GREEN}  ✓ Old processes cleared${NC}"

# —— Check Redis ——————————————————
echo ""
echo -e "${YELLOW}[2/8] Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Redis already running${NC}"
else
  echo -e "  Starting Redis..."
  redis-server --daemonize yes --logfile /tmp/redis.log
  sleep 2
  if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Redis started${NC}"
  else
    echo -e "${RED}  ✗ Redis failed — install with: brew install redis${NC}"
    exit 1
  fi
fi

# —— Check ML model ———————————————
echo ""
echo -e "${YELLOW}[3/8] Checking ML model...${NC}"
if [ -f "$PROJECT/api-gateway/ml_model/threat_model.pkl" ]; then
  echo -e "${GREEN}  ✓ ML model found${NC}"
else
  echo -e "  Training ML model (first time only — ~30 seconds)..."
  cd "$PROJECT/api-gateway"
  python3 ml_model/train.py > /tmp/ml_train.log 2>&1
  if [ -f "$PROJECT/api-gateway/ml_model/threat_model.pkl" ]; then
    echo -e "${GREEN}  ✓ ML model trained successfully${NC}"
  else
    echo -e "${YELLOW}  ⚠ ML model training failed — gateway will use rule-based fallback${NC}"
    echo -e "  Check: cat /tmp/ml_train.log"
  fi
fi

# —— Helper: wait for port ——————————
wait_for_port() {
  local port=$1
  local name=$2
  local max=30
  local count=0
  while true; do
    if curl -s -m 1 "http://localhost:$port/health" > /dev/null 2>&1 || \
       curl -s -m 1 "http://localhost:$port" > /dev/null 2>&1; then
      echo -e "${GREEN}  ✓ $name is ready on port $port${NC}"
      return 0
    fi
    sleep 1
    count=$((count + 1))
    if [ $count -ge $max ]; then
      echo -e "${RED}  ✗ $name failed to start (timeout after ${max}s)${NC}"
      echo -e "  Check log: cat /tmp/${name// /_}.log"
      return 1
    fi
  done
}

# —— Start API Gateway ——————————————
echo ""
echo -e "${YELLOW}[4/8] Starting API Gateway (port 5001)...${NC}"
cd "$PROJECT/api-gateway"
python3 -m uvicorn main:app --host 0.0.0.0 --port 5001 > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
echo $GATEWAY_PID > /tmp/gateway.pid
wait_for_port 5001 "API Gateway"
GATEWAY_OK=$?

# —— Start Backend ————————————————
echo ""
echo -e "${YELLOW}[5/8] Starting Backend (port 8000)...${NC}"
cd "$PROJECT/backend"
node server.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid
wait_for_port 8000 "Backend"
BACKEND_OK=$?

# —— Start Monitor API —————————————
echo ""
echo -e "${YELLOW}[6/8] Starting Monitor API (port 3000)...${NC}"
cd "$PROJECT/monitor-api"
python3 -m uvicorn monitor_server:app --host 0.0.0.0 --port 3000 > /tmp/monitor_api.log 2>&1 &
MONITOR_PID=$!
echo $MONITOR_PID > /tmp/monitor_api.pid
wait_for_port 3000 "Monitor API"
MONITOR_OK=$?

# —— Start Frontend ———————————————
echo ""
echo -e "${YELLOW}[7/8] Starting Frontend (port 5173)...${NC}"
cd "$PROJECT/frontend"
npx vite --host 0.0.0.0 --port 5173 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid
sleep 8
if curl -s -m 2 "http://localhost:5173" > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Frontend is ready on port 5173${NC}"
else
  echo -e "${YELLOW}  ⚠ Frontend may still be loading — check http://localhost:5173${NC}"
fi

# —— Start Monitor Dashboard ——————————
echo ""
echo -e "${YELLOW}[8/8] Starting Monitor Dashboard (port 3001)...${NC}"
cd "$PROJECT/monitor-dashboard"
npx vite --host 0.0.0.0 --port 3001 > /tmp/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo $DASHBOARD_PID > /tmp/dashboard.pid
sleep 8
if curl -s -m 2 "http://localhost:3001" > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Monitor Dashboard is ready on port 3001${NC}"
else
  echo -e "${YELLOW}  ⚠ Dashboard may still be loading — check http://localhost:3001${NC}"
fi

# —— Fire test requests to populate Redis ———
echo ""
echo -e "${CYAN}Firing test requests to populate monitor data...${NC}"
sleep 2
for i in 1 2 3 4 5; do
  curl -s "http://localhost:5001/api/products" > /dev/null 2>&1
  curl -s "http://localhost:5001/api/categories" > /dev/null 2>&1
done
curl -s -X POST "http://localhost:5001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@shieldmart.com","password":"Demo@1234"}' > /dev/null 2>&1
echo -e "${GREEN}  ✓ Test requests fired — Redis populated${NC}"

# —— Connection verification ———————————
echo ""
echo -e "${CYAN}${BOLD}Running end-to-end connection verification...${NC}"
sleep 2

PASS=0
FAIL=0

verify() {
  local name=$1
  local cmd=$2
  local expect=$3
  result=$(eval "$cmd" 2>/dev/null)
  if echo "$result" | grep -q "$expect"; then
    echo -e "  ${GREEN}✓${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

# Gateway checks
verify "Gateway health" "curl -s http://localhost:5001/health" "working"
verify "Gateway Redis connected" "curl -s http://localhost:5001/health" "connected"
verify "Gateway Supabase connected" "curl -s http://localhost:5001/health" "supabase"
verify "ML model loaded" "curl -s http://localhost:5001/health" "ml_model"

# Backend checks
verify "Backend health" "curl -s http://localhost:8000/health" "Backend"
verify "Backend Supabase" "curl -s http://localhost:8000/health" "Supabase"

# Products from Supabase
verify "Products from Supabase" "curl -s http://localhost:5001/api/products" '"id"'
verify "Categories endpoint" "curl -s http://localhost:5001/api/categories" '"categories"'

# Security checks
verify "SQL injection blocked" \
  "curl -s -X POST http://localhost:5001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin OR 1=1--\",\"password\":\"x\"}'" \
  "blocked"
verify "XSS blocked" \
  "curl -s -X POST http://localhost:5001/api/reviews -H 'Content-Type: application/json' -d '{\"body\":\"<script>alert(1)</script>\"}'" \
  "blocked"

# Redis checks
verify "Redis has logged requests" "redis-cli LLEN gateway:requests" "[1-9]"
verify "Redis blocked list" "redis-cli LLEN gateway:blocked" "[0-9]"

# Monitor API checks
verify "Monitor API health" "curl -s http://localhost:3000/health" "working"
verify "Monitor overview real data" "curl -s http://localhost:3000/monitor/overview" '"total_requests"'
verify "Monitor live requests" "curl -s http://localhost:3000/monitor/requests/live" '"requests"'
verify "Monitor threats" "curl -s http://localhost:3000/monitor/threats/live" '"threats"'
verify "Monitor health check" "curl -s http://localhost:3000/monitor/health" '"services"'

# Frontend check
verify "Frontend responding" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5173" "200"

# Dashboard check
verify "Dashboard responding" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001" "200"

# —— Final status banner —————————————
echo ""
echo -e "${PURPLE}${BOLD}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}${BOLD}║                  All Services Status               ║${NC}"
echo -e "${PURPLE}${BOLD}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🛒  ${BOLD}E-commerce Frontend:${NC}    ${BLUE}http://localhost:5173${NC}"
echo -e "  📊  ${BOLD}Monitor Dashboard:${NC}      ${BLUE}http://localhost:3001${NC}"
echo -e "  📡  ${BOLD}API Gateway:${NC}            ${BLUE}http://localhost:5001/health${NC}"
echo -e "  �  ${BOLD}Backend API:${NC}            ${BLUE}http://localhost:8000/health${NC}"
echo -e "  📈  ${BOLD}Monitor API:${NC}            ${BLUE}http://localhost:3000/health${NC}"
echo -e "  �️   ${BOLD}Redis:${NC}                  ${BLUE}localhost:6379${NC}"
echo -e "  🌐  ${BOLD}Supabase:${NC}               ${BLUE}https://nqsejbhmuehpaalkhbsh.supabase.co${NC}"
echo ""
echo -e "  ${BOLD}Verification:${NC} ${GREEN}${PASS} passed${NC} | ${RED}${FAIL} failed${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✓ All systems connected and operational!${NC}"
else
  echo -e "  ${YELLOW}${BOLD}⚠ ${FAIL} check(s) failed — see details above${NC}"
fi

echo ""
echo -e "  ${CYAN}Logs:${NC}"
echo -e "  Gateway:    cat /tmp/gateway.log"
echo -e "  Backend:    cat /tmp/backend.log"
echo -e "  Monitor:    cat /tmp/monitor_api.log"
echo -e "  Frontend:   cat /tmp/frontend.log"
echo -e "  Dashboard:  cat /tmp/dashboard.log"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C or run bash stop.sh to stop all services${NC}"
echo ""

# —— Open browser tabs —————————————
sleep 1
open "http://localhost:5173" 2>/dev/null
open "http://localhost:3001" 2>/dev/null

# —— Keep running — Ctrl+C to stop —————
trap 'echo ""; echo "Stopping all services..."; bash "$PROJECT/stop.sh"; exit 0' INT TERM
wait
