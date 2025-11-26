import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

// ============================================================================
// Expose Electron APIs to renderer
// ============================================================================

contextBridge.exposeInMainWorld('electron', {
  // IPC invoke (for request-response)
  invoke: (channel: string, args?: unknown) => ipcRenderer.invoke(channel, args),

  // IPC send (for one-way messages to main)
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args);
  },

  // IPC on (for events from main)
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});

// ============================================================================
// Expose Agent API for Claude Code integration
// ============================================================================

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

interface AgentStatusEvent {
  sessionId: string;
  status: string;
  currentTool?: string;
  currentFile?: string;
  error?: string;
  costUSD?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
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

// Happy Coder types
interface HappyDetectionResult {
  isInstalled: boolean;
  version?: string;
  path?: string;
  error?: string;
}

interface HappySessionInfo {
  sessionId: string;
  startedAt: string;
  trackName?: string;
  trackIcon?: string;
}

contextBridge.exposeInMainWorld('agent', {
  // Session control
  start: (options: AgentStartOptions) =>
    ipcRenderer.invoke('agent:start', options),

  stop: (sessionId: string) =>
    ipcRenderer.invoke('agent:stop', { sessionId }),

  isActive: (sessionId: string) =>
    ipcRenderer.invoke('agent:is-active', { sessionId }),

  // Event subscriptions
  onStatus: (callback: (data: AgentStatusEvent) => void) => {
    const handler = (_: IpcRendererEvent, data: AgentStatusEvent) => callback(data);
    ipcRenderer.on('agent:status', handler);
    return () => ipcRenderer.removeListener('agent:status', handler);
  },

  onTerminalLine: (callback: (data: AgentTerminalLineEvent) => void) => {
    const handler = (_: IpcRendererEvent, data: AgentTerminalLineEvent) => callback(data);
    ipcRenderer.on('agent:terminal-line', handler);
    return () => ipcRenderer.removeListener('agent:terminal-line', handler);
  },

  onNotification: (callback: (data: AgentNotificationEvent) => void) => {
    const handler = (_: IpcRendererEvent, data: AgentNotificationEvent) => callback(data);
    ipcRenderer.on('agent:notification', handler);
    return () => ipcRenderer.removeListener('agent:notification', handler);
  },

  // PTY mode (raw terminal data for xterm.js)
  onPtyData: (callback: (data: AgentPtyDataEvent) => void) => {
    const handler = (_: IpcRendererEvent, data: AgentPtyDataEvent) => callback(data);
    ipcRenderer.on('agent:pty-data', handler);
    return () => ipcRenderer.removeListener('agent:pty-data', handler);
  },

  ptyResize: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('agent:pty-resize', { sessionId, cols, rows }),

  ptyWrite: (sessionId: string, data: string) =>
    ipcRenderer.invoke('agent:pty-write', { sessionId, data }),

  // Analytics
  analytics: {
    start: () => ipcRenderer.invoke('agent:analytics-start'),
    stop: () => ipcRenderer.invoke('agent:analytics-stop'),
    get: (sessionId?: string) => ipcRenderer.invoke('agent:analytics-get', { sessionId }),
    getTotalCost: () => ipcRenderer.invoke('agent:analytics-total-cost'),
    listSessions: () => ipcRenderer.invoke('agent:analytics-list-sessions'),
    readHistory: (sessionId: string) => ipcRenderer.invoke('agent:analytics-read-history', { sessionId }),

    onUpdate: (callback: (data: SessionAnalytics) => void) => {
      const handler = (_: IpcRendererEvent, data: SessionAnalytics) => callback(data);
      ipcRenderer.on('agent:analytics', handler);
      return () => ipcRenderer.removeListener('agent:analytics', handler);
    },
  },
});

// ============================================================================
// Expose Happy Coder API for mobile companion integration
// ============================================================================

contextBridge.exposeInMainWorld('happy', {
  /**
   * Detect if Happy Coder CLI is installed
   */
  detect: (): Promise<HappyDetectionResult> =>
    ipcRenderer.invoke('happy:detect'),

  /**
   * Clear detection cache (call after user installs)
   */
  clearCache: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('happy:clear-cache'),

  /**
   * Get active Happy session count and info
   */
  getActiveSessions: (): Promise<{ count: number; sessions: HappySessionInfo[] }> =>
    ipcRenderer.invoke('happy:active-sessions'),

  /**
   * Check if a specific session is using Happy
   */
  isHappySession: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('happy:is-session', { sessionId }),

  /**
   * Get Happy web app URL for QR pairing
   */
  getWebAppUrl: (customUrl?: string): Promise<string> =>
    ipcRenderer.invoke('happy:get-webapp-url', { customUrl }),

  /**
   * Get installation instructions
   */
  getInstallInstructions: (): Promise<string> =>
    ipcRenderer.invoke('happy:install-instructions'),
});

// ============================================================================
// Expose PTY API via IPC (node-pty runs in main process)
// ============================================================================

interface PtySpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

contextBridge.exposeInMainWorld('pty', {
  spawn: async (shell: string, args: string[], options: PtySpawnOptions) => {
    // Request main process to spawn a PTY
    const ptyId = await ipcRenderer.invoke('pty-spawn', { shell, args, options });

    // Return wrapper object that communicates via IPC
    return {
      onData: (callback: (data: string) => void) => {
        const listener = (_event: IpcRendererEvent, data: string) => callback(data);
        ipcRenderer.on(`pty-data-${ptyId}`, listener);
        // Return cleanup function
        return () => ipcRenderer.removeListener(`pty-data-${ptyId}`, listener);
      },
      write: (data: string) => {
        ipcRenderer.send('pty-write', ptyId, data);
      },
      resize: (cols: number, rows: number) => {
        ipcRenderer.send('pty-resize', ptyId, { cols, rows });
      },
      onExit: (callback: (exitCode: { exitCode: number }) => void) => {
        const listener = (_event: IpcRendererEvent, exitCode: { exitCode: number }) => callback(exitCode);
        ipcRenderer.on(`pty-exit-${ptyId}`, listener);
        return () => ipcRenderer.removeListener(`pty-exit-${ptyId}`, listener);
      },
      kill: () => {
        ipcRenderer.send(`pty-kill-${ptyId}`);
      },
    };
  },
});
