#!/bin/bash
# Development mode startup script for Mac

set -e

echo "[DEV] Starting reMarkable Manager in development mode"
echo "[DEV] Using local testdata directory"
echo ""

# Ensure test directories exist
mkdir -p testdata/{xochitl,books,screen}

# Check for test data
if [ ! -f "testdata/screen/suspended.png" ]; then
    echo "[WARN] testdata/screen/suspended.png not found"
    echo "[INFO] Creating placeholder..."
    # Create a simple 1x1 PNG placeholder
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > testdata/screen/suspended.png
fi

# Set environment variables
export DEV_MODE=true
export PORT=8080

echo "[OK] Environment configured"
echo "[INFO] Server will run on: http://localhost:8080"
echo "[WARN] Device-specific features (mount, systemctl, SSH) will be skipped"
echo ""

# Run server
go run cmd/server/main.go
