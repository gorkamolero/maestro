# Maestro MVP Specification
*Your work, through time*

> **See `CHANGELOG.md` for completed work.**
> **This spec now contains ONLY remaining tasks.**

## Executive Summary
Maestro is a timeline-based work orchestrator that manages parallel work streams across time. Think of it as a hybrid between a video editor timeline, a Gantt chart, and a music production tool - multiple tracks running simultaneously, each with their own tools, agents, and state, all orchestrated along a visual timeline with a NOW line as your anchor.

## Core Innovation
- **Not a task manager**: It's a work launcher and orchestrator
- **Timeline-centric**: Navigate your work through past, present, and future
- **State preservation**: Every app remembers exactly where you left off
- **Agent-native**: Built for the age of AI coding assistants
- **Planted segments**: Schedule future work that auto-activates

---

## PHASE 2: Workspace Completion (Current Focus)

### ✅ Completed Workspace Features

**Core Infrastructure:**
- [x] Dock with space navigation
- [x] Sidebar with tab management
- [x] Tab drag-and-drop reordering
- [x] Workspace panel with activity-based tab switching
- [x] State persistence across tab switches (React Activity)

**Tool Panels:**
- [x] **Terminal Integration** - Full xterm.js with PTY support
- [x] **Browser Integration** - Embedded webview with URL bar, navigation, multi-instance support
- [x] **Resource Monitor** - Real-time RAM/CPU tracking

**Browser Navigation:**
- [x] Back/forward navigation with history tracking
- [x] URL bar updates from navigation events
- [x] Automatic URL normalization
- [x] Navigation event system
- [x] Dedicated browser state store

### 🎯 Remaining Workspace Features

**Workspace Enhancements:**
- [ ] Notes panel (markdown editor as workspace tool)
- [ ] Command palette (Cmd+K) for workspace navigation
- [ ] Keyboard shortcuts for tab switching (Cmd+1-9)
- [ ] Tab context menu (rename, duplicate, close)
- [ ] Workspace search (across all open tabs/tools)
- [ ] Quick switcher between tools/tabs

**Browser Enhancements:**
- [ ] Bookmark manager in sidebar
- [ ] Download handling
- [ ] Context menu (copy/paste/inspect)
- [ ] DevTools integration
- [ ] Multiple tabs within browser panel

**Terminal Enhancements:**
- [ ] Command history search
- [ ] Terminal tab splitting (horizontal/vertical)
- [ ] Custom color schemes
- [ ] Search in terminal output

**UI Polish:**
- [ ] Smooth tab switch animations
- [ ] Enhanced drag-and-drop visual feedback
- [ ] Keyboard navigation improvements
- [ ] Accessibility (ARIA labels, focus management)

---

## FUTURE PHASES: Timeline & Advanced Features

### Timeline Features (Deferred)
- Segment content visualizations (chorizo UI with interior animations)
- Timeline enhancements (zoom levels, grid, minimap)
- Planted segments (future scheduling)
- Track management
- Time-based navigation

### Panes & Window Management (Deferred)
- Obsidian-style pane splitting
- Nested layouts
- Pane resize and focus
- Layout persistence

### External App Integration (Deferred)
- Launch external apps (VSCode, Ableton, etc.)
- App state tracking
- Window position memory
- File associations

### Data & Persistence (Deferred)
- SQLite migration
- Backup/restore
- Export to JSON/CSV
- Undo/redo system

### Additional Polish (Deferred)
- Light mode theme
- Enhanced animations (Framer Motion)
- Sound effects
- Onboarding flow

---

## Critical Success Metrics (To Validate)

### Performance
- [ ] <100ms response time for all interactions
- [ ] <500MB RAM with 10 active segments
- [ ] 30fps minimum for animations
- [ ] <1s cold start time

### Functionality
- [ ] Can manage 10+ parallel tracks
- [ ] Segments persist across restarts (✅ basic, needs validation)
- [ ] Timeline navigable to any point (✅ basic, needs enhancements)
- [ ] Resource monitor prevents >4GB usage

### Visual
- [ ] Screenshots look professional
- [ ] Smooth animations throughout
- [ ] Clear visual hierarchy
- [ ] Consistent design language

---

## Technical Stack (Locked)

```json
{
  "core": {
    "framework": "Tauri 2.0",
    "frontend": "React 19 + TypeScript",
    "bundler": "Vite"
  },
  "ui": {
    "components": "shadcn/ui",
    "styling": "Tailwind CSS 4+",
    "animations": "Framer Motion + Anime.js",
    "icons": "Lucide React"
  },
  "timeline": {
    "canvas": "React Flow",
    "virtualization": "@tanstack/virtual"
  },
  "terminal": {
    "emulator": "@xterm/xterm 5.5.0",
    "addons": ["@xterm/addon-fit", "@xterm/addon-web-links", "@xterm/addon-search", "@xterm/addon-webgl"],
    "pty": "tauri-pty 0.1.1 (NPM + Rust plugin)"
  },
  "state": {
    "management": "Valtio (proxy-based reactive)",
    "stores": "Separate stores: workspace, browser, timeline, segments",
    "events": "Tauri event system + EventEmitter3",
    "persistence": "IndexedDB via valtio-persist"
  },
  "browser": {
    "engine": "Tauri v2 child webviews",
    "navigation": "on_navigation event handler",
    "state": "Dedicated browser.store.ts per tab"
  },
  "monitoring": {
    "rust": "sysinfo crate",
    "ipc": "Tauri events"
  }
}
```

---

## Data Models (Reference)

```typescript
// Core Types
interface Workspace {
  id: string
  name: string
  tracks: Track[]
  createdAt: Date
  updatedAt: Date
}

interface Track {
  id: string
  name: string
  position: number
  color: string
  icon?: string
  segments: Segment[]
  markers: Marker[]
  preferredApps?: {
    browser?: string
    terminal?: string
    editor?: string
  }
}

interface Segment {
  id: string
  trackId: string
  title: string
  startTime: Date
  endTime?: Date
  type: SegmentType
  status: SegmentStatus
  config: SegmentConfig
  metrics?: ResourceMetrics
}

type SegmentType =
  | 'browser'
  | 'terminal'
  | 'agent'
  | 'note'
  | 'external'
  | 'planted'

type SegmentStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'agent-working'
  | 'scheduled'

interface SegmentConfig {
  // Browser
  urls?: string[]
  tabs?: BrowserTab[]

  // Terminal
  commands?: string[]
  workingDir?: string
  env?: Record<string, string>

  // Agent
  agentType?: 'claude-code' | 'codex' | 'cursor'
  agentTask?: string

  // External
  appName?: string
  appPath?: string
  files?: string[]

  // Planted
  trigger?: TriggerConfig
}

interface TriggerConfig {
  type: 'time' | 'event' | 'manual'
  time?: Date
  recurring?: 'daily' | 'weekly'
  eventId?: string
}

interface Marker {
  id: string
  trackId: string
  time: Date
  type: 'deadline' | 'milestone' | 'note'
  title: string
  description?: string
  color?: string
}

interface ResourceMetrics {
  ram: number  // in MB
  cpu: number  // percentage
  processes: number
  lastUpdated: Date
}
```

---

## Component Architecture (Reference)

```
src/
├── App.tsx                      # Main app, layout (✅ implemented)
├── components/
│   ├── Timeline/                (✅ basic, needs enhancements)
│   │   ├── Timeline.tsx         # Main timeline canvas
│   │   ├── TimelineControls.tsx # Zoom, navigation (needs zoom levels)
│   │   ├── NowLine.tsx         # The NOW indicator (✅ complete)
│   │   ├── TimeAxis.tsx        # Time labels (needs enhancement)
│   │   ├── TimeGrid.tsx        # Grid lines (TO BUILD)
│   │   ├── MiniMap.tsx         # Mini-map (TO BUILD)
│   │   └── ZoomControls.tsx    # Zoom UI (TO BUILD)
│   ├── Tracks/                  (✅ basic implementation)
│   │   ├── Track.tsx
│   │   ├── TrackList.tsx
│   │   └── TrackControls.tsx
│   ├── Segments/                (✅ basic, needs visualizations)
│   │   ├── Segment.tsx         # Base segment container
│   │   ├── SegmentContent.tsx  # Router for content types (TO BUILD)
│   │   └── visualizations/     # All TO BUILD
│   │       ├── TerminalViz.tsx
│   │       ├── BrowserViz.tsx
│   │       ├── AgentViz.tsx
│   │       ├── NoteViz.tsx
│   │       ├── ExternalViz.tsx
│   │       └── PlantedViz.tsx
│   ├── Workspace/               (✅ Phase 1.5 complete)
│   │   ├── Dock.tsx
│   │   ├── Sidebar.tsx
│   │   ├── WorkspacePanel.tsx
│   │   ├── SpaceEditor.tsx
│   │   ├── DraggableTab.tsx
│   │   ├── TabDropZone.tsx
│   │   └── DragContext.tsx
│   ├── Terminal/                (✅ Phase 2 Agent 1 complete)
│   │   ├── TerminalPanel.tsx
│   │   ├── TerminalHeader.tsx
│   │   └── XTermWrapper.tsx
│   ├── Browser/                 (✅ Phase 2 Agent 2 complete with navigation)
│   │   ├── BrowserPanel.tsx    # UI component (reads from browser store)
│   │   ├── BrowserToolbar.tsx  # URL bar with useEffect sync
│   │   ├── useWebview.ts       # Webview lifecycle + navigation events
│   │   ├── browser.utils.ts    # URL normalization
│   │   └── index.ts            # Exports
│   ├── Monitor/                 (✅ Phase 2 Agent 3 complete)
│   │   ├── ResourcePanel.tsx
│   │   ├── SegmentMetrics.tsx
│   │   └── MetricsGraph.tsx
│   └── Panes/                   (TO BUILD - Agent 7)
│       ├── PaneManager.tsx
│       ├── Pane.tsx
│       ├── TabBar.tsx
│       ├── Tab.tsx
│       └── pane.utils.ts
├── stores/                      (✅ implemented with valtio-persist)
│   ├── timeline.store.ts       # Timeline state
│   ├── spaces.store.ts         # Spaces/tracks
│   ├── segments.store.ts       # Segment data
│   ├── workspace.store.ts      # Workspace layout & tabs
│   ├── browser.store.ts        # Browser state per tab (NEW)
│   └── metrics.store.ts        # Resource metrics
├── lib/
│   ├── persistence.ts          # Save/load state (✅ basic via valtio-persist)
│   ├── shortcuts.ts            # Keyboard handlers (TO BUILD)
│   └── utils.ts               # Helper functions (✅ implemented)
└── styles/
    ├── globals.css             # Global styles (✅ implemented)
    └── themes.css              # Theme variables (TO BUILD for light mode)
```

---

## Visual Design Philosophy

### Segment Design ("Chorizos")
All segments share the same container design - horizontal rounded rectangles like video clips in Premiere, tasks in a Gantt chart, or clips in Ableton Live. The magic happens INSIDE each segment with different visualizations:

```
Track 1: [═══════════════════════════════════]
         ↑                                    ↑
         Same container for all types        Different internal content

Examples of internal visualizations:
- Terminal: Matrix-style cascading text
- Browser: Animated favicon carousel
- Agent: Waveform/processing animation (like audio visualizer)
- Note: Typewriter text effect
- External: App icon with activity pulse
- Planted: Growing plant or countdown timer
```

### Visual Hierarchy
- **Container**: Consistent shape (like video clips or Gantt tasks)
- **Border**: Subtle variations for status (solid/dashed/dotted)
- **Icons**: Show segment type (Terminal, Browser, Agent, Note, etc.)
- **Glow**: Accent color intensity shows activity level
- **Interior**: Type-specific visualization in monochrome
- **Text**: Title overlaid or below

---

## Event Bus Architecture (To Implement)

```typescript
// Central event bus for decoupled communication
import { EventEmitter } from 'eventemitter3';

export const eventBus = new EventEmitter();

// Event types for type safety
export type MaestroEvents = {
  'segment:created': { segment: Segment };
  'segment:updated': { segment: Segment };
  'segment:deleted': { segmentId: string };
  'track:reordered': { tracks: Track[] };
  'timeline:zoomed': { level: ZoomLevel };
  'resource:warning': { ram: number };
  'agent:completed': { segmentId: string };
};

// Usage example
eventBus.emit('segment:created', { segment: newSegment });
eventBus.on('agent:completed', ({ segmentId }) => {
  // Handle completion
});
```

---

## Code Quality Rules

1. **TypeScript Strict Mode** - No `any` types
2. **State Updates via Valtio** - Never mutate directly
3. **Every component gets an interface** for props
4. **Comments only for "why", not "what"**
5. **One component = one responsibility**
6. **Keep components under 250 lines** - Extract hooks/utilities when needed

---

## MVP Exclusions (Future Features)

- ❌ Calendar integration
- ❌ Collaboration/multiplayer
- ❌ Cloud sync
- ❌ Mobile app
- ❌ Advanced analytics
- ❌ AI suggestions
- ❌ Plugins system
- ❌ Time tracking reports
- ❌ Invoice generation
- ❌ Team features

---

## Marketing Angles (For Build in Public)

### Pain Points
- "I lost track of what my 4 AI agents are doing"
- "Context switching is killing my productivity"
- "I can't remember what state that project was in"
- "My computer runs out of RAM with all these tools"

### Taglines
- "Your work, through time"
- "Timeline-based productivity"
- "Navigate your work like editing a video"
- "The OS for parallel work"
- "Gantt charts meet real-time execution"

### Key Features to Highlight
1. Timeline navigation (past/present/future)
2. Agent integration (built for AI-first workflow)
3. Resource management (never crash from RAM)
4. Planted segments (schedule future work)
5. State preservation (never lose context)

---

## This Document Is
- The single source of truth for REMAINING WORK
- What all agents reference
- Continuously updated
- Version controlled

**For completed work, see `CHANGELOG.md`**
