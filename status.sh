#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}ShieldMart — Service Status${NC}"
echo ""

check_service() {
  local name=$1
  local port=$2
  local url=$3
  result=$(curl -s -m 2 "$url" 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$result" ]; then
    echo -e "  ${GREEN}●${NC} ${BOLD}$name${NC} — ${BLUE}http://localhost:$port${NC} ${GREEN}ONLINE${NC}"
  else
    echo -e "  ${RED}●${NC} ${BOLD}$name${NC} — ${BLUE}http://localhost:$port${NC} ${RED}OFFLINE${NC}"
  fi
}

check_service "API Gateway     " 5001 "http://localhost:5001/health"
check_service "Backend API     " 8000 "http://localhost:8000/health"
check_service "Monitor API     " 3000 "http://localhost:3000/health"
check_service "Frontend        " 5173 "http://localhost:5173"
check_service "Dashboard       " 3001 "http://localhost:3001"

echo ""
echo -e "${BOLD}Redis:${NC}"
if redis-cli ping > /dev/null 2>&1; then
  KEYS=$(redis-cli LLEN gateway:requests 2>/dev/null)
  BLOCKED=$(redis-cli LLEN gateway:blocked 2>/dev/null)
  echo -e "  ${GREEN}●${NC} Redis ONLINE — ${KEYS} requests logged, ${BLOCKED} blocked"
else
  echo -e "  ${RED}●${NC} Redis OFFLINE"
fi

echo ""
echo -e "${BOLD}Gateway metrics:${NC}"
HEALTH=$(curl -s -m 2 http://localhost:5001/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
  ML_STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print('loaded' if d.get('ml_model',{}).get('loaded') else 'fallback')" 2>/dev/null)
  ML_ACC=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ml_model',{}).get('accuracy','—'))+'%')" 2>/dev/null)
  echo -e "  ML Model: ${ML_STATUS} (accuracy: ${ML_ACC})"
  TOTAL=$(redis-cli LLEN gateway:requests 2>/dev/null || echo 0)
  echo -e "  Requests logged: ${TOTAL}"
fi

echo ""
echo -e "${BOLD}Quick commands:${NC}"
echo -e "  ${YELLOW}bash start.sh${NC}   — start all services"
echo -e "  ${YELLOW}bash stop.sh${NC}    — stop all services"
echo -e "  ${YELLOW}bash status.sh${NC}  — show this status"
echo ""
