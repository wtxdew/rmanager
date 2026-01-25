# React Modern UI Rewrite

This is a complete frontend rewrite using React + TypeScript + Tailwind CSS with a modern, professional design.

## What's New

### Technology Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and builds
- **Tailwind CSS** for utility-first styling
- **Lucide React** for consistent icon set
- Modern component architecture

### Design Improvements
- Clean, professional Slate-based color scheme
- Modern sidebar navigation with active states
- Card-based layouts with subtle shadows
- Smooth transitions and hover effects
- Responsive grid layouts
- X/Twitter-style image crop modal with:
  - Full-screen black background
  - Drag to reposition image
  - Zoom slider with live preview
  - Semi-transparent overlay outside crop area
  - 3x3 grid overlay on crop box
  - Portrait orientation (351x468 crop box)

### Features Implemented
1. **Dashboard** - System stats with progress bars, device info, quick actions
2. **Suspend Screen Manager** - Upload, crop, and manage suspend screens with history
3. **File Manager** - Browse xochitl files with breadcrumb navigation
4. **Web Terminal** - SSH terminal with command history
5. **Backup & Restore** - Backup management with warnings and status

## Directory Structure

```
web-react/
├── src/
│   ├── App.tsx          # Main application with all components
│   ├── index.css        # Tailwind CSS imports
│   └── main.tsx         # React entry point
├── public/              # Static assets
├── package.json         # Dependencies
└── vite.config.ts       # Vite configuration
```

## Development

```bash
cd web-react
npm install
npm run dev
```

## Building for Production

```bash
npm run build
```

The built files will be in `web-react/dist/` and can be served by the Go backend.

## Integration with Go Backend

To integrate this React frontend with the existing Go backend:

1. Build the React app: `npm run build`
2. Update Go router to serve from `web-react/dist` instead of `web`
3. All API endpoints remain the same (`/api/*`)

## Current Status

✅ UI Components complete with mock data
✅ X-style crop editor with proper boundaries
✅ Responsive layout
✅ Modern professional design
🔄 API integration needed (currently uses mock data)
🔄 Real image upload/crop functionality
🔄 WebSocket terminal connection

## Next Steps

1. Connect components to real API endpoints
2. Implement file upload with real File API
3. Connect terminal to WebSocket
4. Add error handling and loading states
5. Add configuration for API base URL
