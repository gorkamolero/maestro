import { ipcMain, BrowserWindow, app } from 'electron';
import { agentService } from '../services/agent.service';
import { agentPtyService } from '../services/agent-pty.service';
import { agentJsonlService } from '../services/agent-jsonl.service';
import { gitWorktreeService } from '../services/git-worktree.service';
import { happyService } from '../services/happy.service';

type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';

interface HappySettings {
  serverUrl?: string;
  webappUrl?: string;
  trackName?: string;
  trackIcon?: string;
}

interface StartAgentOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: PermissionMode;
  allowedTools?: string[];
  useWorktree?: boolean; // Enable git worktree isolation
  mode?: 'sdk' | 'pty'; // Default to 'sdk'
  /** Use Happy Coder for mobile access */
  useHappy?: boolean;
  /** Happy Coder configuration */
  happySettings?: HappySettings;
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

    const {
      sessionId,
      workDir,
      prompt,
      permissionMode,
      allowedTools,
      useWorktree = false,
      mode = 'sdk',
      useHappy = true,
      happySettings,
    } = options;

    // Optionally create git worktree for session isolation
    let effectiveWorkDir = workDir;
    let worktreePath: string | undefined;

    if (useWorktree) {
      effectiveWorkDir = await gitWorktreeService.createWorktree(sessionId, workDir);
      if (effectiveWorkDir !== workDir) {
        worktreePath = effectiveWorkDir;
      }
    }

    // Check if Happy is installed (for response metadata)
    const happyDetection = await happyService.detectInstallation();

    if (mode === 'pty') {
      // Use PTY mode for raw terminal experience
      await agentPtyService.startSession({
        sessionId,
        workDir: effectiveWorkDir,
        prompt,
        permissionMode,
        window,
        useHappy,
        happySettings,
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

    return {
      success: true,
      worktreePath,
      happyEnabled: useHappy && happyDetection.isInstalled,
      happyVersion: happyDetection.version,
    };
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
  ipcMain.handle(
    'agent:merge-worktree',
    async (_, { sessionId, commitMessage }: { sessionId: string; commitMessage?: string }) => {
      const success = await gitWorktreeService.mergeWorktree(sessionId, commitMessage);
      return { success };
    }
  );

  // ============================================================================
  // PTY Mode Handlers
  // ============================================================================

  ipcMain.handle(
    'agent:pty-resize',
    async (_, { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
      agentPtyService.resize(sessionId, cols, rows);
      return { success: true };
    }
  );

  ipcMain.handle(
    'agent:pty-write',
    async (_, { sessionId, data }: { sessionId: string; data: string }) => {
      agentPtyService.write(sessionId, data);
      return { success: true };
    }
  );

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

  ipcMain.handle(
    'agent:analytics-read-history',
    async (_, { sessionId }: { sessionId: string }) => {
      return agentJsonlService.readSessionHistory(sessionId);
    }
  );

  // ============================================================================
  // Happy Coder Handlers
  // ============================================================================

  /**
   * Check if Happy Coder is installed
   */
  ipcMain.handle('happy:detect', async () => {
    return happyService.detectInstallation();
  });

  /**
   * Clear Happy detection cache (call after user installs)
   */
  ipcMain.handle('happy:clear-cache', async () => {
    happyService.clearCache();
    return { success: true };
  });

  /**
   * Get active Happy session count
   */
  ipcMain.handle('happy:active-sessions', async () => {
    return {
      count: happyService.getActiveSessionCount(),
      sessions: happyService.getActiveSessions(),
    };
  });

  /**
   * Check if a specific session is using Happy
   */
  ipcMain.handle('happy:is-session', async (_, { sessionId }: { sessionId: string }) => {
    return happyService.isHappySession(sessionId);
  });

  /**
   * Get Happy web app URL for QR pairing
   */
  ipcMain.handle('happy:get-webapp-url', async (_, { customUrl }: { customUrl?: string }) => {
    return happyService.getWebAppUrl(customUrl);
  });

  /**
   * Get installation instructions
   */
  ipcMain.handle('happy:install-instructions', async () => {
    return happyService.getInstallInstructions();
  });
}
