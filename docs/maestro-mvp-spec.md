# Maestro MVP Specification
*Your work, through time*

## Executive Summary
Maestro is a timeline-based work orchestrator that manages parallel work streams across time. Think of it as a hybrid between a video editor timeline, a Gantt chart, and a music production tool - multiple tracks running simultaneously, each with their own tools, agents, and state, all orchestrated along a visual timeline with a NOW line as your anchor.

## Core Innovation
- **Not a task manager**: It's a work launcher and orchestrator
- **Timeline-centric**: Navigate your work through past, present, and future
- **State preservation**: Every app remembers exactly where you left off
- **Agent-native**: Built for the age of AI coding assistants
- **Planted segments**: Schedule future work that auto-activates

### Visual Inspiration
The interface combines familiar patterns from:
- **Video editing software** (Premiere, Final Cut): Timeline with tracks and clips
- **Project management** (Gantt charts): Tasks along a time axis
- **Music production** (Ableton, Logic): Parallel tracks with segments
- **Calendar apps**: Time-based scheduling and planning

Users will instantly understand the timeline metaphor regardless of their background.

---

## PHASE 1: Core Foundation (Manual Build - Day 1 Morning)
*What you build first to have something usable*

### 1.1 Basic Tauri App Structure
```
maestro/
├── src-tauri/          # Rust backend
│   ├── main.rs         # App entry, window creation
│   └── commands.rs     # IPC commands
├── src/                # React frontend
│   ├── App.tsx         # Main app
│   ├── stores/         # Zustand stores
│   └── components/     # React components
```

### 1.2 Timeline Canvas Component

**Implementation with React Flow**:

React Flow will be used as an infinite canvas where:
- **Nodes** = Segments (the horizontal bars/chorizos)
- **No edges** = We're not connecting nodes, just placing them on a timeline
- **Custom node types** = Different segment visualizations
- **Background** = Time grid with NOW line

```typescript
// Basic React Flow setup for timeline
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  useReactFlow 
} from 'reactflow';

// Custom node type for segments
const SegmentNode = ({ data }) => {
  return (
    <div className="segment-node">
      {data.icon} {data.title}
      {/* Internal visualization based on type */}
    </div>
  );
};

const nodeTypes = {
  segment: SegmentNode,
};

// Timeline component structure
function Timeline() {
  // Nodes represent segments positioned on timeline
  const nodes = tracks.flatMap(track => 
    track.segments.map(segment => ({
      id: segment.id,
      type: 'segment',
      position: {
        x: timeToPixels(segment.startTime),
        y: track.position * TRACK_HEIGHT
      },
      data: {
        title: segment.title,
        width: timeToPixels(segment.endTime || now) - timeToPixels(segment.startTime),
        type: segment.type,
        status: segment.status
      }
    }))
  );

  return (
    <ReactFlow
      nodes={nodes}
      nodeTypes={nodeTypes}
      panOnDrag
      zoomOnScroll
      preventScrolling={false}
      minZoom={0.1}
      maxZoom={4}
    >
      <Background variant="lines" />
      {/* Custom NOW line overlay */}
      <NowLine />
    </ReactFlow>
  );
}
```

**Key Features**:
- **Infinite horizontal scroll**: React Flow's pan handles this
- **Zoom**: Scroll wheel controls zoom (time scale)
- **Custom grid**: Override Background to show time intervals
- **NOW line**: Custom overlay component, always visible
- **Track lanes**: Y-position based on track number
- **Segment width**: Calculated from time duration

**Time Management**:
```typescript
// Convert time to x-position
function timeToPixels(date: Date): number {
  const minutesSinceStart = (date - timelineStart) / 60000;
  return minutesSinceStart * PIXELS_PER_MINUTE * zoomLevel;
}

// NOW line updates every second
useEffect(() => {
  const timer = setInterval(() => {
    setNowPosition(timeToPixels(new Date()));
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

**Interaction**:
- **Click on timeline**: Get coordinates, convert to time, create segment
- **Pan with drag**: Built into React Flow
- **Zoom with scroll**: Changes time scale (pixels per minute)
- **Space bar**: Center on NOW (using fitView API)

**Visual Customization**:
```css
/* Monochrome segments with accent glow */
.segment-node {
  background: var(--gray-800);
  border: 1px solid var(--gray-600);
  border-radius: 4px;
  padding: 8px;
  min-width: 100px;
}

.segment-node.active {
  box-shadow: 0 0 20px var(--accent-color);
  border-color: var(--accent-color);
}

/* NOW line */
.now-line {
  position: absolute;
  width: 2px;
  height: 100%;
  background: var(--accent-color);
  box-shadow: 0 0 10px var(--accent-color);
  z-index: 1000;
}
```

### 1.3 Track System
- **Data structure**:
```typescript
interface Track {
  id: string
  name: string
  position: number
  segments: Segment[]
}

interface Segment {
  id: string
  trackId: string
  title: string
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed'
  type: 'browser' | 'terminal' | 'note'
}
```

### 1.4 Basic Segment Creation & Window Management
- Click at NOW line → Menu appears
- Options: Browser / Terminal / Note
- Creates segment that starts extending
- **Clicking segment opens in-app window**:
  - Tabs at top (like VSCode)
  - Tab actions: Close, Close Others, Close All
  - Can have multiple tabs open
- Manual close button to end segment

### 1.5 Panes System (Obsidian-style)
- **Split views**: Horizontal/vertical splits
- **Each pane can contain**:
  - Terminal (with its own tabs)
  - Browser (with its own tabs)  
  - Notes editor
  - Timeline view (can nest!)
- **Pane management**:
  - Drag to resize
  - Click to focus
  - Close pane button
  - Maximize/restore

### 1.6 State Persistence
- Save timeline state to IndexedDB
- Restore on app launch
- Auto-save every 30 seconds

### 1.6 UI Theme
- Monochrome design with accent color
- Use shadcn/ui's built-in theme system
- Icons for segment type identification (not colors)
- Simple animations (CSS + Anime.js)

### 1.7 Success Criteria for Phase 1
- [ ] Can create and name tracks
- [ ] Can create segments at NOW
- [ ] Segments visually extend over time
- [ ] Can close/end segments
- [ ] State persists between sessions
- [ ] Looks good enough to screenshot

**Time estimate**: 4-6 hours
**Deliverable**: Working timeline with basic segment management

---

## PHASE 1.5: Arc-Inspired Workspace View (Critical Addition)
*Build immediately after Phase 1 timeline is working*

### Context
Now that the timeline visualization works, we need to make it actually functional. The timeline shows WHAT is running and for how long, but the workspace is WHERE work actually happens. Inspired by Arc browser's Spaces and vertical tabs.

### Core Concept
- **Tracks = Spaces** (like Arc browser Spaces)
- **Each track has its own tabs** (terminals, browsers, notes)
- **Dock at bottom** for track switching
- **Sidebar for tabs** within current track
- **Timeline becomes history view** (collapsible)

### Layout Architecture
```
┌─────────────────────────────────────────────────────────┐
│                 TIMELINE (Resizable 20-40%)              │
│  [Horizontal timeline with NOW line - already built]     │
├─────────────┬────────────────────────────────────────────┤
│             │                                            │
│   SIDEBAR   │              WORKSPACE                     │
│   (200px)   │            (Main content)                  │
│             │                                            │
│ ┌─────────┐ │  [Active tab content: Terminal/Browser/   │
│ │ TABS    │ │   Note/Agent output displays here]        │
│ │ ▼Terminal│ │                                           │
│ │ ▶Browser │ │                                           │
│ │ ▶Notes   │ │                                           │
│ └─────────┘ │                                           │
├─────────────┴────────────────────────────────────────────┤
│ [🏠 Track1] [🎵 Track2] [🔬 Track3] [+]    💾 2.3GB 🔥45%│
└───────────────────────────────────────────────────────────┘
         DOCK (Fixed height ~48px)
```

### Components to Build

#### 1. Workspace Container
```typescript
interface WorkspaceLayout {
  timelineHeight: number // Resizable via drag handle
  sidebarWidth: number   // Fixed or resizable
  dockHeight: 48         // Fixed
  activeTrackId: string
  activeTabId: string
}
```

#### 2. Dock Component (Arc-style)
- **Visual**: Rounded rect buttons with icons
- **Behavior**: Click to switch entire track context
- **Features**:
  - Track icons and names
  - Active track highlight (glow)
  - Resource usage per track (mini meters)
  - Add track button (+)
  - Global resource monitor

#### 3. Sidebar (Vertical Tabs)
- **Groups by type**: Terminal, Browser, Notes
- **Collapsible sections**
- **Tab states**: Active, Running (dot indicator), Idle
- **Visual style**: Minimal, icon + title
- **Hover**: Show full title + preview

#### 4. Workspace Panel
- **Renders active tab content**
- **Tab types supported**:
  - Terminal (XTerm.js - Phase 2)
  - Browser (Webview - Phase 2)
  - Note (Markdown editor - already exists)
  - Agent (Output viewer - Phase 2)
- **For Phase 1.5**: Just create the panel structure and note editor

### Track-Tab Relationship
```typescript
// Track = Arc "Space" - a working context
interface Track {
  id: string
  name: string
  icon: string // emoji or icon name
  color: string // hex color for visual identification
  tabs: Tab[]
  activeTabId: string
  position: number // position in dock
}

// Tab - for Phase 1.5 only supporting 'note' type
interface Tab {
  id: string
  trackId: string
  type: 'note' // Only notes for now, will add 'terminal' | 'browser' | 'agent' later
  title: string
  status: 'active' | 'idle'
  
  // Connection to timeline
  segmentId?: string // Links to timeline segment
  
  // Note-specific config (only type for Phase 1.5)
  content?: string
  
  createdAt: Date
  lastActiveAt: Date
}

// Future types (Phase 2) - not implemented yet:
// - BrowserProfile (for isolated sessions)
// - TerminalConfig (for terminal tabs)
// - BrowserConfig (for browser tabs)  
// - AgentConfig (for AI agents)
// - Recipe (for automation)
```

### Interaction Flow

1. **Create Work**:
   - Click dock → Switch track
   - Click sidebar → Open tab
   - Tab opens in workspace
   - Segment appears on timeline

2. **Resume Work**:
   - Click track in dock
   - See all tabs for that track in sidebar
   - Click tab to resume
   - Timeline shows history

3. **Quick Actions**:
   - Cmd+T → New terminal in current track
   - Cmd+B → New browser in current track
   - Cmd+N → New note in current track

### Visual Design

#### Dock Design (Arc-inspired)
```css
.dock {
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  display: flex;
  gap: 8px;
}

.dock-item {
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.dock-item.active {
  background: var(--accent) / 0.2;
  border-color: var(--accent);
  box-shadow: 0 0 20px var(--accent) / 0.3;
}
```

#### Sidebar Styling
```css
.sidebar {
  background: rgba(25, 25, 25, 0.98);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.tab-group {
  padding: 8px;
}

.tab-item {
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
}

.tab-item.active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.tab-item .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s infinite;
}
```

### Resizable Panes Setup
Using `react-resizable-panels` or similar:
```typescript
<PanelGroup direction="vertical">
  <Panel defaultSize={30} minSize={20} maxSize={50}>
    <Timeline />
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={70}>
    <PanelGroup direction="horizontal">
      <Panel defaultSize={15} minSize={10} maxSize={25}>
        <Sidebar />
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={85}>
        <Workspace />
      </Panel>
    </PanelGroup>
  </Panel>
</PanelGroup>
```

### State Management Updates
```typescript
// Add to stores
interface WorkspaceState {
  activeTrackId: string
  tracks: Track[]
  layout: WorkspaceLayout
}

// Actions
const workspaceActions = {
  switchTrack: (trackId: string) => {},
  openTab: (trackId: string, tabType: TabType) => {},
  closeTab: (tabId: string) => {},
  setActiveTab: (tabId: string) => {},
}
```

### Success Criteria for Phase 1.5
- [ ] Dock renders with track switcher
- [ ] Sidebar shows tabs for active track
- [ ] Workspace panel displays active tab
- [ ] Can switch between tracks
- [ ] Can open/close tabs
- [ ] Note editor works in workspace
- [ ] Timeline stays in sync
- [ ] Resizable panes work
- [ ] State persists to IndexedDB

### What This Enables
- Timeline becomes useful (shows work history)
- Tracks organize work contexts
- Ready for terminal/browser integration
- Arc-like navigation feels familiar
- Foundation for recipes (per track)

**Time estimate**: 6-8 hours
**Priority**: CRITICAL - Do this before Phase 2 agents

---

## PHASE 2: Parallel Agent Development (Day 1 Afternoon - Day 2)
*5-6 agents working simultaneously*

### Agent 1: Terminal Integration ✅ COMPLETED
**Owner**: Terminal specialist agent
**Dependencies**: Phase 1 complete
**Status**: Fully implemented and tested

#### Completed Deliverables:
- ✅ Integrated XTerm.js with WebGL renderer
- ✅ Terminal opens in workspace panel (Arc-style tab system)
- ✅ Terminal state persists using React Activity component (tabs stay alive when hidden)
- ✅ Real PTY backend using tauri-pty plugin (replacing old portable-pty approach)
- ✅ Multiple themed appearances (Termius Dark, Dracula, Nord)
- ✅ Full terminal functionality with shell spawning

#### Terminal Stack (Implemented):
```typescript
// Production implementation
- @xterm/xterm (terminal emulator)
- @xterm/addon-fit (responsive sizing)
- @xterm/addon-web-links (clickable URLs)
- @xterm/addon-search (find in terminal)
- @xterm/addon-webgl (GPU acceleration)
- tauri-pty (Rust plugin for PTY - NPM + Cargo)
```

#### XTerm.js Configuration (Final):
```typescript
const terminalOptions = {
  theme: THEMES[theme], // termius-dark, dracula, or nord
  fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
  fontSize: 14,
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'block',
  allowTransparency: true,
  scrollback: 10000,
  convertEol: true,
}
```

#### Files Created:
```
src/components/Terminal/
├── TerminalPanel.tsx      ✅ Main terminal container
├── TerminalHeader.tsx     ✅ Terminal header with metadata
├── XTermWrapper.tsx       ✅ XTerm integration with tauri-pty
├── terminal.utils.ts      ✅ State save/restore utilities
├── index.ts               ✅ Barrel exports
└── themes/
    ├── index.ts           ✅ Theme barrel
    ├── termius-dark.ts    ✅ Default theme
    ├── dracula.ts         ✅ Dracula theme
    └── nord.ts            ✅ Nord theme

Rust (src-tauri):
├── Cargo.toml             ✅ Added tauri-plugin-pty dependency
├── capabilities/
│   └── default.json       ✅ PTY permissions configured
└── lib.rs                 ✅ PTY plugin initialized
```

#### Architecture Changes:
- **Replaced Rust terminal.rs module** with tauri-pty NPM plugin
- **Terminal lifecycle managed by React Activity**: Terminals stay mounted but hidden when tabs switch
- **No buffer restoration needed**: PTY process stays alive, terminal reconnects seamlessly
- **Workspace integration**: Terminals are tabs within tracks (Arc browser pattern)

#### Test Results:
- ✅ Terminal spawns and accepts input
- ✅ Tab switching works without killing process
- ✅ Commands execute properly (zsh, bash, powershell)
- ✅ WebGL renderer performs smoothly
- ✅ Multiple themes available
- ✅ State persists across tab switches using Activity component

---

### Agent 2: Browser Integration
**Owner**: Browser specialist agent
**Dependencies**: Phase 1 complete

#### Deliverables:
- Embedded webview using Tauri
- Browser opens when browser segment clicked
- Tab management (multiple tabs per segment)
- URL bar and navigation
- Isolated profile per track

#### Files to create:
```
src/components/Browser/
├── BrowserPanel.tsx
├── BrowserTab.tsx
├── TabBar.tsx
└── browser.utils.ts
```

#### Test cases:
- Webview loads URLs
- Tabs can be opened/closed
- Navigation works
- Cookies isolated per track

---

### Agent 3: Resource Monitor
**Owner**: Performance specialist agent
**Dependencies**: Phase 1 complete

#### Deliverables:
- Rust side: System monitoring with `sysinfo`
- IPC events for metrics
- Resource panel UI (top right)
- RAM/CPU meters per segment
- Kill/suspend buttons

#### Files to create:
```
src-tauri/
├── monitor.rs
└── metrics.rs

src/components/Monitor/
├── ResourcePanel.tsx
├── SegmentMetrics.tsx
└── MetricsGraph.tsx
```

#### Test cases:
- Metrics update every second
- Can identify high RAM usage
- Kill button terminates processes
- Accurate RAM reporting

---

### Agent 4: Segment Content Visualizations
**Owner**: Visualization specialist agent
**Dependencies**: Phase 1 complete

#### Deliverables:
- All segments use same "chorizo" container (like Ableton clips)
- Different internal visualizations per type:
  - **Terminal**: Scrolling text/command preview
  - **Browser**: Mini tab bar with favicons
  - **Agent**: Animated waveform/processing visualization
  - **Note**: Text preview with markdown
  - **External App**: App icon + file preview
  - **Planted**: Countdown timer or growth animation
- Smooth internal animations (think music visualizer)
- Status indicated by border color/glow

#### Visual Examples:
```
[═══ Terminal ════════] → Shows last command output scrolling
[═══ Browser ═════════] → Shows favicon parade of open tabs
[═══ Agent ═══════════] → Shows thinking animation/waveform
[═══ Note ════════════] → Shows text preview fading in/out
```

#### Files to create:
```
src/components/Segments/
├── Segment.tsx           # Base chorizo container
├── SegmentContent.tsx    # Router for content types
├── visualizations/
│   ├── TerminalViz.tsx   # Terminal preview
│   ├── BrowserViz.tsx    # Tab indicators
│   ├── AgentViz.tsx      # Processing animation
│   ├── NoteViz.tsx       # Text preview
│   └── PlantedViz.tsx    # Countdown/growth
└── segment.types.ts
```

#### Test cases:
- All segments have consistent outer shape
- Internal animations perform at 30fps
- Content updates in real-time
- Visual feedback for state changes

---

### Agent 5: Timeline Enhancements
**Owner**: Timeline specialist agent
**Dependencies**: Phase 1 complete

#### Deliverables:
- Zoom levels (hour/day/week)
- Time labels on axis
- Grid lines for time
- Smooth scrolling animations
- Keyboard navigation
- Mini-map overview

#### Files to create:
```
src/components/Timeline/
├── TimeAxis.tsx
├── TimeGrid.tsx
├── MiniMap.tsx
├── ZoomControls.tsx
└── timeline.utils.ts
```

#### Test cases:
- Zoom changes scale correctly
- Time labels update on scroll
- Keyboard nav works
- Mini-map shows correct position

---

### Agent 6: Planted Segments
**Owner**: Future work specialist agent
**Dependencies**: Phase 1 complete

#### Deliverables:
- Create future segments (dotted outline)
- Time-based triggers
- Visual countdown to activation
- Drag to reschedule
- Auto-activate at trigger time

#### Files to create:
```
src/components/Segments/
├── PlantedSegment.tsx
├── TriggerConfig.tsx
├── Scheduler.tsx
└── planted.utils.ts
```

#### Test cases:
- Can create future segments
- Triggers activate on time
- Can reschedule by dragging
- Visual feedback as time approaches

---

### Agent 7: Panes & Window Management  
**Owner**: Window management specialist
**Dependencies**: Phase 1 complete

#### Deliverables:
- Obsidian-style pane splitting system
- VSCode-style tab management at top
- Each pane can hold browser/terminal/notes
- Drag to resize panes
- Tab bar with close/close others/close all
- Clicking any segment opens it in a tab

#### Files to create:
```
src/components/Panes/
├── PaneManager.tsx
├── Pane.tsx  
├── TabBar.tsx
├── Tab.tsx
└── pane.utils.ts
```

#### Test cases:
- Can split panes horizontally/vertically
- Tabs can be reordered by dragging
- Close actions work correctly
- Pane focus follows click
- Layout persists to IndexedDB

---

## PHASE 3: Integration & Polish (Day 2-3)
*2-3 agents for integration*

### Integration Agent 1: External Apps
- Launch external apps (VSCode, Ableton, etc.)
- App state preservation
- Window position memory
- File association

### Integration Agent 2: Data & Persistence
- SQLite integration
- Backup/restore
- Export timeline data
- Undo/redo system

### Integration Agent 3: UI Polish
- Light mode
- Smooth animations (Framer Motion)
- Sound effects (optional)
- Onboarding flow
- Keyboard shortcuts panel

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

The monochrome design with accent color keeps focus on the work itself, not the UI.

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
    "addons": [
      "@xterm/addon-fit",
      "@xterm/addon-web-links",
      "@xterm/addon-search",
      "@xterm/addon-webgl"
    ],
    "pty": "tauri-pty 0.1.1 (NPM + Rust plugin)"
  },
  "state": {
    "management": "Valtio (proxy-based reactive)",
    "events": "EventEmitter3 or mitt",
    "persistence": "IndexedDB (browser-native)"
  },
  "monitoring": {
    "rust": "sysinfo crate",
    "ipc": "Tauri events"
  }
}
```

---

## Event Bus Architecture

### Core Event System
Using EventEmitter3 or mitt for lightweight event handling:

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

This architecture enables:
- Decoupled components (agents can work independently)
- Future WebSocket integration (just pipe events through socket)
- Undo/redo system (record all events)
- Activity logging
- Plugin system later

---

## Data Models (Complete)

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

## Component Architecture

```
src/
├── App.tsx                      # Main app, layout
├── components/
│   ├── Timeline/
│   │   ├── Timeline.tsx         # Main timeline canvas
│   │   ├── TimelineControls.tsx # Zoom, navigation
│   │   ├── NowLine.tsx         # The NOW indicator
│   │   └── TimeAxis.tsx        # Time labels
│   ├── Tracks/
│   │   ├── Track.tsx           # Single track component
│   │   ├── TrackList.tsx       # All tracks container
│   │   └── TrackControls.tsx   # Add, remove, reorder
│   ├── Segments/
│   │   ├── Segment.tsx         # Base segment
│   │   ├── ActiveSegment.tsx   # Currently running
│   │   ├── AgentSegment.tsx    # Agent-specific
│   │   └── PlantedSegment.tsx  # Future scheduled
│   ├── Panels/
│   │   ├── BrowserPanel.tsx    # Web view
│   │   ├── TerminalPanel.tsx   # Terminal emulator
│   │   ├── ResourcePanel.tsx   # Performance monitor
│   │   └── NotesPanel.tsx      # Markdown notes
│   └── UI/
│       ├── ThemeProvider.tsx   # Dark/light mode
│       ├── Toolbar.tsx         # Top toolbar
│       └── ContextMenu.tsx     # Right-click menus
├── stores/
│   ├── timeline.store.ts       # Timeline state
│   ├── tracks.store.ts         # Tracks management
│   ├── segments.store.ts       # Segments CRUD
│   └── metrics.store.ts        # Resource monitoring
├── lib/
│   ├── persistence.ts          # Save/load state
│   ├── shortcuts.ts            # Keyboard handlers
│   └── utils.ts               # Helper functions
└── styles/
    ├── globals.css             # Global styles
    └── themes.css              # Theme variables
```

---

## Critical Success Metrics

### Performance
- [ ] <100ms response time for all interactions
- [ ] <500MB RAM with 10 active segments
- [ ] 30fps minimum for animations
- [ ] <1s cold start time

### Functionality
- [ ] Can manage 10+ parallel tracks
- [ ] Segments persist across restarts
- [ ] Timeline navigable to any point
- [ ] Resource monitor prevents >4GB usage

### Visual
- [ ] Screenshots look professional
- [ ] Smooth animations throughout
- [ ] Clear visual hierarchy
- [ ] Consistent design language

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

## Build Order

### Day 1 Morning (4 hours)
1. Scaffold Tauri app
2. Set up React + TypeScript + Tailwind
3. Create basic timeline canvas
4. Implement track creation
5. Basic segment creation at NOW
6. Simple persistence

**Checkpoint**: Working timeline with segments

### Day 1 Afternoon (6 hours)
- Launch 6 parallel agents
- Each works on their component
- Communicate via shared types

### Day 2 Morning (4 hours)
- Review agent work
- Fix integration issues
- Merge components

### Day 2 Afternoon (4 hours)
- Launch integration agents
- Polish UI
- Add animations

### Day 3 (8 hours)
- Bug fixes
- Performance optimization
- Create demo video
- Prepare launch

---

## Agent Instructions Template

```markdown
You are building [COMPONENT] for Maestro.

## Your Context
- You are Agent [N] of 6 working in parallel
- Tech stack: [see above]
- Design system: Dark mode, Linear-inspired, shadcn/ui

## Your Ownership
- Components: [list]
- Files: [list]
- State slices: [list]

## Your Dependencies
- Import types from: src/types/
- Use stores from: src/stores/
- Mock any missing dependencies

## Your Deliverables
1. Working component
2. Storybook stories
3. Basic tests
4. Clean TypeScript

## Do NOT Touch
- Other agents' components
- Core types (read-only)
- App.tsx (integration team only)
```

---

## Development Approach

### Testing Strategy: Pragmatic BDD

**Philosophy**: Test behavior, not implementation. Focus on user outcomes.

#### For Phase 1 (Core Foundation)
1. **Type-First Development**:
```typescript
// Define all types/interfaces FIRST
interface Track { /* ... */ }
interface Segment { /* ... */ }
// These become contracts that can't break
```

2. **Core Behavior Tests** (essential):
```typescript
// Test critical user paths
test('creating a track adds it to the timeline', () => {})
test('clicking NOW creates a segment that extends', () => {})
test('segments persist to IndexedDB and restore', () => {})
test('closing a segment sets endTime', () => {})
```

3. **Visual Testing** (optional but nice):
```typescript
// Use Storybook for component development
export const TimelineWithTracks: Story = {
  args: { tracks: mockTracks }
}
```

#### What NOT to Test in MVP
- Don't test React Flow internals
- Don't test UI animations
- Don't test every edge case
- Don't aim for 100% coverage

#### Test Structure
```
src/
├── __tests__/
│   ├── timeline.test.ts    # Timeline behaviors
│   ├── segments.test.ts    # Segment lifecycle
│   └── persistence.test.ts # IndexedDB save/load
├── components/
│   └── Timeline/
│       ├── Timeline.tsx
│       └── Timeline.stories.tsx  # Visual testing
```

### Code Quality Rules

1. **TypeScript Strict Mode** - No `any` types
2. **State Updates via Valtio** - Never mutate directly
3. **Every component gets an interface** for props
4. **Comments only for "why", not "what"**
5. **One component = one responsibility**

### Performance Constraints
- Timeline must handle 100+ segments without lag
- Animations stay at 30fps minimum
- Initial load under 1 second
- Use React.memo() for expensive components

---

## Quick Start Commands

```bash
# Create Maestro with Tauri + React + TypeScript + Vite in one command
npm create tauri-app@latest maestro -- --template react-ts

# Navigate to the project
cd maestro

# Install core dependencies
npm install @tauri-apps/api reactflow valtio @tanstack/virtual animejs framer-motion

# Terminal libraries (same stack as Termius/Hyper/VS Code)
npm install xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search xterm-addon-webgl

# CRITICAL: Import required CSS files!
# Add to src/main.tsx or src/App.tsx:
# import 'reactflow/dist/style.css';
# import 'xterm/css/xterm.css';

# Install UI dependencies
npm install -D tailwindcss@next postcss autoprefixer
npm install @radix-ui/react-* lucide-react clsx tailwind-merge

# Initialize Tailwind CSS 4
npx tailwindcss init -p

# Install and initialize shadcn/ui
npx shadcn@latest init -d

# When prompted by shadcn:
# - Would you like to use TypeScript? → Yes
# - Which style would you like to use? → Default
# - Which color would you like to use as base color? → Slate (or your preference)
# - Where is your global CSS file? → src/index.css
# - Would you like to use CSS variables for colors? → Yes
# - Where is your tailwind.config.js located? → tailwind.config.js
# - Configure the import alias? → src/*

# Add shadcn components
npx shadcn@latest add button card tabs dialog separator

# Install Rust dependencies (add to src-tauri/Cargo.toml):
# [dependencies]
# sysinfo = "0.30"        # For resource monitoring
# portable-pty = "0.8"    # For terminal PTY support (like node-pty)

# Run development server
npm run tauri dev
```

### Alternative: Clone a Starter Template
If you want an even faster start with Tailwind + shadcn already configured:

```bash
# Clone this well-architected template with React + TypeScript + Tailwind + shadcn
git clone https://github.com/MrLightful/create-tauri-core maestro
cd maestro
npm install

# Add our specific dependencies
npm install reactflow @xyflow/react xterm framer-motion valtio @tanstack/virtual animejs

# Run
npm run tauri dev
```

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
- The single source of truth
- What all agents reference
- Continuously updated
- Version controlled

## Next Steps
1. Review and refine this spec
2. Create Tauri scaffold
3. Build Phase 1 manually
4. Launch parallel agents
5. Ship MVP in 72 hours
