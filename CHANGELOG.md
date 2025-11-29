# Maestro Changelog

All notable changes to Maestro will be documented in this file.

## [Unreleased]

### Added

#### Mobile Space Card Redesign (2025-11-29)
- **Desktop-Matching Tab Row**: Replicated desktop tabs functionality on mobile.
  - Removed useless "Terminal / Open" footer (can't use terminal on phone).
  - Added TabsRow component at top of each space card.
  - Tab icons with tap-to-show popover.
  - "Open on Desktop" button sends WebSocket message to focus tab on desktop.
- **Add Tab Popover**: Plus button shows menu to add tabs remotely.
  - Browser, Terminal, Notes, Tasks options.
  - Shows "Not connected to desktop" warning when disconnected.
  - Positioned directly below the button for better UX.
- **Mobile Dev Documentation**: Added mobile development section to CLAUDE.md.
  - Instructions for testing on actual mobile devices.
  - Local IP address usage for WiFi testing.

#### Mobile Dev Experience (2025-11-29)
- **Auth Bypass**: Added `MAESTRO_DEV_AUTH_BYPASS` environment variable support.
  - Allows skipping PIN pairing in development.
  - Integrated into `dev:all` script.
- **Smart Connection Retry**: Mobile app now polls for server health on startup.
  - Waits up to 20 seconds for desktop server to become available.
  - Eliminates race condition where mobile app loads before server.

#### Mobile Spaces Extension (2025-11-29)
- **Full Spaces Experience on Mobile**: Replicated desktop Space cards and panes on mobile.
  - **4 View Modes**: Grid cards, compact list, Andy Matuschak-style stacked panes, horizontal carousel.
  - **Space Cards**: What's Next bubble, task preview, notes preview, activity indicators, tab icons.
  - **Pane View**: Swipe navigation between spaces, collapsible spines with vertical labels.
  - **Zed/Telegram Aesthetic**: Deep slate backgrounds, electric blue accents, subtle animations.
- **Task Management from Mobile**:
  - Create tasks with inline input in pane view.
  - Toggle task completion with space-colored checkboxes.
  - Delete tasks with swipe-to-delete gesture.
  - All changes sync back to desktop via IPC.
- **Space Editing from Mobile**:
  - Edit space name, "What's Next", and color via bottom sheet.
  - 10 color options with live preview.
- **Tab Management from Mobile**:
  - View all tabs with type icons and working directory.
  - Close tabs with tap (syncs to desktop).
  - Create terminals remotely.
- **Enhanced API Endpoints**:
  - `PATCH /api/spaces/:id` - Update space properties.
  - `PUT /api/spaces/:id/next` - Set What's Next.
  - `POST /api/spaces/:id/tasks` - Create task.
  - `POST /api/spaces/:id/tasks/:taskId/toggle` - Toggle task.
  - `PATCH /api/spaces/:id/tasks/:taskId` - Update task content.
  - `DELETE /api/spaces/:id/tasks/:taskId` - Delete task.
  - `DELETE /api/spaces/:id/tabs/:tabId` - Close tab.
- **IPC Bridge Extensions**:
  - `requestToggleTask`, `requestCreateTask`, `requestDeleteTask`, `requestUpdateTask`.
  - `requestUpdateSpace`, `requestSetSpaceNext`, `requestCloseTab`.
  - Task sync from renderer to main process.

### Security

#### Mobile Remote Server Hardening (2025-11-29)
- **CSRF Protection**: Added `X-Maestro-Client: mobile` header requirement.
  - Blocks cross-origin requests from malicious websites.
- **Auth Bypass Safety**: Dev mode bypass now requires explicit opt-in.
  - Must set `MAESTRO_DEV_AUTH_BYPASS=true` AND `NODE_ENV=development`.
  - Updated `dev:all` script to enable bypass for local testing.
- **Input Validation**: Tab creation validates type against whitelist, URL format for browser tabs.
- **Space ID Validation**: All space endpoints validate ID format before processing.

### Fixed

#### Mobile Notes Editor Layout Fix (2025-11-29)
- **Expandable Notes Section**: Notes editor now fills available vertical space.
  - Changed content container from `space-y-3` to `flex flex-col gap-3`.
  - Notes section uses `flex-1 min-h-[120px]` to expand.
  - Added visible border and proper padding to ContentEditable.
- **Tech Debt Documentation**: Created `docs/tech-debt/notes-editor-height.md` documenting the desktop notes editor height issue for future fixing.

#### Mobile Infrastructure Fixes (2025-11-29)
- **Space Sync**: Fixed "object could not be cloned" error by copying Proxy objects before IPC.
- **CORS**: Whitelisted `X-Maestro-Client` header to fix mobile network calls.
- **Vite Config**: Added auto-open and fixed port 5174 for mobile dev server.
- **Branding**: Updated application logo and icons.
- **WebSocket**: Fixed incorrect WebSocket URL construction in mobile app for dev environment.

#### Code Quality Improvements (2025-11-29)
- Added proper `LexicalNode` TypeScript interface for notes text extraction.
- Fixed race condition in task toggle - now waits for API success before UI update.
- Removed ESLint disable comments where proper types were added.

#### AI Elements Agent Conversation UI (2025-11-28)
- **Desktop AgentConversation**: New chat-like display for agent activity using AI Elements.
  - Message bubbles for user prompts and assistant responses with markdown support.
  - Collapsible Tool component showing input/output with status indicators (running/success/error).
  - Reasoning component for assistant thinking with auto-collapse.
  - Session start/end markers.
- **Mobile AI Elements**: Adapted components for mobile web UI.
  - Touch-friendly collapsible tool displays.
  - Optimized message bubbles for mobile screens.
  - Updated ActivityFeed to use new AgentConversation component.

#### Mobile Sync Button (2025-11-28)
- **Desktop Pairing UI**: New MobileSyncButton in ControlRoom toolbar.
  - Displays 6-digit PIN for mobile pairing.
  - Countdown timer showing expiration.
  - Copy to clipboard functionality.
  - Refresh PIN option.
  - Shows connection URL for mobile access.

#### Development Scripts (2025-11-28)
- Added `pnpm dev` - runs desktop Electron app.
- Added `pnpm dev:all` - runs desktop and mobile concurrently with colored output.

### Fixed

#### Mobile Crypto Compatibility (2025-11-28)
- Replaced `crypto.randomUUID()` with `uuid` package for HTTP compatibility.
- Replaced `crypto.subtle.digest()` with `js-sha256` for non-HTTPS environments.
- Auto-start remote server on app launch for mobile connections.
- Fixed mobile build inclusion in packaged app via `extraResource`.

#### Maestro Remote Server v2 (2025-11-28)
- **Remote Server Core** - Implemented Hono-based HTTP API and WebSocket server for mobile control.
  - Authentication: Device registry, PIN-based pairing, challenge-response JWT tokens.
  - IPC: Exposed server control (start/stop/pair) to renderer.
  - Frontend Hook: `useRemoteServer` for UI integration.
- **WebSocket Protocol** - Versioned message envelope, ping/pong keepalive, subscriptions.
- **Terminal Bridge** - High-performance PTY ↔ WebSocket bridge with buffering and backlog.
  - Registers agent PTYs with session ID for remote viewing.
  - Registers standard terminal PTYs with tab ID for remote viewing.
- **API Routes**:
  - `/api/auth/*`: Public and protected endpoints for device pairing and token exchange.
  - `/api/agents/*`: List active agent sessions, get details, send input, launch new agents remotely.
  - `/api/spaces/*`: List spaces and their associated agents (synced from renderer).
  - `/api/system/*`: Health check, server stats, list paired devices.
- **State Synchronization**:
  - Renderer (`SpaceSync` component) pushes space data to Main process for `/api/spaces`.

#### Mobile Web UI (2025-11-28)
- **Mobile-first Interface**: Dedicated responsive UI for controlling Maestro from a phone.
  - Served directly from Maestro's embedded web server.
  - **Agent List**: View active, needs-input, and idle agents.
  - **Agent Detail**: Live activity feed, status, and cost tracking.
  - **Terminal**: Full xterm.js terminal with mobile keyboard support.
  - **Quick Actions**: One-tap responses (Yes/No/Continue) for agents waiting for input.
- **Real-time Updates**: WebSocket connection for live status and terminal streaming.
- **Secure Pairing**: PIN-based pairing flow with persistent device credentials.

#### Ntfy Push Notifications (2025-11-28)
- **Push Notifications**: Integration with `ntfy.sh` for critical alerts.
- **Events**:
  - `needs_input`: Get notified when an agent is waiting for you.
  - `error`: Instant alerts for agent failures.
  - `complete`: Notification upon task completion.
- **Actionable**: Notifications include deep links or actions (where supported).

### Fixed

#### Remote Server Terminal ID Consistency (2025-11-28)
- Ensured `terminalId` in API responses aligns with PTY IDs registered in `terminalBridge`.
- `XTermWrapper` passes `segmentId` (tab ID) as `virtualId` to `pty.spawn`.
- `ipc/terminal.ts` registers PTY with both internal `pty-N` and `virtualId` when provided.
- `agentsRouter` now dynamically returns `sessionId` for `maestro-pty` agents as `terminalId`.

#### Happy Coder Update Automation (2025-11-28)
- **Automated Update Script** - Added `npm run update-happy` command
  - Updates `@anthropic-ai/claude-code` to the latest version inside the Volta-managed Happy Coder package
  - Eliminates manual directory navigation and npm install commands
  - Verifies successful installation and reports new version
- **Documentation Update** - Updated `CLAUDE.md` with new workflow instructions

#### Agent Monitor System - Phase A (2025-11-28)
- **Background monitoring of AI coding agents** (Claude Code, Codex, Gemini)
  - File watcher service monitors JSONL/JSON session logs
  - Process scanner detects running agent processes
  - JSONL parsers extract activities (tool use, messages, thinking)
- **Agent Registry** tracks sessions with status (active/idle/ended)
- **IPC handlers** for renderer to query sessions and activities
- **Valtio store** (`agent-monitor.store.ts`) for reactive UI state
- Supports connecting repos to spaces for filtered monitoring
- Session pruning after 24 hours, idle detection after 30 seconds

#### Agent Monitor System - Phase E: Jump to Terminal & Agent Types (2025-11-28)
- **Jump to Terminal** - Link agent sessions to terminal tabs
  - Sessions launched from Maestro are automatically linked to their terminal
  - Click "Terminal" button in DetailView or jump icon in ListView to open terminal
  - `⌘J` keyboard shortcut when viewing a linked session
  - Pending tab registry with 60-second match window
- **Agent Type Icons** - Visual differentiation for each agent type
  - Claude Code: Orange △ icon
  - Codex CLI: Emerald ⬡ icon
  - Gemini CLI: Blue ★ icon
  - New `AgentIcons.tsx` with SVG icons and color constants
- **Needs Input Detection** - Alert when agents wait for user response
  - 5-second timeout heuristic (tool_use without tool_result)
  - Orange pulsing status indicators throughout UI
  - "❗ Needs Input" badge in DetailView
- **System Notifications** - macOS notifications for needs_input
  - Shows notification when agent needs input and window not focused
  - Click notification to focus window, open Agent Vault, and jump to terminal
  - Tracks previous session status to detect transitions to needs_input

#### Agent Monitor System - Phase B: Space Integration (2025-11-28)
- **Connect repositories to Spaces** via `+` button menu or `⋯` dropdown
  - Native folder picker dialog
  - "Connect Repo" option in AddTabPopover and Panes header menu
  - Connected repo shown in Space card footer and Panes header
- **Agent status on Space cards** (Control Room)
  - Shows folder name + active (green pulsing) / idle (yellow) agent counts
  - Last activity summary (tool count or idle time)
  - Only shows active agents and idle agents from last hour
- **Agents section in Panes view** (maximized spaces)
  - Collapsible section with session cards
  - Session status, tool count, time since last activity
- **Startup persistence** - automatically reconnects saved repos
- New components: `SpaceSettingsModal`, `AgentStatusRow`, `AgentSidebarSection`
- New hook: `useAgentSessionsForSpace` for reactive session data
- Custom `pulse-slow` animation (2s breathing) for active agent dots

#### Space Vault Feature (2025-11-28)
- **Activate/deactivate spaces** with resource cleanup
  - Move spaces to "Vault" to hide from main view and free resources
  - Browser views are destroyed (memory freed)
  - Agent sessions are stopped
  - Terminal PTYs cleaned up on unmount
- **Vault drawer** accessible from toolbar (Archive icon)
  - Shows archived spaces with resource counts (browsers, terminals, agents)
  - Restore button to bring spaces back
  - Delete button for permanent removal
- **"Move to Vault" option** in space dropdown menus (both Cards and Panes views)
- New `isActive` field on Space type (defaults to true, migrates existing spaces)
- `space-cleanup.service.ts` - handles destroying BrowserViews, stopping agents
- `Sheet` UI component for slide-in drawers

#### Space Reordering (2025-11-28)
- **Drag-and-drop reordering for spaces** in both views
  - **Cards view**: Uses react-easy-sort with SortableList/SortableItem wrappers
  - **Panes view**: Custom implementation with floating ghost spine (Obsidian-inspired)
    - Grab spine to drag, ghost follows cursor
    - Drop preview appears at target position
    - Works with sticky positioning (no transform conflicts)

#### Notes Enhancements (2025-11-28)
- **Copy Obsidian URI**: Right-click note → "Copy Obsidian URI"
  - Copies Advanced URI format: `obsidian://advanced-uri?filepath=path/to/note.md`
  - Enables linking to Maestro notes from external apps

### Fixed

#### Agent Monitor Security & Stability (2025-11-28)
- **Path injection vulnerability** - Sanitize decoded project paths with `normalize()` + traversal validation
- **IPC input validation** - Added validators for paths, sessionId, spaceId, limit (capped at 10k)
- **Recursion depth limit** - `MAX_SCAN_DEPTH=10` prevents DoS via deep directory structures
- **Race condition fix** - `ensureServiceStarted()` awaits initialization before processing IPC requests
- **Memory leak fix** - Clean up `processSessionMap` when sessions end, clear all maps on service stop
- **Parser null safety** - Fixed crashes when `message.content` or `payload.content` is undefined in JSONL parsers
- **Session filter null check** - Prevent `startsWith` error when `projectPath` is undefined
- **ESLint warnings resolved** - Fixed unused variables in file-watcher, parsers, and process handlers
  - Added eslint override for parser files allowing `_`-prefixed unused args (for API stability)
  - Replaced non-null assertion with nullish coalescing in process exit handler

#### What's Next Bubble (2025-11-28)
- Restored `NextBubble` component to SpaceCard and SpacePanesView
- Shows "→ What's next?" prompt with red dot indicator when empty
- Click to edit, persists to `space.next` field

#### Component Refactoring (2025-11-27)
- **AgentDrawer refactored**: 732 → 103 lines (main component)
  - Extracted `AgentDrawerContext.tsx` - Context and hook for child views
  - Extracted `AgentDrawerUtils.tsx` - Shared utilities, constants, CostDisplay component
  - Extracted views to `src/components/Agent/views/`:
    - `DefaultView.tsx` - Idle state view
    - `CreateView.tsx` - Task creation form with permission/tool selectors
    - `RunningView.tsx` - Active task monitoring
    - `CompletedView.tsx` - Success state with cost breakdown
    - `ErrorView.tsx` - Error state with retry option
- **CommandPalette refactored**: 560 → 207 lines (main component)
  - Extracted `useCommandPaletteActions.ts` - All action handlers as custom hook
  - Extracted `CommandGroups.tsx` - Reusable command group components:
    - `UrlHistoryGroup`, `TabsGroup`, `SpacesGroup`
    - `ConnectedAppsGroup`, `InstalledAppsGroup`
    - `CreateGroup`, `ProfilesGroup`, `LaunchGroup`
    - `NavigateGroup`, `CurrentTabGroup`, `RecentlyClosedGroup`

#### Performance Optimizations (2025-11-27)
- **Memoization improvements**:
  - `CommandPalette` search filtering wrapped in useMemo
  - `NotesSidebar` tree building and getAllTags memoized
  - `StatusBar` completedToday calculation memoized
  - `SpaceCardHeader` hasLaunchableTabs wrapped in useMemo
  - `SpaceTasksSection` chained useMemos combined into single computation
  - `TabPreview` connectedApp lookup memoized
- **React.memo applied** to prevent unnecessary re-renders:
  - `TaskItem`, `SortableTaskItem` - Task list items
  - `SpacePane`, `SpacePaneHeaderContent` - Pane components
  - `MaximizedView`, `MinimizedDock` - Window manager components
- **Single-pass algorithms** replacing multiple iterations:
  - `usePerformance.ts` - Combined filter/map/reduce into single loop
  - `useSpaceTasks.ts` - Single-pass task filtering and counting
  - `WindowManager` - Single-pass window categorization
  - `App.tsx` - Combined Cmd+` and Cmd+Shift+` handlers
- **Constants extraction**:
  - `BrowserPanel` QUICK_LINKS moved outside component
- **Dead code removal**:
  - Removed console.log in TabPreview

#### Code Quality Improvements (2025-11-27)
- New hooks: `useStopPropagation`, `useModal` for common patterns
- Centralized constants in `src/lib/constants.ts` (magic numbers, durations, limits)
- `ColorPaletteSelector` component for reusable color picking UI
- `src/lib/error-utils.ts` with `logError`, `handleError`, `tryCatch` utilities
- `SpaceCardHeader` component extracted from SpaceCard

### Changed

#### Code Refactoring (2025-11-27)
- SpaceCard refactored: 365 → 241 lines, header extracted to sub-component
- Store actions now have explicit return types (`spaces.store`, `agent.store`)
- Standardized error handling pattern replaces `.catch(console.error)`
- TagSelector and SpaceCard use new ColorPaletteSelector component

#### Windowed View System (2025-11-27)
- **Floating Windows**: Open any tab (browser, terminal, agent) as a draggable, resizable floating window
- **Maximized View**: Full-screen mode for focused work with minimal header
- **Window Management**:
  - Right-click tab → "Open in Window" or "Open Maximized"
  - Drag windows by title bar, resize from edges/corners
  - Window positions persist across app restarts (IndexedDB)
  - Toggle between floating and maximized modes
- **Keyboard Shortcuts**:
  - `ESC` - Close focused floating window
  - `Cmd+\`` - Cycle through floating windows
  - `Cmd+Enter` - Toggle maximized/floating mode
- **Multi-View BrowserView Support**:
  - Refactored browser.ts to support multiple simultaneous BrowserViews
  - Z-order management: floating windows always above maximized
  - Proper view stacking with `setTopBrowserView()`

**New Files:**
- `src/stores/windows.store.ts` - Window state management with persistence
- `src/components/Window/` - WindowManager, FloatingWindow, WindowTitleBar, ResizeHandles, WindowContent

#### Tab Emoji Support (2025-11-27)
- Add custom emoji icons to any tab via right-click → "Add Emoji"
- Searchable emoji picker using frimousse library
- Emoji displays in place of default tab icon
- Remove emoji option in context menu

**Technical Details:**
- Added `emoji?: string` field to Tab interface
- Added `setTabEmoji()` action to workspace store

### Changed

#### Simplified App Architecture (2025-11-27)
- Removed legacy workspace view mode (`appViewMode`, `maximizeSpace`, `returnToControlRoom`)
- Removed unused Workspace components (WorkspacePanel, MaximizedTab, MaximizedWorkspace, etc.)
- ControlRoom is now the single main view, windows layer on top
- Deleted expandable-screen.tsx and related expandable card patterns

#### Bundled Claude Code CLI for Keychain Auth (2025-11-26)
- Added `@anthropic-ai/claude-code` as dependency for bundled CLI
- Agent now uses bundled CLI which inherits keychain auth from interactive login
- Same approach as Happy Coder - no separate API key needed if user has logged in via `claude` CLI
- Replaced `findClaudeCodeExecutable()` with `getClaudeCodePath()` using `require.resolve`

**Commit:** ea33bb6

#### Toast Notifications and Agent Error Handling (2025-11-26)
- Added Sonner toast notifications globally via `<Toaster>` in App.tsx
- Agent errors now display as toast notifications with 10s duration
- Fixed SDK error parsing to properly handle billing/API errors
  - SDK returns `{subtype: 'success', is_error: true}` for billing errors
  - Now checks `is_error` before `subtype` to catch these cases
- Added `hadResultError` tracking to suppress duplicate "process exited with code 1" errors
- Added `findClaudeCodeExecutable()` to dynamically locate Claude Code CLI
  - Checks PATH, resolves symlinks, falls back to common install locations

#### Per-Workspace Recent Coding Paths (2025-11-26)
- Added `recentCodingPaths` field to Space type (stores last 5 paths per workspace)
- CreateAgentModal shows clickable recent path chips above the input field
- Paths auto-save when starting agent tasks
- Most recent path auto-selected if no default provided

**Commit:** baf353b

### Changed

#### Project Restructure - Move to Root Directory (2025-11-26)
- Moved entire project from `maestro-electron/` subdirectory to repository root
- Deleted the `maestro-electron/` directory (all contents now at root level)
- Expanded `.gitignore` with comprehensive Node.js, build tool, and editor patterns
- No code changes, purely organizational restructure for cleaner repository layout

### Added

#### Launch All Tabs, Backups, and Tab Deactivation (2025-01-24)

**Launch All Tabs**
- Right-click on a space button to access "Launch All Tabs" option
- Launches all enabled (non-disabled) app-launcher tabs in the space
- Disabled tabs are skipped during launch

**Database Backup System**
- Automatic backups every 30 minutes with version history
- Keeps last 5 backups (older ones are automatically pruned)
- Creates initial backup on app startup
- Backups stored in separate IndexedDB database (`maestro-backups`)
- Backup utilities: `createBackup()`, `getBackups()`, `restoreBackup()`, `deleteBackup()`

**Tab Deactivation**
- New `disabled` property on Tab interface
- Right-click tab → "Disable Tab" / "Enable Tab" toggle
- Disabled tabs appear grayed out (40% opacity + grayscale)
- Disabled tabs won't launch when clicked or during "Launch All"
- Visual state persists across sessions

**Technical Details:**
- `src/lib/backup.ts` - NEW: Complete backup system with IndexedDB storage
- `src/stores/workspace.store.ts` - Added `toggleTabDisabled()`, `setTabDisabled()`, `getEnabledTabsForSpace()`
- `src/hooks/useTabClick.ts` - Added `launchTab()` helper, respects disabled state
- `src/components/Workspace/TabContextMenu.tsx` - Added enable/disable menu items
- `src/components/Workspace/SpaceButton.tsx` - Added context menu with "Launch All Tabs"
- `src/components/Workspace/GridTab.tsx` & `ListTab.tsx` - Visual disabled state styling

#### Dynamic App Theme from Space Color (2025-01-24)
- Space primary color now becomes the app's accent color when space is active
  - CSS custom properties updated at runtime: `--primary`, `--primary-foreground`, `--ring`, etc.
  - shadcn/ui components automatically use the space's color
  - Full OKLCH color conversion for modern CSS compatibility
- Automatic contrast calculation for foreground colors
  - White text on dark colors, dark text on light colors
  - Adapts to both light and dark mode

**Technical Details:**
- `src/lib/space-theme.ts` - Hex to OKLCH conversion utilities
- `applySpaceTheme()` / `resetSpaceTheme()` functions for CSS variable management
- Uses `document.documentElement.style.setProperty()` for dynamic updates
- Integrated in `App.tsx` via useEffect watching active space

**Files Created/Modified:**
- `src/lib/space-theme.ts` - NEW: Color conversion and theme application utilities
- `src/App.tsx` - Added theme application on space change

#### Space Color Customization (2025-01-24)
- Added 2-color system (primary + secondary) for spaces
  - 8 professional preset color pairs (Ocean Blue, Forest Green, Sunset Orange, etc.)
  - Color swatches in SpaceButton edit form for quick selection
  - Automatic color assignment cycles through palette for new spaces
- Applied space colors throughout the UI
  - SpaceButton: Primary color background tint when active, colored indicator
  - ListTab: Left border uses space primary color when active
  - GridTab: Bottom border uses space primary color when active
- Migration support for existing spaces with old single-color format

**Technical Details:**
- `SPACE_COLOR_PALETTE` constant with 8 color pairs in `src/types/index.ts`
- Space interface changed: `color` → `primaryColor` + `secondaryColor`
- Auto-migration runs on store initialization for legacy data
- Colors stored as hex strings for simplicity

#### Undo/Redo and Recently Closed Tabs (2025-01-24)
- Implemented global undo/redo system with Cmd+Z / Cmd+Shift+Z
  - Created `persistWithHistory` utility combining valtio-history with IndexedDB persistence
  - Debounced history saves (100ms) coalesce rapid mutations into single history entries
  - Works across workspace, tasks, and spaces stores
  - Handles valtio snapshot Date serialization edge case
- Added recently closed tabs feature with Shift+Cmd+T to restore
  - Stores last 10 closed tabs with metadata
  - `restoreRecentlyClosedTab()` action recreates tab with new ID
  - Closed tabs include original type, title, and configuration

**Technical Details:**
- `persistWithHistory<T>()` creates proxyWithHistory as source of truth
- Uses `skipSubscribe: true` with manual subscription for debounced batching
- `getWorkspaceStore()` getter pattern prevents stale references after undo
- Custom Date serialization handles frozen valtio snapshot objects
- Global `historyActions.undo()/redo()` tries each store in priority order

**Files Created/Modified:**
- `src/lib/persist-with-history.ts` - New utility combining history + persistence
- `src/stores/history.store.ts` - Global undo/redo actions
- `src/stores/workspace.store.ts` - Uses persistWithHistory, added recently closed tabs
- `src/stores/tasks.store.ts` - Uses persistWithHistory
- `src/stores/spaces.store.ts` - Uses persistWithHistory
- `src/App.tsx` - Keyboard shortcuts for undo/redo/restore tab

#### Tab Context Menu for Moving Between Spaces (2025-01-24)
- Added right-click context menu to tab components (both grid and list views)
  - "Move to Space" submenu shows all other available spaces
  - Space icons displayed in submenu for visual clarity
  - "Close Tab" option with destructive styling
  - Context menu filters out current space (only shows valid targets)
- Created shared `TabContextMenu` component
  - Single source of truth for context menu logic
  - Works consistently across GridTab and ListTab
  - Uses Radix UI ContextMenu with proper ContextMenuTrigger pattern
- Added `moveTabToSpace(tabId, targetSpaceId)` action to workspace store
  - Updates tab's spaceId to move it to target space
  - Handles active tab switching automatically
  - Clears active tab if moved tab was currently active

**Technical Details:**
- TabContextMenu wraps tab content as children (not anti-pattern wrapper)
- Uses `useSnapshot` to filter spaces reactively
- ContextMenuSub and ContextMenuSubContent for nested space selection
- FolderInput and Trash2 icons from lucide-react
- Properly stops propagation to prevent conflicts with drag/click

**Benefits:**
- Unified experience across both tab view modes
- Quick tab organization without drag-and-drop
- Clean separation of concerns (component vs logic)
- Extensible for future context menu items

#### Replace DnD Kit with react-easy-sort for Tab Reordering (2025-01-24)
- Migrated tabs system from @dnd-kit to react-easy-sort for smoother drag-and-drop
  - Grid view now supports true 2D dragging (horizontal and vertical)
  - List view uses `lockAxis="y"` for vertical-only dragging
  - Smoother animations with better visual feedback
  - Added `react-easy-sort` and `array-move` dependencies
- Created reusable components for list and grid views
  - `ListTab` - Simplified list view tab component with morphing edit
  - `GridTab` - Grid view tab component with icon-centered layout
  - Both support double-click to edit with smooth morphing animation
- Removed DnD Kit dependencies from tabs system
  - Deleted `DraggableWorkspace` wrapper component
  - Deleted `SortableGridTab` (replaced by `GridTab`)
  - Removed `DraggableTab` (replaced by `ListTab`)
  - Removed DnD Kit imports from `TabDropZone`, `FavoritesGrid`, `Sidebar`
  - DnD Kit packages remain for Tasks system usage

**Technical Details:**
- Uses `arrayMoveImmutable` from array-move for immutable reordering
- `SortableList` wraps both grid and list layouts
- Each tab wrapped in `SortableItem` with additional div wrapper (required by react-easy-sort)
- Grid view uses `flex flex-wrap` for responsive wrapping
- Added `data-draggable="true"` attribute for proper touch-action handling
- Opacity-based drag feedback with `draggedItemClassName="opacity-50"`

**Benefits:**
- Framer Motion Reorder only supports single-axis by design, react-easy-sort handles grids properly
- Simpler API with less boilerplate than DnD Kit
- Better mobile touch support out of the box
- Consistent drag behavior across list and grid views

#### Task Card Morphing Animation and Context Menu (2025-01-24)
- Implemented smooth morphing animation for task cards using Framer Motion
  - Card morphs between collapsed (70-90px) and expanded (300px) states
  - Spring-based animation with configurable stiffness (550), damping (45), and mass (0.7)
  - Task content always visible in collapsed state
  - Click any task to expand into inline edit form
  - AnimatePresence provides smooth opacity transitions
  - Click outside closes the edit form
- Added right-click context menu for task operations
  - Integrated Radix UI ContextMenu components
  - Delete task option with destructive styling (red text)
  - Trash2 icon for visual clarity
- Enhanced MorphSurface component flexibility
  - Modified to support custom render props (renderTrigger, renderContent)
  - Hides default dock when custom render props provided
  - Can now be used as general-purpose morphing container

**Technical Details:**
- Built morphing directly into TaskCard component (no wrapper)
- Used motion.div from motion/react for animations
- Maintains active/done visual states during morphing
- Form validation ensures title is required before saving

---

## [Unreleased] - 2025-11-25

### Control Room & Navigation Redesign

#### ExpandableScreen Navigation Architecture
- Replaced Arc-style dock/carousel navigation with Control Room → Expand → Collapse pattern
- Space cards in Control Room morph into full workspace view using cult-ui's ExpandableScreen
- Framer Motion layout animations with shared layoutId for smooth morphing transitions
- Minimal Zed/Conductor-inspired UI aesthetic

**New Components:**
- `SpaceCardExpandable.tsx` - Wraps space cards with ExpandableScreen for morphing animation
- `MaximizedWorkspace.tsx` - Focused workspace view with minimal header (icon, name, NextBubble, close button)
- `expandable-screen.tsx` - cult-ui component for morphing card-to-fullscreen animations

**Removed:**
- Embla carousel from TabsSidebar (no longer navigating between spaces in workspace)
- `carousel.tsx` component
- `embla-carousel-react` and `embla-carousel-wheel-gestures` dependencies
- Home button from Sidebar (redundant with close button)

**Architecture:**
- App.tsx simplified - ControlRoom always renders, ExpandableScreen handles workspace display
- StatusBar shows "Control Room" or space name based on appViewMode
- Escape key closes maximized workspace
- Close button (X) in workspace header using Cross2Icon

**Files Changed:** App.tsx, ControlRoom.tsx, Sidebar.tsx, TabsSidebar.tsx, StatusBar.tsx, package.json

## [Unreleased] - 2025-11-24

### Workspace Features

#### Notes Panel
- Full markdown editor in workspace panel
- Note tabs with content persistence
- Rich text editing support

#### Tab Context Menu
- Right-click context menu on tabs
- Rename, duplicate, close actions
- Toggle favorite status
- Move to different space

### Code Cleanup & Type Fixes

#### Type System
- Added missing `LaunchResult`, `LaunchError`, and `SavedState` type definitions to `launcher.ts`
- Properly typed launch function return values in launcher store

#### Code Quality
- Removed 35+ `console.log` debug statements from:
  - App.tsx - Command palette and activeSpaceId logging
  - browser.store.ts - Navigation state logging
  - ipc/portal.ts - Portal lifecycle logging
  - components/PortalWindow.tsx - Bounds and state logging
  - components/View.tsx - Layout calculation logging
  - components/Browser/useWebview.ts - Navigation event logging
  - components/Workspace/WorkspacePanel.tsx - Tab switching logging
- Cleaned up unused component props:
  - Removed unused `index` prop from DraggableTab
  - Removed unused `zone` and `index` props from SortableGridTab
  - Kept `spaceId` props for future cross-space moves

#### Notes
- Pre-existing TypeScript type definition issues in @types/node (unrelated to our code)
- Kept all UI components, IPC handlers, and WindowState types for future features
- Kept Agent tab type for next feature implementation
- Kept framer-motion dependency for planned animations

### Unified Tab & App Launcher Architecture with Cross-Zone Drag-and-Drop

#### Architecture Unification
- Unified tab and app-launcher into single Tab type with optional `appLauncherConfig`
- Removed duplicate favorite management system - favorites are now tabs with `isFavorite: true`
- Simplified launcher store to focus only on app discovery, registration, and launching
- Single source of truth in workspace store for all tabs (including app launchers)

#### @dnd-kit Drag-and-Drop System
- Implemented cross-zone dragging between favorites (grid) and tabs (list)
- Dynamic ghost element that transforms based on target zone (grid ↔ list)
- Custom collision detection using pointerWithin and rectIntersection strategies
- Smooth reordering within zones with proper container awareness
- Real-time favorite status updates when dragging between zones

**Key Components**:
- `src/components/Workspace/DraggableWorkspace.tsx` - Centralized drag logic with custom collision detection
- `src/components/Workspace/TabDragGhost.tsx` - Dynamic ghost element with grid/list variants
- `src/hooks/useTabClick.ts` - Reusable hook for tab/launcher click handling

**New IPC Handlers**:
- `launcher:launch-app-only` - Launch app without file or deep link
- `launcher:launch-with-file` - Launch app with specific file
- `launcher:launch-deeplink` - Launch app via deep link

**Removed**:
- Framer Motion dependency (replaced with @dnd-kit)
- Old Favorite type and favorite-specific IPC handlers
- Unused timeline components (base-node, base-handle, timeline hooks and utils)
- `restoreWindowPositions` and deprecated launcher functions
- 7 unused component files, 5 unused hook files, 1 unused utility file

**Dependencies**: @dnd-kit/core@^6.3.1, @dnd-kit/sortable@^9.0.0, @dnd-kit/utilities@^3.2.2

**Files**: Added DraggableWorkspace.tsx, TabDragGhost.tsx, useTabClick.ts; Removed 13 unused files; Modified workspace.store.ts, launcher.store.ts, launcher.ts IPC handlers

## [Unreleased] - 2025-11-23

### Stack Browser Pattern Implementation

#### Modal System with Yoga Layout
- Implemented Stack Browser pattern for modals above BrowserViews
- Added Facebook Yoga layout engine for flexbox-style positioning
- Created View component with nested layout support
- Implemented PortalWindow component for React Portal to BrowserView bridge
- Fixed timing race condition for WebContents ID synchronization
- Added TestPortal component for development testing
- Configured Vite for top-level-await support (yoga-layout requirement)

**Key Components**:
- `src/components/View.tsx` - Yoga layout calculator
- `src/components/PortalWindow.tsx` - Portal to BrowserView bridge
- `src/ipc/portal.ts` - window.open() interception and BrowserView management
- `src/components/ui/modal-content.tsx` - Modal UI component with dialog styling

**Dependencies**: yoga-layout@^2.0.1

**Files**: Added View.tsx, ModalContent component; Modified PortalWindow.tsx, portal.ts, vite.renderer.config.ts

## [Unreleased] - 2025-11-22

### Phase 1: Core Foundation

#### Basic Tauri App Structure
- Scaffolded Tauri v2 app with React 19 + TypeScript + Vite
- Configured dual runtime model (Rust backend + React frontend)
- Set up IPC communication via Tauri commands
- Configured strict TypeScript and ESLint

**Files**: `src-tauri/main.rs`, `src-tauri/lib.rs`, `src/main.tsx`, `src/App.tsx`

#### Timeline Canvas Component
- Implemented infinite canvas using React Flow
- Custom segment nodes (horizontal "chorizo" bars)
- Time-to-pixels conversion system
- NOW line with real-time updates (1s interval)
- Custom time grid background with intervals
- Pan/zoom controls (Space bar to center on NOW)
- Segment width based on time duration

**Files**: `src/components/Timeline/Timeline.tsx`, `src/components/Timeline/NowLine.tsx`, `src/components/Timeline/TimeRuler.tsx`, `src/components/Timeline/TimelineControls.tsx`

#### Track System
- Track data structure with segments
- Track creation and management
- Multiple tracks (lanes) on timeline
- Track position-based Y-axis layout

**Files**: `src/stores/timeline.store.ts`, `src/components/Spaces/SpaceList.tsx`

#### Segment Creation & Management
- Click at NOW line to create segments
- Segment creation menu (Browser/Terminal/Note options)
- Segments extend over time while active
- Manual segment close/end functionality
- Segment status tracking (active/paused/completed)

**Files**: `src/components/Timeline/CreateSegmentMenu.tsx`, `src/components/Segments/SegmentNode.tsx`, `src/stores/segments.store.ts`

#### State Persistence
- Valtio-based state management with proxy reactivity
- IndexedDB persistence using valtio-persist
- Auto-save functionality
- State restoration on app launch
- Separate stores for timeline, segments, spaces, workspace

**Files**: `src/stores/*.store.ts`

#### UI Theme
- Monochrome design with accent color system
- shadcn/ui integration with Tailwind CSS 4
- Multiple component registries configured (@magicui, @motion-primitives, etc.)
- Lucide React icons
- CSS animations with Anime.js
- Dark mode theme

**Files**: `src/styles/globals.css`, `components.json`, `tailwind.config.js`

---

### Phase 1.5: Arc-Inspired Workspace View

#### Layout Architecture
- Resizable timeline panel (20-40% height) using react-resizable-panels
- Sidebar for vertical tabs (200px fixed width)
- Main workspace panel for active content
- Bottom dock for track/space switching (48px fixed height)

**Files**: `src/App.tsx`, `src/components/Workspace/WorkspacePanel.tsx`

#### Dock Component (Arc-style)
- Rounded button design with icons and names
- Active space highlight with glow effect
- Space creation (+) button
- Space editing (icon, name, color picker)
- Emoji picker integration
- Tooltips on hover

**Files**: `src/components/Workspace/Dock.tsx`, `src/components/Workspace/SpaceEditor.tsx`, `src/components/ui/dock.tsx`

#### Sidebar (Vertical Tabs)
- Favorites section for pinned tabs
- Collapsible tab groups by type (Terminal/Browser/Notes)
- Tab states: Active, Running (dot indicator), Idle
- Swipeable carousel for space navigation
- Two-finger trackpad gesture support (Embla carousel)
- Tab management (open/close/switch)

**Files**: `src/components/Workspace/Sidebar.tsx`

#### Workspace Panel
- Active tab content renderer
- Note editor (Markdown support)
- Placeholder views for Terminal/Browser/Agent types
- Tab switching without unmounting

**Files**: `src/components/Workspace/WorkspacePanel.tsx`

#### Track-Tab Relationship
- Track = Arc "Space" concept implementation
- Each space has its own tabs collection
- Tab types: 'note' (implemented), 'terminal', 'browser', 'agent' (placeholders)
- Active tab tracking per space
- Segment-to-tab linking on timeline

**Files**: `src/stores/spaces.store.ts`, `src/stores/workspace.store.ts`

#### Visual Design
- Arc-inspired glassmorphic dock styling
- Sidebar with subtle borders and backgrounds
- Active state glow effects
- Status dot animations (pulse effect)
- Smooth transitions throughout

**Files**: CSS in component files, global styles

#### State Management
- Workspace state with active space/tab tracking
- Space CRUD operations
- Tab lifecycle management
- Persistence to IndexedDB for all workspace state

**Completed**: 2025-11-21

---

### Phase 2: Core Tool Integration (In Progress)

#### Agent 1: Terminal Integration

**Implementation Stack:**
- XTerm.js 5.5.0 terminal emulator with WebGL renderer
- Addons: fit, web-links, search, webgl
- Real PTY backend using tauri-pty plugin (NPM 0.1.1 + Rust crate)
- React Activity component for tab lifecycle (terminals stay alive when hidden)

**Features Implemented:**
- Terminal opens in workspace panel as Arc-style tab
- Full shell spawning (bash, zsh, powershell support)
- Multiple themes: Termius Dark (default), Dracula, Nord
- Terminal state persists across tab switches (no buffer restoration needed)
- Seamless reconnection to live PTY process
- Terminal metadata display in header
- JetBrains Mono Variable font

**Architecture:**
- Replaced custom Rust terminal.rs with tauri-pty plugin
- Terminal lifecycle managed via React Activity (mounted but hidden pattern)
- PTY process stays alive, terminal reconnects on tab switch
- No buffer restoration needed (live process connection)

**Files Created:**
```
src/components/Terminal/
├── TerminalPanel.tsx      # Main container
├── TerminalHeader.tsx     # Metadata display
├── XTermWrapper.tsx       # XTerm + tauri-pty integration
├── terminal.utils.ts      # Utilities
├── index.ts               # Barrel exports
└── themes/
    ├── index.ts           # Theme exports
    ├── termius-dark.ts    # Default theme
    ├── dracula.ts         # Dracula theme
    └── nord.ts            # Nord theme

Rust (src-tauri):
├── Cargo.toml             # tauri-plugin-pty dependency
├── capabilities/default.json  # PTY permissions
└── lib.rs                 # PTY plugin init
```

**Test Results:**
- Terminal spawns with shell
- Commands execute correctly
- Tab switching works (process stays alive)
- WebGL renderer performs smoothly
- All themes render correctly
- No memory leaks on tab switches

**Completed**: 2025-11-21

---

#### Agent 3: Resource Monitor

**Implementation:**
- Rust backend using sysinfo 0.30 crate
- System metrics collection (RAM, CPU)
- App-specific process tracking
- IPC events for real-time updates
- Resource panel UI component
- Per-segment metrics tracking
- Metrics graph visualization

**Features:**
- Real-time RAM/CPU monitoring
- Process-level metrics
- Visual meters in resource panel
- Metrics update every second via IPC
- Track resource usage per segment

**Files Created:**
```
src-tauri/
├── monitor.rs           # System monitoring
└── metrics.rs           # Metrics collection

src/components/Monitor/
├── ResourcePanel.tsx    # Main panel
├── SegmentMetrics.tsx   # Per-segment display
├── MetricsGraph.tsx     # Visualization
└── index.ts             # Exports

src/stores/
└── metrics.store.ts     # Metrics state
```

**Completed**: 2025-11-21

---

### Technical Debt & Cleanups

#### November 2025
- Fixed TypeScript errors across codebase
- Removed unused dependencies
- Cleaned up unused imports
- Updated sysinfo to 0.30 (from deprecated version)
- Refactored large components to stay under 250 lines
- Simplified TerminalPanel (removed redundant internal tabs)
- Added comprehensive documentation to spec
- Migrated drag-and-drop from Pragmatic Drag and Drop to @hello-pangea/dnd
  - Fixed positioning issues with renderClone API
  - Implemented Arc-style favorites (icon-only, 3-column grid)
  - Added dynamic drag preview morphing between favorite and tab styles
  - Created DragContext for real-time target zone tracking
  - Resolved carousel interference with tab dragging

---

## Remaining Work

### Phase 2: Remaining Agents

#### Agent 2: Browser Integration

**Implementation Stack:**
- Tauri v2 child webview using `window.add_child()` API
- React component wrapper (BrowserPanel)
- BrowserToolbar with URL bar and navigation controls
- Dynamic webview creation/destruction via Rust commands
- Navigation via webview recreation (close + create with new URL)
- React Activity component for tab lifecycle (browsers stay alive when hidden)

**Features Implemented:**
- Browser opens in workspace panel as Arc-style tab
- URL bar with search functionality (auto-Google search for non-URLs)
- Navigation buttons (back/forward/reload/home placeholders)
- Loading states
- Multiple browser tabs (each workspace tab is a browser instance)
- Browser state persists across tab switches (no reload needed)
- Proper positioning and resizing on macOS with automatic window resize handling
- ResizeObserver with throttled updates for smooth performance

**Positioning Fix:**
- Fixed macOS child webview positioning by accounting for 28px title bar offset
- Discovered JavaScript viewport coordinates start below title bar, but Tauri's LogicalPosition includes it
- Implemented workaround: create webview at (0,0) then immediately call `set_position()` (Tauri positioning bug)
- Removed `.auto_resize()` which conflicts with manual positioning (Issue #9611)
- Combined `update_webview_position` and `update_webview_size` into single `update_webview_bounds` command

**Rust Commands Created:**
```rust
create_browser_webview     // Create child webview at position with on_navigation handler
close_browser_webview      // Destroy webview
update_webview_bounds      // Update position and size simultaneously
navigate_webview           // Navigate to new URL using webview.navigate()
webview_go_back            // Navigate back in history, returns new URL
webview_go_forward         // Navigate forward in history, returns new URL
```

**Files Created:**
```
src/stores/
└── browser.store.ts       # Dedicated browser state store (NEW)

src/components/Browser/
├── BrowserPanel.tsx       # Main UI component
├── BrowserToolbar.tsx     # URL bar with useEffect sync
├── useWebview.ts          # Webview lifecycle + navigation events
├── browser.utils.ts       # URL normalization
└── index.ts               # Barrel exports

Rust (src-tauri):
├── browser.rs             # Browser module with navigation commands
├── lib.rs                 # Module registration
└── capabilities/default.json  # Window permissions
```

**Architecture:**
- Browser tabs managed via React Activity (mounted but hidden pattern)
- Webview stays alive, hidden when tab is inactive
- Position/size updated on window resize via ResizeObserver (100ms throttle)
- All positioning logic centralized in `getWebviewPosition()` helper

**Navigation System:**
- Back/forward navigation with URL tracking
- Navigation event system using `on_navigation` handler
- Automatic URL bar updates from webview navigation events
- Dedicated browser store (separated from workspace store)
- Valtio-based state management with IndexedDB persistence
- Complete navigation history tracking for each browser instance
- Navigation logic centralized in useWebview hook
- URL normalization (auto-adds https://, handles plain domains)

**Architecture Improvements:**
- Separated browser state into dedicated `browser.store.ts`
- Browser state keyed by tab ID for clean isolation
- Navigation event listener in `useWebview.ts` hook (separation of concerns)
- Direct Valtio proxy mutations for automatic persistence

**Files Updated:**
```
src/stores/browser.store.ts     # NEW - Dedicated browser state
src/components/Browser/
├── BrowserPanel.tsx             # Simplified - UI only
├── BrowserToolbar.tsx           # URL bar with useEffect sync
└── useWebview.ts                # Navigation event handling
```

**Known Limitations:**
- No browser profile isolation per space
- No cookie/session isolation
- Webview uses `webview.navigate()` API (preserves state)

**Completed**: 2025-11-23

#### Agent 4: Segment Content Visualizations (Not Started)
- Type-specific internal visualizations
- Smooth animations for segment content
- Real-time content updates

#### Agent 5: Timeline Enhancements (Partial)
- Basic timeline with NOW line
- Zoom levels (hour/day/week)
- Time labels on axis (basic implementation exists)
- Grid lines for time intervals
- Mini-map overview

#### Agent 6: Planted Segments (Not Started)
- Create future/scheduled segments
- Time-based triggers
- Visual countdown
- Auto-activation

#### Agent 7: Panes & Window Management (Not Started)
- Obsidian-style pane splitting
- Drag to resize panes
- Multiple panes with different content types

### Phase 3: Integration & Polish

#### Integration Agent 1: External Apps (In Progress - Almost Complete)
- Launch external apps (VSCode, etc.)
- App state preservation
- Window position memory
- macOS .app bundle registration via file picker
- Icon extraction (ICNS→PNG via sips)
- Running app detection with visual indicators
- Bring to front via AppleScript
- Launch methods: app only, with file, deep link (URL scheme)
- Cross-platform support (Windows/Linux)

#### Integration Agent 2: Data & Persistence
- SQLite integration (currently using IndexedDB)
- Backup/restore functionality
- Export timeline data
- Undo/redo system

#### Integration Agent 3: UI Polish
- Light mode theme
- Enhanced animations (Framer Motion)
- Sound effects (optional)
- Onboarding flow
- Keyboard shortcuts panel

---

## Version History

### v0.1.0-alpha (Current)
- Initial development version
- Core timeline and workspace functionality
- Terminal and resource monitoring
- Basic persistence

---

## Notes

This project follows a phased development approach with parallel agent work.
See `docs/maestro-mvp-spec.md` for the complete specification.
