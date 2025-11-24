// Core Types
import type { Tab } from '@/stores/workspace.store';

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
  primaryColor: string;
  secondaryColor: string;
  icon?: string;
  segments: Segment[];
  markers: Marker[];
  preferredApps?: {
    browser?: string;
    terminal?: string;
    editor?: string;
  };
}

// Color palette for spaces - 8 professional color pairs
export const SPACE_COLOR_PALETTE = [
  { name: 'Indigo', primary: '#6366f1', secondary: '#4338ca' },
  { name: 'Emerald', primary: '#10b981', secondary: '#047857' },
  { name: 'Amber', primary: '#f59e0b', secondary: '#d97706' },
  { name: 'Rose', primary: '#f43f5e', secondary: '#e11d48' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#7c3aed' },
  { name: 'Cyan', primary: '#06b6d4', secondary: '#0891b2' },
  { name: 'Coral', primary: '#fb7185', secondary: '#f472b6' },
  { name: 'Sage', primary: '#84cc16', secondary: '#65a30d' },
] as const;

export interface Segment {
  id: string;
  spaceId: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  type: SegmentType;
  status: SegmentStatus;
  config: SegmentConfig;
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

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

// Drag and drop types
export type TabDropZone = 'favorites' | 'tabs';

export interface TabDragData {
  type: 'tab';
  tabId: string;
  sourceZone: TabDropZone;
  sourceIndex: number;
  tab: Tab; // Full tab object for preview
}

export interface DropZoneData {
  zoneType: TabDropZone;
  spaceId: string;
}
