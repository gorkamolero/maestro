import { BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import stripAnsi from 'strip-ansi';

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
}

interface ActivePtySession {
  pty: pty.IPty;
  sessionId: string;
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

  startSession({ sessionId, workDir, prompt, permissionMode, window }: PtySessionOptions) {
    console.log('[AgentPtyService] Starting PTY session:', {
      sessionId,
      workDir,
      prompt: prompt.slice(0, 50),
      permissionMode,
    });

    // Build Claude CLI arguments
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

    // Spawn Claude in PTY
    const ptyProcess = pty.spawn('claude', args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: workDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        // Force color output
        FORCE_COLOR: '1',
      },
    });

    const session: ActivePtySession = {
      pty: ptyProcess,
      sessionId,
    };
    this.sessions.set(sessionId, session);

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
      this.sessions.delete(sessionId);
    }
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
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
