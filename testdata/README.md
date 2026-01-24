# Test Data Directory

This directory is used for safe local development on Mac without affecting system files.

## Directory Structure
- `xochitl/` - Simulates reMarkable document storage directory
- `books/` - Simulates document symlink directory
- `screen/` - Simulates suspend screen storage directory

## Usage
```bash
# Run in development mode
DEV_MODE=true go run cmd/server/main.go

# Access in browser
open http://localhost:8080
```

## Important Notes
- Device-specific features (mount, systemctl, SSH) are disabled in development mode
- The application is designed specifically for reMarkable Paper Pro Linux environment
- Mac is only for compilation and basic UI/API testing
- Full functionality testing requires deployment to actual device
