#!/bin/bash

echo "Resetting ShieldMart data..."

# Clear Redis
redis-cli FLUSHDB > /dev/null 2>&1
echo "✓ Redis cleared"

# Clear log files
> /tmp/gateway.log
> /tmp/backend.log
> /tmp/monitor_api.log
> /tmp/frontend.log
> /tmp/dashboard.log
echo "✓ Logs cleared"

echo ""
echo "Reset complete. Run: bash start.sh"
