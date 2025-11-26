import { ipcMain, BrowserWindow, app } from 'electron';
import { agentService } from '../services/agent.service';
import { agentPtyService } from '../services/agent-pty.service';
import { agentJsonlService } from '../services/agent-jsonl.service';
import { gitWorktreeService } from '../services/git-worktree.service';

type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';

interface StartAgentOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: PermissionMode;
  allowedTools?: string[];
  useWorktree?: boolean; // Enable git worktree isolation
  mode?: 'sdk' | 'pty'; // Default to 'sdk'
}

export function registerAgentHandlers(getMainWindow: () => BrowserWindow | null) {
  // Clean up worktrees on app quit
  app.on('before-quit', async () => {
    await gitWorktreeService.cleanupAll();
  });

  // ============================================================================
  // SDK Mode Handlers (default)
  // ============================================================================

  ipcMain.handle('agent:start', async (_, options: StartAgentOptions) => {
    const window = getMainWindow();
    if (!window) {
      return { success: false, error: 'No window available' };
    }

    const { sessionId, workDir, prompt, permissionMode, allowedTools, useWorktree = false, mode = 'sdk' } = options;

    // Optionally create git worktree for session isolation
    let effectiveWorkDir = workDir;
    let worktreePath: string | undefined;

    if (useWorktree) {
      effectiveWorkDir = await gitWorktreeService.createWorktree(sessionId, workDir);
      if (effectiveWorkDir !== workDir) {
        worktreePath = effectiveWorkDir;
      }
    }

    if (mode === 'pty') {
      // Use PTY mode for raw terminal experience
      agentPtyService.startSession({
        sessionId,
        workDir: effectiveWorkDir,
        prompt,
        permissionMode,
        window,
      });
    } else {
      // Use SDK mode for structured events (default)
      agentService.startSession({
        sessionId,
        workDir: effectiveWorkDir,
        prompt,
        permissionMode,
        allowedTools,
        window,
      });
    }

    return { success: true, worktreePath };
  });

  ipcMain.handle('agent:stop', async (_, { sessionId }: { sessionId: string }) => {
    // Stop in both services (only one will have the session)
    agentService.stopSession(sessionId);
    agentPtyService.stopSession(sessionId);

    // Clean up worktree if it was used
    await gitWorktreeService.removeWorktree(sessionId);

    return { success: true };
  });

  ipcMain.handle('agent:is-active', async (_, { sessionId }: { sessionId: string }) => {
    return agentService.isSessionActive(sessionId) || agentPtyService.isSessionActive(sessionId);
  });

  // Merge worktree changes back to original branch
  ipcMain.handle('agent:merge-worktree', async (_, { sessionId, commitMessage }: { sessionId: string; commitMessage?: string }) => {
    const success = await gitWorktreeService.mergeWorktree(sessionId, commitMessage);
    return { success };
  });

  // ============================================================================
  // PTY Mode Handlers
  // ============================================================================

  ipcMain.handle('agent:pty-resize', async (_, { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
    agentPtyService.resize(sessionId, cols, rows);
    return { success: true };
  });

  ipcMain.handle('agent:pty-write', async (_, { sessionId, data }: { sessionId: string; data: string }) => {
    agentPtyService.write(sessionId, data);
    return { success: true };
  });

  // ============================================================================
  // Analytics Handlers
  // ============================================================================

  ipcMain.handle('agent:analytics-start', async () => {
    const window = getMainWindow();
    if (window) {
      agentJsonlService.startWatching(window);
    }
    return { success: true };
  });

  ipcMain.handle('agent:analytics-stop', async () => {
    agentJsonlService.stopWatching();
    return { success: true };
  });

  ipcMain.handle('agent:analytics-get', async (_, { sessionId }: { sessionId?: string }) => {
    if (sessionId) {
      return agentJsonlService.getAnalytics(sessionId);
    }
    return agentJsonlService.getAllAnalytics();
  });

  ipcMain.handle('agent:analytics-total-cost', async () => {
    return agentJsonlService.getTotalCost();
  });

  ipcMain.handle('agent:analytics-list-sessions', async () => {
    return agentJsonlService.listSessions();
  });

  ipcMain.handle('agent:analytics-read-history', async (_, { sessionId }: { sessionId: string }) => {
    return agentJsonlService.readSessionHistory(sessionId);
  });
}
