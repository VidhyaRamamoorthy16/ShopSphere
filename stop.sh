#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${YELLOW}${BOLD}Stopping all ShieldMart services...${NC}"

pkill -f "uvicorn.*5001" 2>/dev/null && echo -e "${GREEN}  ✓ API Gateway stopped${NC}"
pkill -f "uvicorn.*3000" 2>/dev/null && echo -e "${GREEN}  ✓ Monitor API stopped${NC}"
pkill -f "node server.js" 2>/dev/null && echo -e "${GREEN}  ✓ Backend stopped${NC}"
pkill -f "vite.*5173" 2>/dev/null && echo -e "${GREEN}  ✓ Frontend stopped${NC}"
pkill -f "vite.*3001" 2>/dev/null && echo -e "${GREEN}  ✓ Dashboard stopped${NC}"

rm -f /tmp/gateway.pid /tmp/backend.pid /tmp/monitor_api.pid /tmp/frontend.pid /tmp/dashboard.pid

sleep 1
echo ""
echo -e "${GREEN}${BOLD}All services stopped.${NC}"
echo ""
