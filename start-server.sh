#!/bin/bash
# Simple script to start the local development server

cd "$(dirname "$0")"

echo "Starting local server..."
echo "Server will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Try Python 3 first, fall back to Python 2
if command -v python3 &> /dev/null; then
    python3 server.py
elif command -v python &> /dev/null; then
    python server.py
else
    echo "Error: Python not found. Please install Python 3."
    exit 1
fi
