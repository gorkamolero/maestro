import { ipcMain, BrowserWindow } from 'electron';
import { agentService } from '../services/agent.service';

type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';

interface StartAgentOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: PermissionMode;
}

export function registerAgentHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('agent:start', async (_, options: StartAgentOptions) => {
    const window = getMainWindow();
    if (!window) {
      return { success: false, error: 'No window available' };
    }

    const { sessionId, workDir, prompt, permissionMode } = options;

    // Run in background (don't await - let it stream events)
    agentService.startSession({
      sessionId,
      workDir,
      prompt,
      permissionMode,
      window,
    });

    return { success: true };
  });

  ipcMain.handle('agent:stop', async (_, { sessionId }: { sessionId: string }) => {
    agentService.stopSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('agent:is-active', async (_, { sessionId }: { sessionId: string }) => {
    return agentService.isSessionActive(sessionId);
  });
}
