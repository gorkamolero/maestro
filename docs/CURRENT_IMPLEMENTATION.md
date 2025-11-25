# Maestro - Current Implementation

## Core Architecture

**Electron + Vite + React Stack**
- Electron 39.2.3 with Electron Forge build system
- React 19 + TypeScript + Vite dev server
- Main process: `src/main.ts` (creates BrowserWindow, registers IPC handlers)
- Preload: `src/preload.ts` (exposes `window.electron` and `window.pty` APIs)
- Renderer: `src/App.tsx` entry point (~9,670 lines of TypeScript)
- Build: Vite plugin architecture with separate configs for main/preload/renderer
- Packaging: ASAR bundling, makers for Squirrel/ZIP/Deb/RPM

**Security & Integration**
- Context isolation enabled, sandbox disabled (for node-pty)
- Node integration in preload for terminal functionality
- IPC bridge pattern for all main-renderer communication

## Workspace System

**Spaces (src/stores/spaces.store.ts)**
- Multi-space architecture (like browser profiles)
- Each space has: id, name, position, color, icon, segments, markers
- Actions: addSpace, removeSpace, updateSpace, reorderSpaces
- Persisted to IndexedDB via valtio-persist

**Tabs (src/stores/workspace.store.ts)**
- Unified tab system: `terminal | browser | note | agent | app-launcher`
- Tab properties: id, spaceId, type, title, status (active/idle/running)
- Favorites system: tabs with `isFavorite: true` flag
- Terminal state: buffer, workingDir, scrollPosition, theme (termius-dark/dracula/nord)
- App launcher config: connectedAppId, icon, color, launchConfig, savedState
- Actions: openTab, closeTab, setActiveTab, renameTab, toggleTabFavorite, moveTabToZone, reorderTabInZone

**Layout Management**
- Resizable sidebar (180-400px, default 200px)
- Fixed dock height (48px)
- Timeline height (20-50%, default 30%)
- View modes: timeline | workspace | split

**Drag & Drop (@dnd-kit)**
- Cross-zone dragging between favorites grid and tabs list
- `DraggableWorkspace.tsx`: Central DnD context with collision detection (pointerWithin + rectIntersection)
- `DraggableTab.tsx`: Sortable tab with @dnd-kit/sortable
- `TabDragGhost.tsx`: Dynamic ghost element (transforms grid ↔ list)
- `SortableGridTab.tsx`: Grid-style favorite items
- Real-time favorite status updates on zone change

## Tool Panels

**Terminal (src/components/Terminal/)**
- Full xterm.js integration with WebGL renderer
- PTY backend via node-pty in main process
- Features: WebLinks addon, search addon, fit addon
- Themes: termius-dark, dracula, nord
- State persistence: buffer, working directory, scroll position
- IPC channels: `pty-spawn`, `pty-write`, `pty-resize`, `pty-kill`, `pty-data-{id}`, `pty-exit-{id}`
- Components: TerminalPanel, XTermWrapper, TerminalHeader

**Browser (src/components/Browser/)**
- Native Electron BrowserView (not webview tag)
- Full navigation: back/forward/reload/home
- URL normalization and validation
- Navigation history tracking (entries + activeIndex)
- State persistence per tab in browser.store
- IPC channels: `create_browser_view`, `close_browser_view`, `update_browser_bounds`, `navigate_browser`, `browser_go_back`, `browser_go_forward`, `browser-navigation-updated`
- Components: BrowserPanel, BrowserToolbar, useWebview hook
- Race condition prevention for React StrictMode double-mounting

**Notes**
- Full markdown editor implementation (NoteEditor component)
- Note content persistence per tab
- Rich text editing support

**Agent**
- Placeholder for AI integration (AgentPlaceholder component)
- Type defined: `claude-code | codex | cursor`

## App Launcher

**Connected Apps System (src/stores/launcher.store.ts)**
- App registration via file picker (macOS .app bundles)
- Extracts: bundleId, name, path, icon (base64 PNG), capabilities
- Capabilities: urlScheme, applescriptable, fileAssociations
- Stored in-memory (Map) in main process, persisted via valtio in renderer

**macOS Integration (src/lib/macos-utils.ts)**
- App info extraction via Info.plist parsing (plist package)
- Icon conversion: ICNS → PNG (64x64) using macOS `sips` command
- Icon caching in userData directory
- Running app detection via get-windows package
- Launch methods:
  - App only (via `open` package)
  - With file (open file with app)
  - Deep link (URL scheme)
- Bring to front via AppleScript
- Window state capture (position, size, title)

**Launch Configuration**
- LaunchConfig: filePath, deepLink, launchMethod
- SavedState: windowPositions, lastAccessedAt, customData
- Running app polling every 2 seconds
- Visual indicators for running apps

**IPC Handlers (src/ipc/launcher.ts)**
- `launcher:register-app` - Extract app info and register
- `launcher:get-connected-apps` - List all registered apps
- `launcher:get-running-apps` - Query running apps
- `launcher:is-app-running` - Check specific app status
- `launcher:bring-to-front` - Activate app window
- `launcher:capture-window-state` - Get window bounds
- `launcher:pick-app` - Native file picker for .app
- `launcher:pick-file` - File picker with app's supported extensions
- `launcher:launch-app-only` - Launch without parameters
- `launcher:launch-with-file` - Launch with file
- `launcher:launch-deeplink` - Launch via URL scheme

## UI Components

**Workspace (src/components/Workspace/)**
- Sidebar: Favorites grid + tabs list + search + new tab buttons
- Dock: Space switcher (macOS dock style)
- FloatingControls: Quick action buttons
- SpaceEditor: Space settings modal
- DraggableTab: Tab item with status indicator, rename, close
- Tab Context Menu: Right-click menu with rename, duplicate, close, toggle favorite, move to space
- FavoritesGrid: Grid layout for favorite apps/tabs
- TabDropZone: Drop indicator for drag operations

**Command Palette (src/components/CommandPalette.tsx)**
- Cmd+K to open
- cmdk library integration
- Commands: New terminal/browser/note/space, launch apps, go to URL, duplicate tab
- Search: Tabs, spaces, apps by name
- Keyboard shortcuts displayed for each action
- Portal-based rendering (PortalWindow)

**Modals & Portals (Stack Browser Pattern)**
- View component: Yoga layout engine for flexbox-style positioning
- PortalWindow: React portal to Electron BrowserView
- Modal rendering above BrowserViews (solves z-index issue)
- Components: View.tsx, PortalWindow.tsx, modal-content.tsx
- IPC: portal.ts handles window.open() interception
- Timing fix: Polls for `__WEBCONTENTS_ID__` before sending bounds

**shadcn/ui Components**
- Badge, Button, Card, Carousel, Command, ContextMenu, Dialog, Dock
- DropdownMenu, EmojiPicker, Expandable, Input, Label, Popover
- ResizablePanel (custom with resize handle)
- Select, Separator, Slider, Switch, Tabs, Textarea, Tooltip
- Animate-ui: Toggle, ToggleGroup with highlight effects
- Motion-primitives: GlowEffect component

**Custom Hooks**
- useTabClick: Centralized tab/launcher click handler
- useViewBounds: Access Yoga layout bounds from context
- usePortalAnimation: Exit animation state for portals
- useWebview: All browser navigation logic

## State Management

**Valtio Stores (valtio + valtio-persist)**
- workspace.store: activeSpaceId, activeTabId, tabs[], layout, viewMode
- spaces.store: spaces[]
- launcher.store: connectedApps[], runningApps (Set), isAddModalOpen
- browser.store: browsers (Record<tabId, BrowserState>) with URL and history
- segments.store: activeSegments[], timelineSegments[]
- timeline.store: (legacy, kept for future features)

**Persistence Strategy**
- IndexedDB via valtio-persist with 1s debounce
- Omit UI-only state (isAddModalOpen, showTestPortal)
- Per-tab browser state (URL, history, navigation)
- Terminal state (buffer, working dir, scroll, theme)

**Reactivity**
- useSnapshot hook for reactive reads
- Direct mutations trigger re-renders
- Proxy-based change detection

## IPC Layer

**Terminal IPC (src/ipc/terminal.ts)**
- Spawn PTY processes in main (node-pty)
- Bidirectional data streaming
- Auto-generated PTY IDs (pty-0, pty-1, etc.)
- Process lifecycle management
- Forward data/exit events to renderer

**Browser IPC (src/ipc/browser.ts)**
- BrowserView creation and lifecycle
- Bounds management (x, y, width, height)
- Navigation control (loadURL, goBack, goForward)
- History API access
- Race condition guards for React StrictMode
- Navigation event forwarding (did-navigate, did-navigate-in-page)

**Launcher IPC (src/ipc/launcher.ts)**
- App registration and discovery
- Running app detection
- Launch orchestration
- Window management
- File/app pickers via dialog API
- In-memory app registry (Map)

**Portal IPC (src/ipc/portal.ts)**
- Intercepts window.open() via `-add-new-contents` event
- Creates BrowserView from intercepted WebContents
- Positions BrowserView from renderer bounds
- Sets top view with setTopBrowserView()
- Cleanup on WebContents destroyed
- `close_all_portals` handler for batch cleanup
- `portal-body-bounds` channel for positioning

## Platform Integration

**macOS Utilities (src/lib/macos-utils.ts)**
- Info.plist parsing for app metadata
- ICNS to PNG icon conversion (sips)
- App launching via `open` package
- AppleScript integration (bring to front)
- Running app detection (get-windows)
- Window state capture (bounds, title)
- Deep link handling

**Platform Abstraction (src/lib/platform/)**
- interface.ts: PlatformAPI type definitions
- electron.ts: Electron implementation
- tauri.ts: Legacy Tauri stubs (migration in progress)
- index.ts: Auto-detect platform (window.__TAURI__ vs window.electron)

**Dependencies**
- Platform: open@^11.0.0, plist@^3.1.0, active-win@^8.2.1, get-windows@^9.2.3
- Terminal: @xterm/xterm@^5.5.0, node-pty@^1.0.0, addons
- UI: React 19, @radix-ui components, lucide-react, motion@^12.23.24
- DnD: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Layout: yoga-layout@^3.2.1
- State: valtio@^2.2.0, valtio-persist@^2.2.4 with IndexedDB
- Build: Electron Forge 7.10.2, Vite 5.4.21

**Build System**
- Dev: `pnpm start` (electron-forge start)
- Package: `pnpm package`, `pnpm make`
- Main: TypeScript → Vite → CommonJS
- Preload: TypeScript → Vite → IIFE
- Renderer: React + Vite with HMR
- Forge makers: Squirrel (Windows), ZIP (macOS), Deb, RPM

**Configuration Files**
- forge.config.ts: Electron Forge build config
- vite.main.config.ts: Main process build
- vite.preload.config.ts: Preload script build
- vite.renderer.config.ts: Renderer with top-level-await, React plugin
- tsconfig.json: Strict TypeScript
- tailwind.config.js: Tailwind CSS 4 with Vite plugin
- components.json: shadcn/ui + 10 additional registries

## Key Patterns

**Stack Browser Pattern**
- Modals above BrowserViews using Yoga layout + portals
- Solves z-index issue where DOM elements can't appear above BrowserViews
- View calculates bounds, PortalWindow creates BrowserView at those bounds

**Unified Tab System**
- Single type for all content (terminal/browser/app/note/agent)
- No duplication between tabs and favorites
- Favorites are just tabs with `isFavorite: true`

**IPC Communication**
- Request-Response: `window.electron.invoke(channel, args)`
- Events: `window.electron.on(channel, callback)` with unsubscribe
- PTY Bridge: Main process spawns, renderer receives data streams
- Browser State: Per-tab persistence with navigation history

**Code Quality**
- ~9,670 lines of TypeScript
- No console.log statements (cleaned up)
- Strict TypeScript with full type coverage
- ESLint configured
- Component size kept under 250 lines (most under 200)
