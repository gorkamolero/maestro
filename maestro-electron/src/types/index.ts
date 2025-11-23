// Core Types

export interface Workspace {
  id: string;
  name: string;
  spaces: Space[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Space {
  id: string;
  name: string;
  position: number;
  color: string;
  icon?: string;
  segments: Segment[];
  markers: Marker[];
  preferredApps?: {
    browser?: string;
    terminal?: string;
    editor?: string;
  };
}

export interface Segment {
  id: string;
  spaceId: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  type: SegmentType;
  status: SegmentStatus;
  config: SegmentConfig;
  metrics?: ResourceMetrics;
}

export type SegmentType = 'browser' | 'terminal' | 'agent' | 'note' | 'external' | 'planted';

export type SegmentStatus = 'active' | 'paused' | 'completed' | 'agent-working' | 'scheduled';

export interface SegmentConfig {
  // Browser
  urls?: string[];
  tabs?: BrowserTab[];

  // Terminal
  commands?: string[];
  workingDir?: string;
  env?: Record<string, string>;
  terminalBuffer?: string;
  terminalTheme?: 'termius-dark' | 'dracula' | 'nord';
  terminalScrollPosition?: number;

  // Agent
  agentType?: 'claude-code' | 'codex' | 'cursor';
  agentTask?: string;

  // External
  appName?: string;
  appPath?: string;
  files?: string[];

  // Planted
  trigger?: TriggerConfig;

  // Note
  content?: string;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

export interface TriggerConfig {
  type: 'time' | 'event' | 'manual';
  time?: Date;
  recurring?: 'daily' | 'weekly';
  eventId?: string;
}

export interface Marker {
  id: string;
  spaceId: string;
  time: Date;
  type: 'deadline' | 'milestone' | 'note';
  title: string;
  description?: string;
  color?: string;
}

export interface ResourceMetrics {
  ram: number; // in MB
  cpu: number; // percentage
  processes: number;
  lastUpdated: Date;
}

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

// Drag and drop types
export type TabDropZone = 'favorites' | 'tabs';

export interface TabDragData {
  type: 'tab';
  tabId: string;
  sourceZone: TabDropZone;
  sourceIndex: number;
  tab: any; // Full tab object for preview (using any to avoid circular dependency)
}

export interface DropZoneData {
  zoneType: TabDropZone;
  spaceId: string;
}
