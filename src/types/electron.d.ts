// TypeScript declarations for Electron preload API

type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';
type AgentMode = 'sdk' | 'pty';

interface HappySettings {
  serverUrl?: string;
  webappUrl?: string;
  trackName?: string;
  trackIcon?: string;
}

interface AgentStartOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: PermissionMode;
  allowedTools?: string[];
  useWorktree?: boolean;
  mode?: AgentMode;
  /** Use Happy Coder for mobile access */
  useHappy?: boolean;
  /** Happy Coder configuration */
  happySettings?: HappySettings;
}

interface AgentUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface AgentStatusEvent {
  sessionId: string;
  status: string;
  currentTool?: string;
  currentFile?: string;
  error?: string;
  costUSD?: number;
  usage?: AgentUsage;
  subagentId?: string;
  subagentType?: string;
}

interface AgentTerminalLineEvent {
  sessionId: string;
  line: string;
}

interface AgentPtyDataEvent {
  sessionId: string;
  data: string;
}

interface AgentNotificationEvent {
  sessionId: string;
  type: string;
  title?: string;
  message: string;
}

interface SessionAnalytics {
  sessionId: string;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  messageCount: number;
  toolUseCount: number;
  durationMs: number;
  lastUpdated: string;
}

interface AgentAnalyticsAPI {
  start: () => Promise<{ success: boolean }>;
  stop: () => Promise<{ success: boolean }>;
  get: (sessionId?: string) => Promise<SessionAnalytics | SessionAnalytics[] | undefined>;
  getTotalCost: () => Promise<number>;
  listSessions: () => Promise<string[]>;
  readHistory: (sessionId: string) => Promise<unknown[]>;
  onUpdate: (callback: (data: SessionAnalytics) => void) => () => void;
}

interface AgentAPI {
  // Session control
  start: (options: AgentStartOptions) => Promise<{ success: boolean; error?: string; worktreePath?: string }>;
  stop: (sessionId: string) => Promise<{ success: boolean }>;
  isActive: (sessionId: string) => Promise<boolean>;

  // Event subscriptions
  onStatus: (callback: (data: AgentStatusEvent) => void) => () => void;
  onTerminalLine: (callback: (data: AgentTerminalLineEvent) => void) => () => void;
  onNotification: (callback: (data: AgentNotificationEvent) => void) => () => void;

  // PTY mode
  onPtyData: (callback: (data: AgentPtyDataEvent) => void) => () => void;
  ptyResize: (sessionId: string, cols: number, rows: number) => Promise<{ success: boolean }>;
  ptyWrite: (sessionId: string, data: string) => Promise<{ success: boolean }>;

  // Analytics
  analytics: AgentAnalyticsAPI;
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
