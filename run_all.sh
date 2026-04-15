#!/bin/bash
# Run all services manually without Docker

echo "🚀 Starting Intelligent API Gateway Services..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Start it with: brew services start redis"
    exit 1
fi

# Terminal 1: API Gateway (Port 5001)
echo "📡 Starting API Gateway on Port 5001..."
cd api-gateway
pip install -r requirements.txt > /dev/null 2>&1
python3 -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload &
GATEWAY_PID=$!
cd ..

# Terminal 2: Backend (Port 8000) 
echo "🔧 Starting Backend on Port 8000..."
cd backend
npm install > /dev/null 2>&1
npm start &
BACKEND_PID=$!
cd ..

# Terminal 3: Frontend (Port 5173)
echo "🎨 Starting Frontend on Port 5173..."
cd frontend
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
cd ..

# Terminal 4: Monitor API (Port 3000)
echo "📊 Starting Monitor API on Port 3000..."
cd monitor-api
pip install -r requirements.txt > /dev/null 2>&1
python3 monitor_server.py &
MONITOR_PID=$!
cd ..

# Terminal 5: Monitor Dashboard (Port 3001)
echo "📈 Starting Monitor Dashboard on Port 3001..."
cd monitor-dashboard
npm install > /dev/null 2>&1
npm run dev &
DASHBOARD_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "📍 Access Points:"
echo "   Gateway API:     http://localhost:5001"
echo "   Backend API:     http://localhost:8000"
echo "   Frontend UI:     http://localhost:5173"
echo "   Monitor API:     http://localhost:3000"
echo "   Monitor UI:      http://localhost:3001"
echo ""
echo "🔴 Press Ctrl+C to stop all services"

# Wait and cleanup
wait
kill $GATEWAY_PID $BACKEND_PID $FRONTEND_PID $MONITOR_PID $DASHBOARD_PID 2>/dev/null
