# React Frontend Migration

This document describes the migration from vanilla JavaScript to React.

## Summary

The frontend has been completely rewritten using React 18 + TypeScript + Tailwind CSS, replacing the previous vanilla JS + Pico CSS implementation.

## Changes

### Removed
- `web/` directory (vanilla JavaScript frontend)
  - Pico CSS-based UI
  - Vanilla JS modules (app.js, upload.js, filemanager.js, etc.)
  - Chart.js for monitoring

### Added
- `web-react/` directory (React frontend)
  - React 18 with TypeScript
  - Tailwind CSS v4 for styling
  - Lucide React for icons
  - Vite for build tooling

## New UI Features

### Modern Design
- Professional Slate-based color scheme
- Sidebar navigation with active states
- Card-based layouts with subtle shadows
- Smooth transitions and hover effects

### Components
1. **Dashboard** - System stats with progress bars, device info, quick actions
2. **Suspend Screen Manager** - Upload, crop, and manage suspend screens with history
3. **File Manager** - Browse xochitl files with breadcrumb navigation
4. **Web Terminal** - Mock SSH terminal with command history
5. **Backup & Restore** - Backup management with warnings and status

### X/Twitter-Style Image Crop Editor
- Full-screen black background
- Drag to reposition image
- Zoom slider with live preview
- Semi-transparent overlay outside crop area
- 3x3 grid overlay on crop box
- Portrait orientation (351x468 crop box)
- Rigorous boundary constraints

## Development

### Local Development
```bash
cd web-react
npm install
npm run dev
```

Server runs on http://localhost:5173 with hot reload.

### Production Build
```bash
cd web-react
npm run build
```

Built files go to `web-react/dist/` and are served by the Go backend.

### Deployment to Device
```bash
make deploy
```

This will:
1. Build React app (`npm run build`)
2. Build Go server (cross-compile for ARM64)
3. Transfer binary and React build files to device
4. Start server on device

## Integration with Go Backend

The Go router (`internal/router/router.go`) serves React build files from `web-react/dist/`:
- API routes are under `/api/*`
- All other routes fall back to `index.html` for SPA routing
- Static assets (JS, CSS) are served from `web-react/dist/assets/`

## Current Status

✅ UI Components complete with modern design
✅ X-style crop editor with proper boundaries
✅ Responsive layout
✅ Go backend integration
✅ SPA routing support

🔄 API integration needed (currently uses mock data)
🔄 Real image upload/crop functionality
🔄 WebSocket terminal connection
🔄 Error handling and loading states

## Next Steps

1. Connect React components to real API endpoints
2. Implement file upload with real File API
3. Connect terminal to WebSocket
4. Add error handling and loading states
5. Test on actual reMarkable device
