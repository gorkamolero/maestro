import { contextBridge, ipcRenderer } from 'electron';

// ============================================================================
// Expose Electron APIs to renderer
// ============================================================================

contextBridge.exposeInMainWorld('electron', {
  // IPC invoke (for request-response)
  invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),

  // IPC on (for events)
  on: (channel: string, callback: (payload: any) => void) => {
    const subscription = (_event: any, payload: any) => {
      if (payload !== undefined) {
        callback(payload);
      }
    };
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});

// ============================================================================
// Expose PTY API via IPC (node-pty runs in main process)
// ============================================================================

contextBridge.exposeInMainWorld('pty', {
  spawn: async (shell: string, args: string[], options: any) => {
    // Request main process to spawn a PTY
    const ptyId = await ipcRenderer.invoke('pty-spawn', { shell, args, options });

    // Return wrapper object that communicates via IPC
    return {
      onData: (callback: (data: string) => void) => {
        const listener = (_event: any, data: string) => callback(data);
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
        const listener = (_event: any, exitCode: { exitCode: number }) => callback(exitCode);
        ipcRenderer.on(`pty-exit-${ptyId}`, listener);
        return () => ipcRenderer.removeListener(`pty-exit-${ptyId}`, listener);
      },
      kill: () => {
        ipcRenderer.send(`pty-kill-${ptyId}`);
      },
    };
  },
});
