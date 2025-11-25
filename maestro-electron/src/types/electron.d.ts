// TypeScript declarations for Electron preload API

type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';

interface AgentStartOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: PermissionMode;
}

interface AgentStatusEvent {
  sessionId: string;
  status: string;
  currentTool?: string;
  currentFile?: string;
  error?: string;
}

interface AgentTerminalLineEvent {
  sessionId: string;
  line: string;
}

interface AgentAPI {
  start: (options: AgentStartOptions) => Promise<{ success: boolean; error?: string }>;
  stop: (sessionId: string) => Promise<{ success: boolean }>;
  isActive: (sessionId: string) => Promise<boolean>;
  onStatus: (callback: (data: AgentStatusEvent) => void) => () => void;
  onTerminalLine: (callback: (data: AgentTerminalLineEvent) => void) => () => void;
}

interface ElectronAPI {
  invoke: (channel: string, args?: unknown) => Promise<unknown>;
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

interface PtySpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

interface PtyInstance {
  onData: (callback: (data: string) => void) => () => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  onExit: (callback: (exitCode: { exitCode: number }) => void) => () => void;
  kill: () => void;
}

interface PtyAPI {
  spawn: (shell: string, args: string[], options: PtySpawnOptions) => Promise<PtyInstance>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    agent: AgentAPI;
    pty: PtyAPI;
  }
}

export {};
