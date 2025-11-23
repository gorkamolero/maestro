# Electron Migration Plan

**Date:** 2025-11-23
**Status:** 🚀 Ready to Execute

---

## Executive Summary

This document provides a step-by-step plan to migrate Maestro from Tauri to Electron. Thanks to the platform abstraction layer, **zero frontend changes** are required. All work is isolated to:
- Implementing `ElectronBridge` (~120 lines)
- Creating Electron main process (~300 lines)
- Creating preload script (~50 lines)

**Estimated Total Effort:** 15-20 hours

---

## Prerequisites (✅ Complete)

- [x] Platform abstraction layer created
- [x] All components refactored to use abstraction
- [x] Tauri implementation tested and working
- [x] Dependencies documented

---

## Migration Strategy

### Phase 1: Project Structure Setup (2-3 hours)
1. Move current code to `maestro-tauri/` (archive)
2. Create `maestro-electron/` folder structure
3. Copy frontend code (zero changes needed!)
4. Set up Electron build configuration

### Phase 2: Electron Backend Implementation (8-12 hours)
1. Implement main process
2. Implement preload script
3. Port 13 IPC handlers from Rust to JavaScript
4. Implement ElectronBridge
5. Set up BrowserView management
6. Integrate node-pty for terminal
7. Integrate systeminformation for metrics

### Phase 3: Testing & Validation (3-5 hours)
1. Test each feature individually
2. Integration testing
3. Performance validation
4. Bug fixes

### Phase 4: Cleanup (1 hour)
1. Remove Tauri dependencies
2. Update documentation
3. Final verification

---

## Detailed Implementation Plan

## PHASE 1: Project Structure Setup

### Step 1.1: Archive Tauri Implementation

```bash
# Create archive folder
mkdir maestro-tauri

# Move everything except node_modules and dist
mv src src-tauri public index.html vite.config.ts tsconfig.json \
   package.json pnpm-lock.yaml tailwind.config.js components.json \
   maestro-tauri/

# Keep docs and migration files in root
cp -r maestro-tauri/docs .
cp maestro-tauri/*.md .
```

### Step 1.2: Scaffold Electron Project

```bash
# Create Electron project structure
mkdir -p maestro-electron/{src,electron,public}

# Copy frontend code (NO CHANGES!)
cp -r maestro-tauri/src maestro-electron/
cp -r maestro-tauri/public maestro-electron/
cp maestro-tauri/index.html maestro-electron/
cp maestro-tauri/vite.config.ts maestro-electron/
cp maestro-tauri/tsconfig.json maestro-electron/
cp maestro-tauri/tailwind.config.js maestro-electron/
cp maestro-tauri/components.json maestro-electron/
```

### Step 1.3: Create Electron-Specific Files

#### `maestro-electron/package.json`
```json
{
  "name": "maestro-electron",
  "version": "0.1.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "tsc && vite build && electron-builder",
    "electron:dev": "electron .",
    "electron:build": "electron-builder"
  },
  "dependencies": {
    // Keep all existing frontend deps
    "@fontsource-variable/inter": "^5.2.8",
    // ... (all from Tauri package.json)

    // Remove Tauri deps, add Electron
    "electron": "^28.0.0",
    "node-pty": "^1.0.0",
    "systeminformation": "^5.21.0"
  },
  "devDependencies": {
    // Keep all existing
    "concurrently": "^8.2.2",
    "electron-builder": "^24.9.1"
  }
}
```

#### `maestro-electron/electron/main.js`
```javascript
const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');
const path = require('path');
const pty = require('node-pty');
const si = require('systeminformation');

// Main window reference
let mainWindow;

// BrowserView instances (keyed by label)
const browserViews = new Map();

// Terminal PTY instances
const terminals = new Map();

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:1420');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============================================================================
// IPC Handlers - Browser
// ============================================================================

ipcMain.handle('create_browser_view', async (event, options) => {
  const { label, url, x, y, width, height } = options;

  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setBrowserView(view);
  view.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
  view.webContents.loadURL(url);

  // Listen to navigation events
  view.webContents.on('did-navigate', (event, url) => {
    mainWindow.webContents.send('webview-navigation', { label, url });
  });

  browserViews.set(label, view);
  return label;
});

ipcMain.handle('close_browser_view', async (event, { label }) => {
  const view = browserViews.get(label);
  if (view) {
    mainWindow.removeBrowserView(view);
    view.webContents.destroy();
    browserViews.delete(label);
  }
});

ipcMain.handle('update_browser_bounds', async (event, { label, x, y, width, height }) => {
  const view = browserViews.get(label);
  if (view) {
    view.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
  }
});

ipcMain.handle('navigate_browser', async (event, { label, url }) => {
  const view = browserViews.get(label);
  if (view) {
    view.webContents.loadURL(url);
  }
});

ipcMain.handle('browser_go_back', async (event, { label }) => {
  const view = browserViews.get(label);
  if (view && view.webContents.canGoBack()) {
    view.webContents.goBack();
    // Wait a bit for navigation
    await new Promise(resolve => setTimeout(resolve, 100));
    return view.webContents.getURL();
  }
  return view?.webContents.getURL() || '';
});

ipcMain.handle('browser_go_forward', async (event, { label }) => {
  const view = browserViews.get(label);
  if (view && view.webContents.canGoForward()) {
    view.webContents.goForward();
    await new Promise(resolve => setTimeout(resolve, 100));
    return view.webContents.getURL();
  }
  return view?.webContents.getURL() || '';
});

// ============================================================================
// IPC Handlers - Terminal (node-pty)
// ============================================================================

// Terminal spawning will be handled in ElectronBridge
// We'll expose spawn_terminal as a synchronous API via preload

// ============================================================================
// IPC Handlers - Resource Monitor (systeminformation)
// ============================================================================

ipcMain.handle('get_system_metrics', async () => {
  const [mem, cpu, processes] = await Promise.all([
    si.mem(),
    si.currentLoad(),
    si.processes()
  ]);

  return {
    total_ram: Math.round(mem.total / 1024 / 1024), // MB
    used_ram: Math.round(mem.used / 1024 / 1024),
    total_cpu: cpu.currentLoad,
    process_count: processes.all
  };
});

ipcMain.handle('get_process_metrics', async (event, { pid }) => {
  const processes = await si.processes();
  const proc = processes.list.find(p => p.pid === pid);

  if (!proc) return null;

  return {
    pid: proc.pid,
    name: proc.name,
    ram: Math.round(proc.mem / 1024 / 1024),
    cpu: proc.cpu
  };
});

// Segment tracking (in-memory for now)
const segmentProcesses = new Map();

ipcMain.handle('track_segment_process', async (event, { segmentId, pid }) => {
  if (!segmentProcesses.has(segmentId)) {
    segmentProcesses.set(segmentId, []);
  }
  segmentProcesses.get(segmentId).push(pid);
});

ipcMain.handle('untrack_segment', async (event, { segmentId }) => {
  segmentProcesses.delete(segmentId);
});

ipcMain.handle('get_segment_metrics', async (event, { segmentId }) => {
  const pids = segmentProcesses.get(segmentId);
  if (!pids) return null;

  const processes = await si.processes();
  const metrics = pids
    .map(pid => processes.list.find(p => p.pid === pid))
    .filter(Boolean)
    .map(proc => ({
      pid: proc.pid,
      name: proc.name,
      ram: Math.round(proc.mem / 1024 / 1024),
      cpu: proc.cpu
    }));

  const totalRam = metrics.reduce((sum, m) => sum + m.ram, 0);
  const totalCpu = metrics.reduce((sum, m) => sum + m.cpu, 0);

  return {
    segment_id: segmentId,
    ram: totalRam,
    cpu: totalCpu,
    processes: metrics,
    last_updated: new Date().toISOString()
  };
});

ipcMain.handle('kill_process', async (event, { pid }) => {
  try {
    process.kill(pid);
  } catch (err) {
    throw new Error(`Failed to kill process ${pid}: ${err.message}`);
  }
});

ipcMain.handle('get_all_processes', async () => {
  const processes = await si.processes();
  return processes.list.map(proc => ({
    pid: proc.pid,
    name: proc.name,
    ram: Math.round(proc.mem / 1024 / 1024),
    cpu: proc.cpu
  }));
});

// ============================================================================
// System Metrics Polling
// ============================================================================

// Emit system metrics every 1 second
setInterval(async () => {
  if (mainWindow) {
    const metrics = await ipcMain.emit('get_system_metrics');
    mainWindow.webContents.send('system-metrics', metrics);
  }
}, 1000);
```

#### `maestro-electron/electron/preload.js`
```javascript
const { contextBridge, ipcRenderer } = require('electron');
const pty = require('node-pty');

// Expose protected methods via contextBridge
contextBridge.exposeInMainWorld('electron', {
  // IPC invoke
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),

  // IPC on (for events)
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  }
});

// Expose node-pty for terminal spawning
contextBridge.exposeInMainWorld('pty', {
  spawn: (shell, args, options) => {
    const ptyProcess = pty.spawn(shell, args, options);

    return {
      onData: (callback) => {
        ptyProcess.onData(callback);
      },
      write: (data) => {
        ptyProcess.write(data);
      },
      resize: (cols, rows) => {
        ptyProcess.resize(cols, rows);
      },
      onExit: (callback) => {
        ptyProcess.onExit(callback);
      },
      kill: () => {
        ptyProcess.kill();
      }
    };
  }
});
```

---

## PHASE 2: Implement ElectronBridge

Update `src/lib/platform/electron.ts`:

```typescript
export class ElectronBridge implements IPlatformBridge {
  // IPC
  async invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
    return (window as any).electron.invoke(command, args);
  }

  async listen<T = unknown>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
    const unsubscribe = (window as any).electron.on(event, handler);
    return () => unsubscribe();
  }

  // Browser
  async createBrowserView(options: BrowserViewOptions): Promise<string> {
    return this.invoke<string>('create_browser_view', options as unknown as Record<string, unknown>);
  }

  // ... (rest of methods already implemented)

  // Terminal - use node-pty from preload
  spawnTerminal(shell: string, args: string[], options: TerminalOptions): Terminal {
    return (window as any).pty.spawn(shell, args, options);
  }
}
```

---

## PHASE 3: Update Platform Detection

Update `src/lib/platform/index.ts`:

```typescript
function detectPlatform(): 'tauri' | 'electron' {
  if (typeof window !== 'undefined') {
    // Check for Electron first (we're migrating to this)
    if ((window as any).electron) {
      return 'electron';
    }

    // Fallback to Tauri
    if ((window as any).__TAURI_INTERNALS__) {
      return 'tauri';
    }
  }

  // Default to Electron after migration
  return 'electron';
}
```

---

## Migration Checklist

### Setup
- [ ] Move code to `maestro-tauri/`
- [ ] Create `maestro-electron/` structure
- [ ] Copy frontend code (unchanged)
- [ ] Create `electron/main.js`
- [ ] Create `electron/preload.js`
- [ ] Update `package.json` dependencies
- [ ] Install Electron deps: `pnpm add electron node-pty systeminformation`

### Implementation
- [ ] Implement 6 browser IPC handlers
- [ ] Implement 7 metrics IPC handlers
- [ ] Implement terminal integration (preload)
- [ ] Update `ElectronBridge` class
- [ ] Update platform detection
- [ ] Set up system metrics polling

### Testing
- [ ] Test browser view creation
- [ ] Test browser navigation (back/forward)
- [ ] Test terminal spawning
- [ ] Test metrics collection
- [ ] Test process killing
- [ ] Test all workspace features
- [ ] Test timeline (should work unchanged)

### Cleanup
- [ ] Remove `@tauri-apps/*` dependencies
- [ ] Remove `tauri-pty` dependency
- [ ] Remove `src-tauri/` references
- [ ] Update build scripts
- [ ] Update README
- [ ] Update CHANGELOG

---

## Dependency Changes

### Remove
```json
"@tauri-apps/api": "^2",
"@tauri-apps/plugin-opener": "^2",
"@tauri-apps/cli": "^2",
"tauri-pty": "^0.1.1"
```

### Add
```json
"electron": "^28.0.0",
"electron-builder": "^24.9.1",
"node-pty": "^1.0.0",
"systeminformation": "^5.21.0",
"concurrently": "^8.2.2"
```

---

## Command Mapping

| Tauri Command | Electron Handler | Status |
|---------------|------------------|---------|
| `create_browser_webview` | `create_browser_view` | 🔲 To Implement |
| `close_browser_webview` | `close_browser_view` | 🔲 To Implement |
| `update_webview_bounds` | `update_browser_bounds` | 🔲 To Implement |
| `navigate_webview` | `navigate_browser` | 🔲 To Implement |
| `webview_go_back` | `browser_go_back` | 🔲 To Implement |
| `webview_go_forward` | `browser_go_forward` | 🔲 To Implement |
| `get_system_metrics` | `get_system_metrics` | 🔲 To Implement |
| `get_process_metrics` | `get_process_metrics` | 🔲 To Implement |
| `track_segment_process` | `track_segment_process` | 🔲 To Implement |
| `untrack_segment` | `untrack_segment` | 🔲 To Implement |
| `get_segment_metrics` | `get_segment_metrics` | 🔲 To Implement |
| `kill_process` | `kill_process` | 🔲 To Implement |
| `get_all_processes` | `get_all_processes` | 🔲 To Implement |

---

## Risk Mitigation

### High Priority
- **BrowserView positioning**: Electron's BrowserView has different coordinate system than Tauri child webview
  - **Solution**: Test thoroughly on macOS, may need offset adjustments

- **PTY compatibility**: node-pty vs tauri-pty API differences
  - **Solution**: APIs are very similar, wrapper in preload handles it

### Medium Priority
- **Performance**: JavaScript vs Rust for metrics collection
  - **Solution**: systeminformation is well-optimized, performance should be fine

### Low Priority
- **Package size**: Electron bundles are larger than Tauri
  - **Acceptable**: Trade-off for faster development iteration

---

## Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | 2-3 hours | Project structure setup |
| Phase 2 | 8-12 hours | Backend implementation |
| Phase 3 | 3-5 hours | Testing & validation |
| Phase 4 | 1 hour | Cleanup |
| **Total** | **15-20 hours** | Complete migration |

---

## Success Criteria

Migration is complete when:
- [ ] All features work in Electron
- [ ] No Tauri dependencies remain
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Performance is acceptable
- [ ] App builds successfully
- [ ] Documentation updated

---

## Next Steps

1. **Execute Phase 1**: Move code and set up Electron structure
2. **Execute Phase 2**: Implement Electron backend
3. **Execute Phase 3**: Test everything
4. **Execute Phase 4**: Clean up and document

**Ready to begin! 🚀**

---

**Document Created:** 2025-11-23
**Status:** Ready for execution
**Author:** Claude Code
