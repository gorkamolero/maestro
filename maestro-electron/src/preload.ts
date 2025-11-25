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

contextBridge.exposeInMainWorld('agent', {
  start: (options: AgentStartOptions) =>
    ipcRenderer.invoke('agent:start', options),

  stop: (sessionId: string) =>
    ipcRenderer.invoke('agent:stop', { sessionId }),

  isActive: (sessionId: string) =>
    ipcRenderer.invoke('agent:is-active', { sessionId }),

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
