#!/bin/bash
PROJECT="$(cd "$(dirname "$0")" && pwd)"
# Startup script for all 5 services

echo "🚀 Starting Intelligent API Gateway Project..."
echo ""

# Kill any existing processes on the ports
echo "Cleaning up old processes..."
pkill -9 -f "uvicorn|node.*vite|python.*monitor" 2>/dev/null
sleep 2

# Check Redis
echo "Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "⚠️  Redis not running. Starting Redis..."
    redis-server --daemonize yes 2>/dev/null || brew services start redis 2>/dev/null || echo "Please start Redis manually"
    sleep 2
fi

echo ""
echo "Starting services..."
echo ""

# Service 1: API Gateway (Port 5001)
echo "📡 Starting API Gateway on Port 5001..."
cd "$PROJECT/api-gateway"
/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "Gateway PID: $GATEWAY_PID"

# Service 2: Backend (Port 8000)
echo "🔧 Starting Backend on Port 8000..."
cd "$PROJECT/backend"
npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Service 3: Frontend (Port 5173)
echo "🛒 Starting Frontend on Port 5173..."
cd "$PROJECT/frontend"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Service 4: Monitor API (Port 3000)
echo "📊 Starting Monitor API on Port 3000..."
cd "$PROJECT/monitor-api"
/usr/bin/python3 monitor_server.py > /tmp/monitor_api.log 2>&1 &
MONITOR_PID=$!
echo "Monitor API PID: $MONITOR_PID"

# Service 5: Monitor Dashboard (Port 3001)
echo "📈 Starting Monitor Dashboard on Port 3001..."
cd "$PROJECT/monitor-dashboard"
npm run dev > /tmp/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID"

echo ""
echo "⏳ Waiting 10 seconds for services to start..."
sleep 10

echo ""
echo "🔍 Checking service status..."
echo ""

# Check each service
check_service() {
    local port=$1
    local name=$2
    if curl -s http://localhost:$port/health > /dev/null 2>&1 || curl -s http://localhost:$port > /dev/null 2>&1; then
        echo "✅ $name (Port $port): RUNNING"
        return 0
    else
        echo "❌ $name (Port $port): NOT RESPONDING"
        return 1
    fi
}

check_service 5001 "API Gateway"
check_service 8000 "Backend"
check_service 5173 "Frontend"
check_service 3000 "Monitor API"
check_service 3001 "Monitor Dashboard"

echo ""
echo "📋 Log files:"
echo "  Gateway:     /tmp/gateway.log"
echo "  Backend:     /tmp/backend.log"
echo "  Frontend:    /tmp/frontend.log"
echo "  Monitor API: /tmp/monitor_api.log"
echo "  Dashboard:   /tmp/dashboard.log"
echo ""
echo "🌐 Access URLs:"
echo "  Frontend:          http://localhost:5173"
echo "  Monitor Dashboard: http://localhost:3001"
echo "  API Gateway:       http://localhost:5001"
echo "  Backend:           http://localhost:8000"
echo "  Monitor API:       http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
