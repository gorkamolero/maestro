import { ipcMain, BrowserWindow } from 'electron';
import { spawn } from 'node-pty';

const ptyProcesses = new Map();
let ptyIdCounter = 0;

export function registerTerminalHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('pty-spawn', (_event, { shell, args, options }) => {
    const ptyId = `pty-${ptyIdCounter++}`;
    const ptyProcess = spawn(shell, args, options);

    ptyProcesses.set(ptyId, ptyProcess);

    // Forward data to renderer
    ptyProcess.onData((data) => {
      getMainWindow()?.webContents.send(`pty-data-${ptyId}`, data);
    });

    // Forward exit event
    ptyProcess.onExit((exitCode) => {
      getMainWindow()?.webContents.send(`pty-exit-${ptyId}`, exitCode);
      ptyProcesses.delete(ptyId);
    });

    return ptyId;
  });

  ipcMain.on('pty-write', (_event, ptyId, data) => {
    const ptyProcess = ptyProcesses.get(ptyId);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  ipcMain.on('pty-resize', (_event, ptyId, options) => {
    const ptyProcess = ptyProcesses.get(ptyId);
    if (ptyProcess) {
      ptyProcess.resize(options.cols, options.rows);
    }
  });

  ipcMain.on('pty-kill', (_event, ptyId) => {
    const ptyProcess = ptyProcesses.get(ptyId);
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcesses.delete(ptyId);
    }
  });
}
