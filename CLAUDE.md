# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based configuration and management tool for the reMarkable Paper Pro (RMPP) e-ink tablet. The server runs directly on the RMPP device itself and provides a web interface accessible at `http://10.11.99.1:8080` for managing device features.

**Current Architecture**: Monolithic single-file application (main.go) with embedded frontend. This is intentionally kept simple for now and is expected to be refactored into a more modular structure.

## Build and Deployment Commands

### Standard Development Workflow
```bash
make deploy          # Build, transfer to device, and run (default target)
make build           # Cross-compile for arm64 Linux
make push            # Transfer binary to device (kills existing process first)
make run             # Deploy and start on device
make clean           # Remove local build artifacts
make terminate       # Kill running process on device and local SSH tunnels
```

### Build Configuration
- **Target Platform**: Linux arm64 (reMarkable Paper Pro)
- **Device IP**: 10.11.99.1
- **Remote Path**: /home/root/rm-server
- **Build Flags**: `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 -ldflags="-s -w"`

The Makefile automatically handles:
1. Killing existing remote processes
2. Cross-compiling the Go binary
3. Transferring via SCP
4. Starting the server in background

## System Architecture

### Backend Structure (main.go)

**Embedded Assets**: Frontend files are embedded at compile time using `//go:embed frontend/*`

**Critical Path Constants**:
- `screenPath = "/home/root/test/"` - Suspend screen location
- `BooksPath = "/home/root/books/"` - Symlink storage for uploaded documents
- `XochitlPath = "/home/root/test/xochitl"` - reMarkable's document database (currently pointing to test directory)

**API Endpoints**:
- `GET /api/status` - System info (uptime, storage, model)
- `POST /api/upload-suspend` - Replace suspend screen image
- `GET /api/current-suspend` - Retrieve current suspend screen PNG
- `POST /api/upload-doc` - Upload PDF/EPUB to xochitl database
- `POST /api/restart-xochitl` - Restart reMarkable UI (`systemctl restart xochitl`)
- `GET /api/ssh` - WebSocket-based terminal (uses xterm.js + gorilla/websocket + pty)

### Document Upload Flow

When uploading PDF/EPUB files:
1. Generate UUID for document ID
2. Save file as `{UUID}.pdf` or `{UUID}.epub` in XochitlPath
3. Create symlink in BooksPath for user convenience
4. Generate `.metadata` file with document metadata (name, timestamps, type)
5. Generate `.content` file with xochitl-specific metadata
6. For PDFs: Create `.cache/`, `.highlights/`, `.thumbnails/` directories
7. User must manually restart xochitl UI to see new documents

### Image Processing

Suspend screen images are:
1. Decoded from uploaded PNG/JPEG
2. Center-cropped to maintain 1620x2160 aspect ratio
3. Scaled using Catmull-Rom interpolation
4. Encoded as PNG to `/home/root/test/suspended.png`
5. Requires root filesystem remount (`mount -o remount,rw /`)

### WebSSH Implementation

The terminal uses:
- **Frontend**: xterm.js v5.1.0 (loaded from CDN)
- **Backend**: PTY with `/bin/sh -i`
- **Transport**: Binary WebSocket messages
- **Initial PTY size**: 24 rows × 80 cols (critical - 0x0 causes shell exit)
- **Environment**: `TERM=xterm-256color`, `HOME=/home/root`, `LC_ALL=en_US.UTF-8`

Lifecycle:
- Two goroutines handle bidirectional data flow (PTY↔WebSocket)
- Shell process receives SIGTERM when WebSocket closes
- Connection cleanup handled via done channel

## Frontend (frontend/index.html)

Single-page application with vanilla JavaScript:
- System status dashboard with real-time data
- Suspend screen preview (current vs. new)
- Document upload interface with progress feedback
- Embedded xterm.js terminal

**Key Dependencies**:
- xterm.js 5.1.0 (terminal emulator)
- Native browser APIs for file upload/preview

## Development Notes

### Filesystem Operations
- Root filesystem is read-only by default, requiring `mount -o remount,rw /` before writes
- Always remount as read-only after operations complete
- Test paths currently used (see path constants) - update for production deployment

### reMarkable Integration
- xochitl is the proprietary reMarkable UI application
- Metadata format must exactly match xochitl expectations
- Timestamps are Unix milliseconds (with "000" suffix in metadata)
- PDF documents require specific directory structure (.cache, .highlights, .thumbnails)
- EPUB files use simpler content structure

### Known Limitations
- No authentication/authorization
- Hardcoded device IP (10.11.99.1)
- Test directory paths instead of production paths
- No error recovery for failed uploads
- Terminal doesn't support window resize events
- No input validation on metadata fields
