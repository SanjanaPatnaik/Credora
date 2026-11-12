#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting Credora — AI Vendor Onboarding & Verification"
echo "=========================================================="

export PATH="$DIR/tools/node/bin:$PATH"

# Check if port 8000 is already in use and free it
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8000 is currently occupied. Freeing port 8000..."
    kill -9 $(lsof -Pi :8000 -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 1
fi

# Check Python virtualenv
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -q fastapi uvicorn python-multipart pymupdf rapidfuzz jinja2 httpx pydantic
fi

# Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
    echo "Building React frontend..."
    cd frontend
    npm install --silent
    npm run build
    cd ..
fi

echo ""
echo "🚀 Credora is ready! Opening at: http://127.0.0.1:8000"
echo "   (Frontend UI & FastAPI endpoints served together)"
echo "   Press Ctrl+C to stop."
echo "=========================================================="

./venv/bin/uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
