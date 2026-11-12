#!/bin/bash
echo "Stopping Credora server..."
PIDS=$(lsof -ti :8000 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "Killing processes on port 8000: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    echo "✓ Credora server stopped successfully."
else
    echo "✓ No running Credora process found on port 8000."
fi

