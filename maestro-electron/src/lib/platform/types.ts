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
  /** Session partition for profile isolation (e.g., 'persist:profile-123') */
  partition?: string;
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
// IPC Types
// ============================================================================

export type UnlistenFn = () => void;
