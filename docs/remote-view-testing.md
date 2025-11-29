# Remote View Testing Guide

This guide explains how to test the Remote View feature, which allows you to view and control browser windows from your mobile device.

## Prerequisites

- Maestro desktop app running
- Mobile device on the same WiFi network as your computer
- Node.js installed

## Quick Start

### 1. Start the Development Servers

```bash
# From the maestro project root
MAESTRO_DEV_AUTH_BYPASS=true npm run dev:all
```

This starts:
- Electron app (desktop)
- Mobile web server on port 5174
- Remote API server on port 7777

The `MAESTRO_DEV_AUTH_BYPASS=true` flag bypasses device pairing for testing.

### 2. Get Your Computer's IP Address

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr "IPv4"
```

### 3. Open on Mobile

On your phone's browser (Safari or Chrome), navigate to:

```
http://<YOUR_IP>:5174/remote-view
```

Example: `http://192.168.1.46:5174/remote-view`

## Features to Test

### Space Selection
- Tap a space card to expand it
- View bookmarks within each space
- Tap a bookmark to open it in Remote View

### Open URL Directly
1. Tap the globe icon in the header
2. Enter a URL (e.g., `https://en.wikipedia.org`)
3. Tap "Open"

### Touch Gestures (while viewing)

| Gesture | Action |
|---------|--------|
| **Single tap** | Click |
| **Double tap** | Toggle zoom (1x ↔ 2x) |
| **Long press (500ms)** | Right-click |
| **Drag (when zoomed)** | Pan around |
| **Pinch** | Zoom (1x to 4x) |
| **Two-finger scroll** | Scroll the page |

### Quality Settings
- **480p** - Low bandwidth, faster
- **720p** - Balanced (default)
- **1080p** - High quality, more bandwidth

### Connection States
- **Live** (green dot) - Connected and streaming
- **Connecting** (amber dot) - Establishing WebRTC connection
- **Offline** (red dot) - Not connected to desktop

## Architecture Overview

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  Mobile Browser │◄──────────────────►│  Electron Main  │
│   (React PWA)   │     (port 7777)    │    Process      │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │ WebRTC                               │ IPC
         │ Video Stream                         │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│  simple-peer    │◄──────────────────►│  Shadow Browser │
│   (answerer)    │     Video/Data     │   (Frameless    │
└─────────────────┘                    │   BrowserWindow)│
                                       └─────────────────┘
```

### Key Components

| File | Purpose |
|------|---------|
| `src/mobile/screens/RemoteView.tsx` | Main mobile UI screen |
| `src/mobile/components/remote-view/RemoteViewer.tsx` | WebRTC video player |
| `src/mobile/components/remote-view/TouchOverlay.tsx` | Touch gesture handling |
| `src/mobile/components/remote-view/ViewerControls.tsx` | Quality/status controls |
| `src/ipc/shadow-browser.ts` | Creates hidden browser windows |
| `src/services/remote-server/websocket/handler.ts` | WebSocket message routing |
| `src/renderer/remote-view/index.ts` | Desktop-side WebRTC capture |

## Troubleshooting

### "Offline" Status
- Ensure both devices are on the same WiFi network
- Check that port 7777 isn't blocked by firewall
- Verify the desktop Maestro app is running

### Video Not Showing
- Check browser console for WebRTC errors
- Ensure screen recording permissions are granted on macOS
- Try a different quality setting

### Clicks Landing in Wrong Position
- This is usually an `object-fit: contain` coordinate mapping issue
- Check console logs for `[TouchOverlay] screenToVideo` debug output

### Connection Drops
- WebRTC connections may drop on network changes
- Tap "End" and reconnect if this happens

## Development Tips

### Debug Mobile on Desktop
Add `?debug=true` to skip API calls:
```
http://localhost:5174/remote-view?debug=true
```

### View Console Logs
The mobile app includes [Eruda](https://github.com/liriliri/eruda) for debugging:
- Tap the floating gear icon to open dev tools
- View console, network, and element inspector

### Test with Playwright
```bash
# The browser snapshot shows the mobile UI state
npx playwright test --ui
```

## Security Notes

- `MAESTRO_DEV_AUTH_BYPASS=true` should **only** be used for local development
- In production, devices must be paired via QR code
- WebSocket connections require valid auth tokens
- Video streams are peer-to-peer (no server relay)
