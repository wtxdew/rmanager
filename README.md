# rManager

A web-based configuration and management tool for the reMarkable Paper Pro (RMPP) Move e-ink tablet. The server runs directly on the device and provides a modern, responsive web interface for managing features, files, and system settings.

## Features

- **Dashboard**: View real-time system statistics (CPU, RAM, Storage, Battery) and device information.
- **Suspend Screen Manager**: Upload, crop, and apply custom suspend screens. Features a responsive image cropper that handles aspect ratio adjustments automatically.
- **File Manager**: Browse the device filesystem, manage documents, and upload files.
- **Web Terminal**: Access a fully functional SSH terminal directly in your browser.
- **Backup & Restore**: Manage system backups and restore points.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast build tooling
- **Tailwind CSS** for modern, utility-first styling
- **Lucide React** for consistent iconography
- **xterm.js** for the web terminal

### Backend
- **Go** (Golang)
- **Single Static Binary**: Easier deployment with no external dependencies
- **Embedded Assets**: Frontend is embedded into the binary

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js & npm
- reMarkable Paper Pro (connected via USB/Network)

### Development

#### Frontend
The frontend is located in `web-react` and uses Vite.

```bash
cd web-react
npm install
npm run dev
```

#### Backend
The backend can be cross-compiled for the reMarkable (Linux ARM64).

```bash
make build
```

#### Local Testing
Run the application locally for development and testing.

```bash
make dev
```

### Deployment

Use the provided `makefile` to build the project, transfer it to the device, and run it.

```bash
# Build and deploy to device (requires SSH access at 10.11.99.1)
make deploy

# Or just build the binary
make build
```

## Project Structure

- `cmd/`: Application entry point.
- `internal/`: Core backend application logic.
    - `api/`: API route definitions.
    - `services/`: Business logic.
    - `models/`: Data structures.
- `web-react/`: Source code for the React frontend.
- `scripts/`: Helper scripts for development and testing.

## Acknowledgments

This project was heavily developed using **Antigravity**, an agentic AI coding assistant from Google DeepMind.


## Notes

- **Device Connection**: The tool assumes the reMarkable is accessible at `10.11.99.1`. Update the `makefile` if your IP differs.
- **Filesystem Access**: Some operations require writing to the root filesystem. The application handles remounting `rw` automatically where necessary.

---
*Disclaimer: This project is not affiliated with reMarkable 2. Use at your own risk.*
