#!/bin/bash
echo "Stopping all ShopSphere servers..."
for PORT in 8000 5001 3000 5173 3001; do
  PID=$(lsof -t -i:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    kill $PID 2>/dev/null
    echo "  ✅ Stopped port $PORT"
  fi
done
echo "All servers stopped."
