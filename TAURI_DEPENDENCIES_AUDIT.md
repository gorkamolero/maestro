# Tauri Dependencies Audit

This document identifies all Tauri-specific code in the Maestro codebase to facilitate migration to Electron.

## Frontend Tauri API Usage

### 1. **Browser Component** (`src/components/Browser/`)

#### Files Affected:
- `BrowserPanel.tsx` (line 3)
- `useWebview.ts` (lines 2-4)

#### Tauri APIs Used:
```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
```

#### Commands Called:
- `create_browser_webview` - Creates child webview
- `close_browser_webview` - Destroys webview
- `update_webview_bounds` - Updates webview position/size
- `navigate_webview` - Navigates webview to URL
- `webview_go_back` - Browser back navigation
- `webview_go_forward` - Browser forward navigation

#### Events Listened:
- `webview-navigation` - Emitted when webview navigates to new URL

#### Electron Equivalent:
- `invoke` → `ipcRenderer.invoke()`
- `listen` → `ipcRenderer.on()`
- `getCurrentWindow` → Not needed (use BrowserView instead)
- Child webview → `BrowserView` API

---

### 2. **Terminal Component** (`src/components/Terminal/`)

#### Files Affected:
- `XTermWrapper.tsx` (line 8)

#### Tauri APIs Used:
```typescript
import { spawn } from 'tauri-pty';
```

#### Usage:
- PTY spawning and management
- Terminal I/O transport
- Resize handling
- Exit code handling

#### Electron Equivalent:
- `tauri-pty` → `node-pty`
- Same API surface (spawn, onData, write, resize, onExit)

---

### 3. **Resource Monitor** (`src/stores/`)

#### Files Affected:
- `metrics.store.ts` (lines 2-3)

#### Tauri APIs Used:
```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
```

#### Commands Called:
- `get_system_metrics` - Get overall system metrics
- `get_process_metrics` - Get metrics for specific process
- `track_segment_process` - Associate process with segment
- `untrack_segment` - Remove segment tracking
- `get_segment_metrics` - Get all metrics for a segment
- `kill_process` - Terminate a process
- `get_all_processes` - List all system processes

#### Events Listened:
- `system-metrics` - Emitted every 1 second with system metrics

#### Electron Equivalent:
- `invoke` → `ipcRenderer.invoke()`
- `listen` → `ipcRenderer.on()`

---

## Backend (Rust) → Electron Main Process

### 1. **Browser Module** (`src-tauri/src/browser.rs`)

#### Tauri-Specific Features:
- `WebviewBuilder` - Build child webviews
- `window.add_child()` - Attach child webview to window
- `webview.set_position()` / `webview.set_size()` - Position/resize webview
- `webview.navigate()` - Navigate to URL
- `webview.url()` - Get current URL
- `webview.eval()` - Execute JavaScript in webview
- `webview.close()` - Destroy webview
- `on_navigation` callback - Track navigation events
- `AppHandle.emit()` - Emit IPC events

#### Electron Equivalent:
```javascript
// Create BrowserView
const view = new BrowserView({ webPreferences: { ... } });
mainWindow.setBrowserView(view);
view.setBounds({ x, y, width, height });
view.webContents.loadURL(url);

// Navigation
view.webContents.goBack();
view.webContents.goForward();

// Events
view.webContents.on('did-navigate', (event, url) => {
  mainWindow.webContents.send('webview-navigation', { label, url });
});

// Cleanup
mainWindow.removeBrowserView(view);
view.webContents.destroy();
```

---

### 2. **Resource Monitor** (`src-tauri/src/monitor.rs`)

#### Rust Crates Used:
- `sysinfo` v0.30 - System metrics collection

#### Features:
- System RAM/CPU tracking
- Process enumeration
- Process metrics (PID, name, RAM, CPU)
- Process killing
- Segment-to-process association

#### Electron Equivalent:
```javascript
const si = require('systeminformation');

// System metrics
await si.mem(); // Memory
await si.currentLoad(); // CPU
await si.processes(); // Process list

// Process management
process.kill(pid); // Kill process (Node.js built-in)
```

NPM Package: `systeminformation`

---

### 3. **Terminal (PTY)** (`src-tauri/Cargo.toml`)

#### Rust Dependencies:
- `tauri-plugin-pty` v0.1.1 - PTY plugin for Tauri
- `portable-pty` v0.8 - PTY abstraction (unused, can remove)

#### Frontend Dependency:
- `tauri-pty` (NPM) - JavaScript bindings for tauri-plugin-pty

#### Electron Equivalent:
```javascript
const pty = require('node-pty');

const shell = pty.spawn(shell, args, {
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});

shell.onData((data) => { /* ... */ });
shell.write(data);
shell.resize(cols, rows);
shell.kill();
```

NPM Package: `node-pty`

---

## Tauri Command Summary

All commands registered in `src-tauri/src/lib.rs`:

### Browser Commands:
1. `create_browser_webview(window, label, url, x, y, width, height)`
2. `close_browser_webview(label)`
3. `update_webview_bounds(window, label, x, y, width, height)`
4. `navigate_webview(window, label, url)`
5. `webview_go_back(label)` → Returns new URL
6. `webview_go_forward(label)` → Returns new URL

### Resource Monitor Commands:
7. `get_system_metrics()` → SystemMetrics
8. `get_process_metrics(pid)` → ProcessMetrics | null
9. `track_segment_process(segment_id, pid)`
10. `untrack_segment(segment_id)`
11. `get_segment_metrics(segment_id)` → SegmentResourceMetrics | null
12. `kill_process(pid)`
13. `get_all_processes()` → ProcessMetrics[]

### Legacy Commands:
14. `greet(name)` - Demo command, can be removed

**Total: 14 commands** (13 to port, 1 to remove)

---

## Tauri Events Summary

### Events Emitted (Backend → Frontend):
1. `system-metrics` - System metrics update (every 1 second)
   - Payload: `SystemMetrics { total_ram, used_ram, total_cpu, process_count }`

2. `webview-navigation` - Webview navigated to new URL
   - Payload: `{ label: string, url: string }`

---

## Tauri Plugins Used

### 1. **tauri-plugin-opener** (v2)
- Purpose: Opens URLs/files with system default apps
- Usage: Unknown (not found in frontend code search)
- Electron Equivalent: `shell.openExternal(url)` or `shell.openPath(path)`

### 2. **tauri-plugin-shell** (v2)
- Purpose: Shell command execution
- Usage: Unknown (not found in frontend code search)
- Electron Equivalent: Node.js `child_process` module

### 3. **tauri-plugin-pty** (v0.1.1)
- Purpose: PTY (pseudoterminal) support
- Usage: Terminal component (XTermWrapper.tsx)
- Electron Equivalent: `node-pty`

---

## Configuration Files

### Files to Replace/Remove:
1. `tauri.conf.json` - Tauri configuration → Electron main.js
2. `src-tauri/Cargo.toml` - Rust dependencies → package.json
3. `src-tauri/capabilities/default.json` - Permissions → Not needed in Electron
4. `vite.config.ts` - Update build target from Tauri to Electron

### Files to Keep:
1. `package.json` - Update dependencies (remove @tauri-apps/*, add electron)
2. `tsconfig.json` - No changes needed
3. `tailwind.config.js` - No changes needed

---

## Dependency Replacement Matrix

| Tauri | Electron | Notes |
|-------|----------|-------|
| `@tauri-apps/api/core` (invoke) | `electron` (ipcRenderer.invoke) | IPC pattern same |
| `@tauri-apps/api/event` (listen) | `electron` (ipcRenderer.on) | Event pattern same |
| `@tauri-apps/api/window` | Not needed | Use BrowserView instead |
| `tauri-pty` (NPM) | `node-pty` | Similar API |
| `tauri-plugin-pty` (Rust) | N/A | Electron uses Node.js directly |
| `sysinfo` (Rust) | `systeminformation` (NPM) | Different API, needs wrapper |
| Tauri child webview | BrowserView | Different API, needs rewrite |
| Tauri commands (Rust) | IPC handlers (JS) | Rewrite in JavaScript/TypeScript |

---

## State Persistence (No Changes Needed)

The following already use browser-native APIs and will work unchanged:
- `valtio` - Proxy-based state management
- `valtio-persist` - IndexedDB persistence
- All stores: timeline.store.ts, segments.store.ts, spaces.store.ts, workspace.store.ts, browser.store.ts, metrics.store.ts

---

## Refactoring Strategy

### Phase 1: Create Abstraction Layer
Create a platform abstraction layer to decouple from Tauri:

```typescript
// src/lib/platform/index.ts
export interface IPlatformBridge {
  // IPC
  invoke<T>(command: string, args?: any): Promise<T>;
  listen<T>(event: string, handler: (payload: T) => void): Promise<() => void>;

  // Browser
  createBrowserView(options: BrowserViewOptions): Promise<string>;
  closeBrowserView(id: string): Promise<void>;
  // ... etc

  // Terminal
  spawnTerminal(shell: string, args: string[], options: TerminalOptions): Terminal;

  // Metrics
  getSystemMetrics(): Promise<SystemMetrics>;
  // ... etc
}

// src/lib/platform/tauri.ts
export class TauriBridge implements IPlatformBridge {
  async invoke<T>(command: string, args?: any): Promise<T> {
    return invoke(command, args);
  }
  // ... implement all methods
}

// src/lib/platform/electron.ts
export class ElectronBridge implements IPlatformBridge {
  async invoke<T>(command: string, args?: any): Promise<T> {
    return window.electron.invoke(command, args);
  }
  // ... implement all methods
}
```

### Phase 2: Update Components
Replace direct Tauri API calls with platform bridge:

```typescript
// Before
import { invoke } from '@tauri-apps/api/core';
await invoke('get_system_metrics');

// After
import { platform } from '@/lib/platform';
await platform.invoke('get_system_metrics');
```

### Phase 3: Implement Electron Backend
Rewrite Rust commands as JavaScript IPC handlers.

---

## Timeline Features (No Tauri Dependencies)

The following components have NO Tauri dependencies:
- Timeline canvas (React Flow)
- Segment nodes
- Track management
- NOW line
- Time controls
- Workspace layout
- Dock
- Sidebar
- All UI components (shadcn/ui)

**These can be used as-is in Electron!**

---

## Next Steps

1. ✅ **This document** - Identify all Tauri dependencies
2. 🔲 Create platform abstraction layer (`src/lib/platform/`)
3. 🔲 Refactor components to use abstraction layer
4. 🔲 Test with Tauri (ensure abstraction works)
5. 🔲 Move current code to `maestro-tauri/` folder
6. 🔲 Scaffold `maestro-electron/` project
7. 🔲 Implement ElectronBridge
8. 🔲 Port Rust commands to JavaScript
9. 🔲 Test with Electron
10. 🔲 Remove `maestro-tauri/` when migration complete

---

## Risk Assessment

### Low Risk (Easy to Port):
- ✅ Terminal (tauri-pty → node-pty, similar API)
- ✅ IPC commands (invoke → ipcRenderer.invoke)
- ✅ IPC events (listen → ipcRenderer.on)
- ✅ State persistence (no changes needed)
- ✅ UI components (no changes needed)

### Medium Risk (Different API):
- ⚠️ Resource Monitor (sysinfo → systeminformation, different API)
- ⚠️ Browser positioning (Tauri child webview → BrowserView, different lifecycle)

### High Risk (Significant Rewrite):
- ❌ Browser webview management (child webview vs BrowserView)
- ❌ Navigation event handling (on_navigation → did-navigate)
- ❌ Webview bounds updates (set_position → setBounds)

---

## Estimated Effort

| Component | Lines of Code | Effort | Notes |
|-----------|---------------|--------|-------|
| Platform abstraction | ~200 | 2-3 hours | Core infrastructure |
| Refactor components | ~300 | 3-4 hours | Replace direct API calls |
| Browser (Electron) | ~400 | 6-8 hours | BrowserView implementation |
| Terminal (Electron) | ~100 | 2-3 hours | node-pty integration |
| Metrics (Electron) | ~200 | 3-4 hours | systeminformation wrapper |
| IPC handlers (Electron) | ~300 | 4-5 hours | Rewrite Rust commands |
| Testing & debugging | N/A | 5-10 hours | Integration testing |

**Total Estimated: 25-35 hours**

---

## Success Criteria

Migration is complete when:
- [ ] All 13 Tauri commands replaced with Electron IPC handlers
- [ ] Browser webview works with BrowserView
- [ ] Terminal works with node-pty
- [ ] Resource monitor works with systeminformation
- [ ] All 2 Tauri events replaced with Electron events
- [ ] State persistence still works (IndexedDB)
- [ ] Timeline and workspace features unchanged
- [ ] Application builds and runs on macOS/Windows/Linux
- [ ] No `@tauri-apps/*` imports remain in frontend
- [ ] No Rust code in final build

---

**Document Created:** 2025-11-23
**Last Updated:** 2025-11-23
**Status:** ✅ Complete - Ready for refactoring phase
