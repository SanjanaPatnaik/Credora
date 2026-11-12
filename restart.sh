#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================="
echo " Restarting Credora..."
echo "=========================================="

# 1. Stop any running process
./stop.sh

# 2. Re-build frontend if needed or start server
./start.sh

