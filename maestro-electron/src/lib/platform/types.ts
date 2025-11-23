/**
 * Platform abstraction types
 *
 * This file defines the types used across both Tauri and Electron implementations.
 */

// ============================================================================
// Browser Types
// ============================================================================

export interface BrowserViewOptions {
  label: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserNavigationEvent {
  label: string;
  url: string;
}

// ============================================================================
// Terminal Types
// ============================================================================

export interface TerminalOptions {
  cols: number;
  rows: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface Terminal {
  onData(handler: (data: string) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  onExit(handler: (exitCode: { exitCode: number }) => void): void;
  kill?(): void;
}

// ============================================================================
// Resource Monitor Types
// ============================================================================

export interface SystemMetrics {
  total_ram: number; // in MB
  used_ram: number; // in MB
  total_cpu: number; // percentage
  process_count: number;
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  ram: number; // in MB
  cpu: number; // percentage
}

export interface SegmentResourceMetrics {
  segment_id: string;
  ram: number; // in MB
  cpu: number; // percentage
  processes: ProcessMetrics[];
  last_updated: string;
}

// ============================================================================
// IPC Types
// ============================================================================

export type UnlistenFn = () => void;
