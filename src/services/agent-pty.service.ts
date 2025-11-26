import { BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import stripAnsi from 'strip-ansi';
import { happyService } from './happy.service';

type AgentStatus =
  | 'idle'
  | 'starting'
  | 'thinking'
  | 'editing'
  | 'running-command'
  | 'waiting'
  | 'completed'
  | 'error'
  | 'stopped';

interface PtySessionOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: 'acceptEdits' | 'askUser' | 'planOnly';
  window: BrowserWindow;
  /** Use Happy Coder for mobile access (defaults to checking settings) */
  useHappy?: boolean;
  /** Happy Coder settings */
  happySettings?: {
    serverUrl?: string;
    webappUrl?: string;
    trackName?: string;
    trackIcon?: string;
  };
}

interface ActivePtySession {
  pty: pty.IPty;
  sessionId: string;
  /** Whether this session is using Happy Coder */
  isHappySession: boolean;
}

/**
 * AgentPtyService provides raw terminal mode for Claude Code sessions.
 *
 * This service spawns Claude CLI in a PTY (pseudo-terminal), enabling
 * full xterm.js rendering in the renderer process. Use this when users
 * want the complete terminal experience rather than just status updates.
 */
export class AgentPtyService {
  private sessions = new Map<string, ActivePtySession>();

  async startSession({
    sessionId,
    workDir,
    prompt,
    permissionMode,
    window,
    useHappy = true,
    happySettings,
  }: PtySessionOptions) {
    // Determine which command to use (happy or claude)
    const command = await happyService.getCommand(useHappy);
    const isHappySession = command === 'happy';

    console.log('[AgentPtyService] Starting PTY session:', {
      sessionId,
      workDir,
      prompt: prompt.slice(0, 50),
      permissionMode,
      command,
      isHappySession,
    });

    // Build CLI arguments
    const args = ['-p', prompt];

    switch (permissionMode) {
      case 'acceptEdits':
        args.push('--dangerously-skip-permissions');
        break;
      case 'planOnly':
        args.push('--plan');
        break;
      // 'askUser' is default behavior
    }

    // Build environment with Happy-specific vars if applicable
    const happyEnv = isHappySession
      ? happyService.buildHappyEnv(happySettings)
      : {};

    // Spawn Claude/Happy in PTY
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: workDir,
      env: {
        ...process.env,
        ...happyEnv,
        TERM: 'xterm-256color',
        // Force color output
        FORCE_COLOR: '1',
      },
    });

    const session: ActivePtySession = {
      pty: ptyProcess,
      sessionId,
      isHappySession,
    };
    this.sessions.set(sessionId, session);

    // Track Happy session for status reporting
    if (isHappySession) {
      happyService.registerSession(sessionId, {
        startedAt: new Date().toISOString(),
        trackName: happySettings?.trackName,
        trackIcon: happySettings?.trackIcon,
      });
    }

    // Emit initial status
    this.emitStatus(window, sessionId, 'starting');

    // Track current status for detection
    let currentStatus: AgentStatus = 'thinking';

    // Forward PTY data to renderer
    ptyProcess.onData((data) => {
      // Send raw data for xterm.js rendering
      if (!window.isDestroyed()) {
        window.webContents.send('agent:pty-data', { sessionId, data });
      }

      // Also parse for status detection
      const cleanText = stripAnsi(data);
      const detectedStatus = this.detectStatus(cleanText, currentStatus);

      if (detectedStatus !== currentStatus) {
        currentStatus = detectedStatus;
        this.emitStatus(window, sessionId, detectedStatus);
      }
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      console.log('[AgentPtyService] PTY exited:', exitCode);

      if (exitCode === 0) {
        this.emitStatus(window, sessionId, 'completed');
      } else {
        this.emitStatus(window, sessionId, 'error', `Exit code ${exitCode}`);
      }

      // Clean up Happy session tracking
      if (isHappySession) {
        happyService.unregisterSession(sessionId);
      }

      this.sessions.delete(sessionId);
    });

    return ptyProcess;
  }

  /**
   * Resize the PTY (call when terminal dimensions change)
   */
  resize(sessionId: string, cols: number, rows: number) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  /**
   * Write input to the PTY (for interactive sessions)
   */
  write(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
    }
  }

  /**
   * Stop the PTY session
   */
  stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log('[AgentPtyService] Killing PTY:', sessionId);
      session.pty.kill();

      // Clean up Happy session tracking
      if (session.isHappySession) {
        happyService.unregisterSession(sessionId);
      }

      this.sessions.delete(sessionId);
    }
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Check if a session is using Happy Coder
   */
  isHappySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isHappySession ?? false;
  }

  /**
   * Get active Happy session count
   */
  getActiveHappySessionCount(): number {
    return happyService.getActiveSessionCount();
  }

  private emitStatus(window: BrowserWindow, sessionId: string, status: AgentStatus, error?: string) {
    if (!window.isDestroyed()) {
      window.webContents.send('agent:status', { sessionId, status, error });
    }
  }

  /**
   * Detect agent status from terminal output
   */
  private detectStatus(text: string, currentStatus: AgentStatus): AgentStatus {
    const lowerText = text.toLowerCase();

    // Check for completion indicators
    if (lowerText.includes('task completed') || lowerText.includes('done')) {
      return 'completed';
    }

    // Check for error indicators
    if (lowerText.includes('error:') || lowerText.includes('failed')) {
      return 'error';
    }

    // Check for tool use indicators
    if (text.includes('$') || text.includes('>') || lowerText.includes('running')) {
      return 'running-command';
    }

    if (lowerText.includes('editing') || lowerText.includes('writing')) {
      return 'editing';
    }

    if (lowerText.includes('reading') || lowerText.includes('searching')) {
      return 'thinking';
    }

    if (lowerText.includes('thinking') || lowerText.includes('analyzing')) {
      return 'thinking';
    }

    // Default to current status
    return currentStatus;
  }
}

// Singleton instance
export const agentPtyService = new AgentPtyService();
