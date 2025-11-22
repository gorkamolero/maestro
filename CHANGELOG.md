# Maestro Changelog

All notable changes to Maestro will be documented in this file.

## [Unreleased] - 2025-11-22

### Phase 1: Core Foundation ✅ COMPLETE

#### Basic Tauri App Structure
- ✅ Scaffolded Tauri v2 app with React 19 + TypeScript + Vite
- ✅ Configured dual runtime model (Rust backend + React frontend)
- ✅ Set up IPC communication via Tauri commands
- ✅ Configured strict TypeScript and ESLint

**Files**: `src-tauri/main.rs`, `src-tauri/lib.rs`, `src/main.tsx`, `src/App.tsx`

#### Timeline Canvas Component
- ✅ Implemented infinite canvas using React Flow
- ✅ Custom segment nodes (horizontal "chorizo" bars)
- ✅ Time-to-pixels conversion system
- ✅ NOW line with real-time updates (1s interval)
- ✅ Custom time grid background with intervals
- ✅ Pan/zoom controls (Space bar to center on NOW)
- ✅ Segment width based on time duration

**Files**: `src/components/Timeline/Timeline.tsx`, `src/components/Timeline/NowLine.tsx`, `src/components/Timeline/TimeRuler.tsx`, `src/components/Timeline/TimelineControls.tsx`

#### Track System
- ✅ Track data structure with segments
- ✅ Track creation and management
- ✅ Multiple tracks (lanes) on timeline
- ✅ Track position-based Y-axis layout

**Files**: `src/stores/timeline.store.ts`, `src/components/Spaces/SpaceList.tsx`

#### Segment Creation & Management
- ✅ Click at NOW line to create segments
- ✅ Segment creation menu (Browser/Terminal/Note options)
- ✅ Segments extend over time while active
- ✅ Manual segment close/end functionality
- ✅ Segment status tracking (active/paused/completed)

**Files**: `src/components/Timeline/CreateSegmentMenu.tsx`, `src/components/Segments/SegmentNode.tsx`, `src/stores/segments.store.ts`

#### State Persistence
- ✅ Valtio-based state management with proxy reactivity
- ✅ IndexedDB persistence using valtio-persist
- ✅ Auto-save functionality
- ✅ State restoration on app launch
- ✅ Separate stores for timeline, segments, spaces, workspace

**Files**: `src/stores/*.store.ts`

#### UI Theme
- ✅ Monochrome design with accent color system
- ✅ shadcn/ui integration with Tailwind CSS 4
- ✅ Multiple component registries configured (@magicui, @motion-primitives, etc.)
- ✅ Lucide React icons
- ✅ CSS animations with Anime.js
- ✅ Dark mode theme

**Files**: `src/styles/globals.css`, `components.json`, `tailwind.config.js`

---

### Phase 1.5: Arc-Inspired Workspace View ✅ COMPLETE

#### Layout Architecture
- ✅ Resizable timeline panel (20-40% height) using react-resizable-panels
- ✅ Sidebar for vertical tabs (200px fixed width)
- ✅ Main workspace panel for active content
- ✅ Bottom dock for track/space switching (48px fixed height)

**Files**: `src/App.tsx`, `src/components/Workspace/WorkspacePanel.tsx`

#### Dock Component (Arc-style)
- ✅ Rounded button design with icons and names
- ✅ Active space highlight with glow effect
- ✅ Space creation (+) button
- ✅ Space editing (icon, name, color picker)
- ✅ Emoji picker integration
- ✅ Tooltips on hover

**Files**: `src/components/Workspace/Dock.tsx`, `src/components/Workspace/SpaceEditor.tsx`, `src/components/ui/dock.tsx`

#### Sidebar (Vertical Tabs)
- ✅ Favorites section for pinned tabs
- ✅ Collapsible tab groups by type (Terminal/Browser/Notes)
- ✅ Tab states: Active, Running (dot indicator), Idle
- ✅ Swipeable carousel for space navigation
- ✅ Two-finger trackpad gesture support (Embla carousel)
- ✅ Tab management (open/close/switch)

**Files**: `src/components/Workspace/Sidebar.tsx`

#### Workspace Panel
- ✅ Active tab content renderer
- ✅ Note editor (Markdown support)
- ✅ Placeholder views for Terminal/Browser/Agent types
- ✅ Tab switching without unmounting

**Files**: `src/components/Workspace/WorkspacePanel.tsx`

#### Track-Tab Relationship
- ✅ Track = Arc "Space" concept implementation
- ✅ Each space has its own tabs collection
- ✅ Tab types: 'note' (implemented), 'terminal', 'browser', 'agent' (placeholders)
- ✅ Active tab tracking per space
- ✅ Segment-to-tab linking on timeline

**Files**: `src/stores/spaces.store.ts`, `src/stores/workspace.store.ts`

#### Visual Design
- ✅ Arc-inspired glassmorphic dock styling
- ✅ Sidebar with subtle borders and backgrounds
- ✅ Active state glow effects
- ✅ Status dot animations (pulse effect)
- ✅ Smooth transitions throughout

**Files**: CSS in component files, global styles

#### State Management
- ✅ Workspace state with active space/tab tracking
- ✅ Space CRUD operations
- ✅ Tab lifecycle management
- ✅ Persistence to IndexedDB for all workspace state

**Completed**: 2025-11-21

---

### Phase 2: Core Tool Integration (In Progress)

#### Agent 1: Terminal Integration ✅ COMPLETE

**Implementation Stack:**
- ✅ XTerm.js 5.5.0 terminal emulator with WebGL renderer
- ✅ Addons: fit, web-links, search, webgl
- ✅ Real PTY backend using tauri-pty plugin (NPM 0.1.1 + Rust crate)
- ✅ React Activity component for tab lifecycle (terminals stay alive when hidden)

**Features Implemented:**
- ✅ Terminal opens in workspace panel as Arc-style tab
- ✅ Full shell spawning (bash, zsh, powershell support)
- ✅ Multiple themes: Termius Dark (default), Dracula, Nord
- ✅ Terminal state persists across tab switches (no buffer restoration needed)
- ✅ Seamless reconnection to live PTY process
- ✅ Terminal metadata display in header
- ✅ JetBrains Mono Variable font

**Architecture:**
- ✅ Replaced custom Rust terminal.rs with tauri-pty plugin
- ✅ Terminal lifecycle managed via React Activity (mounted but hidden pattern)
- ✅ PTY process stays alive, terminal reconnects on tab switch
- ✅ No buffer restoration needed (live process connection)

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
- ✅ Terminal spawns with shell
- ✅ Commands execute correctly
- ✅ Tab switching works (process stays alive)
- ✅ WebGL renderer performs smoothly
- ✅ All themes render correctly
- ✅ No memory leaks on tab switches

**Completed**: 2025-11-21

---

#### Agent 3: Resource Monitor ✅ COMPLETE

**Implementation:**
- ✅ Rust backend using sysinfo 0.30 crate
- ✅ System metrics collection (RAM, CPU)
- ✅ App-specific process tracking
- ✅ IPC events for real-time updates
- ✅ Resource panel UI component
- ✅ Per-segment metrics tracking
- ✅ Metrics graph visualization

**Features:**
- ✅ Real-time RAM/CPU monitoring
- ✅ Process-level metrics
- ✅ Visual meters in resource panel
- ✅ Metrics update every second via IPC
- ✅ Track resource usage per segment

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
- ✅ Fixed TypeScript errors across codebase
- ✅ Removed unused dependencies
- ✅ Cleaned up unused imports
- ✅ Updated sysinfo to 0.30 (from deprecated version)
- ✅ Refactored large components to stay under 250 lines
- ✅ Simplified TerminalPanel (removed redundant internal tabs)
- ✅ Added comprehensive documentation to spec

---

## Remaining Work

### Phase 2: Remaining Agents

#### Agent 2: Browser Integration (Not Started)
- Embedded webview using Tauri
- Browser tab management
- URL bar and navigation
- Isolated profile per track/space

#### Agent 4: Segment Content Visualizations (Not Started)
- Type-specific internal visualizations
- Smooth animations for segment content
- Real-time content updates

#### Agent 5: Timeline Enhancements (Partial)
- ✅ Basic timeline with NOW line
- ❌ Zoom levels (hour/day/week)
- ❌ Time labels on axis (basic implementation exists)
- ❌ Grid lines for time intervals
- ❌ Mini-map overview

#### Agent 6: Planted Segments (Not Started)
- Create future/scheduled segments
- Time-based triggers
- Visual countdown
- Auto-activation

#### Agent 7: Panes & Window Management (Not Started)
- Obsidian-style pane splitting
- Drag to resize panes
- Multiple panes with different content types

### Phase 3: Integration & Polish (Not Started)

#### Integration Agent 1: External Apps
- Launch external apps (VSCode, etc.)
- App state preservation
- Window position memory

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
