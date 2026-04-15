#!/bin/bash

SERVICE=${1:-gateway}
LINES=${2:-50}

case $SERVICE in
  gateway)  tail -n $LINES -f /tmp/gateway.log ;;
  backend)  tail -n $LINES -f /tmp/backend.log ;;
  monitor)  tail -n $LINES -f /tmp/monitor_api.log ;;
  frontend) tail -n $LINES -f /tmp/frontend.log ;;
  dashboard) tail -n $LINES -f /tmp/dashboard.log ;;
  redis)    tail -n $LINES -f /tmp/redis.log ;;
  all)
    echo "=== GATEWAY ===" && tail -n 10 /tmp/gateway.log
    echo "" && echo "=== BACKEND ===" && tail -n 10 /tmp/backend.log
    echo "" && echo "=== MONITOR API ===" && tail -n 10 /tmp/monitor_api.log
    echo "" && echo "=== FRONTEND ===" && tail -n 10 /tmp/frontend.log
    echo "" && echo "=== DASHBOARD ===" && tail -n 10 /tmp/dashboard.log
    ;;
  *)
    echo "Usage: bash logs.sh [gateway|backend|monitor|frontend|dashboard|redis|all]"
    ;;
esac
