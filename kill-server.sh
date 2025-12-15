#!/bin/bash
# Kill any process using port 8000

PORT=8000

echo "Looking for processes on port $PORT..."

# Find PIDs using the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "No process found on port $PORT"
else
    echo "Found processes: $PIDS"
    echo "Killing processes..."
    kill -9 $PIDS 2>/dev/null
    echo "Done!"
fi
