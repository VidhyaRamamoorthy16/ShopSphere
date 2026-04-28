#!/bin/bash
# ═══════════════════════════════════════════
# ShopSphere — Start All 5 Servers
# ═══════════════════════════════════════════

PROJECT="/Users/deekshith/VScode/Intelligent API project"
cd "$PROJECT"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   ShopSphere — Starting All Servers   ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Kill anything on our ports first
echo "Cleaning up old processes..."
for PORT in 8000 5001 3000 5173 3001; do
  PID=$(lsof -t -i:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    kill $PID 2>/dev/null
    echo "  Killed process on port $PORT"
  fi
done
sleep 2

# Fix .env files every time
echo "VITE_API_URL=http://localhost:5001
VITE_MONITOR_URL=http://localhost:3000" > "$PROJECT/frontend/.env"

echo "VITE_MONITOR_URL=http://localhost:3000
VITE_GATEWAY_URL=http://localhost:5001
VITE_BACKEND_URL=http://localhost:8000" > "$PROJECT/monitor-dashboard/.env"

echo ""
echo "[1/5] Starting Backend (port 8000)..."
cd "$PROJECT/backend"
node server.js > /tmp/backend.log 2>&1 &
sleep 3

echo "[2/5] Starting API Gateway (port 5001)..."
cd "$PROJECT/api-gateway"
python3 -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload > /tmp/gateway.log 2>&1 &
sleep 4

echo "[3/5] Starting Monitor API (port 3000)..."
cd "$PROJECT/monitor-api"
python3 -m uvicorn monitor_server:app --host 0.0.0.0 --port 3000 --reload > /tmp/monitor.log 2>&1 &
sleep 3

echo "[4/5] Starting Frontend (port 5173)..."
cd "$PROJECT/frontend"
npm run dev > /tmp/frontend.log 2>&1 &
sleep 4

echo "[5/5] Starting Monitor Dashboard (port 3001)..."
cd "$PROJECT/monitor-dashboard"
npm run dev -- --port 3001 > /tmp/dashboard.log 2>&1 &
sleep 4

echo ""
echo "Checking all servers..."
echo ""

# Check each server
check_server() {
  local name=$1
  local port=$2
  local path=$3
  if curl -s --max-time 3 "http://localhost:$port$path" > /dev/null 2>&1; then
    echo "  ✅ $name — http://localhost:$port"
  else
    echo "  ❌ $name — NOT RESPONDING (check /tmp/${name,,}.log)"
  fi
}

check_server "Backend"   8000 "/api/products"
check_server "Gateway"   5001 "/health"
check_server "Monitor"   3000 "/health"
check_server "Frontend"  5173 "/"
check_server "Dashboard" 3001 "/"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║           All Servers Ready!          ║"
echo "╠═══════════════════════════════════════╣"
echo "║ 🛒 Store:     http://localhost:5173   ║"
echo "║ 📊 Dashboard: http://localhost:3001   ║"
echo "║ ⚙️  Gateway:  http://localhost:5001   ║"
echo "║ 📡 Monitor:   http://localhost:3000   ║"
echo "║ 🔧 Backend:   http://localhost:8000   ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "Opening browser..."
open http://localhost:5173
sleep 1
open http://localhost:3001

echo ""
echo "Press Ctrl+C to stop watching. Servers keep running in background."
echo "To stop all servers run: bash stop-all.sh"
echo ""

# Show live logs
tail -f /tmp/backend.log /tmp/gateway.log /tmp/frontend.log
