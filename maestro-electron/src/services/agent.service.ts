import { BrowserWindow } from 'electron';
import { spawn, type ChildProcess } from 'child_process';
import stripAnsi from 'strip-ansi';

// Types matching the agent store
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

type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';

interface AgentOptions {
  sessionId: string;
  workDir: string;
  prompt: string;
  permissionMode: PermissionMode;
  window: BrowserWindow;
}

interface ActiveSession {
  process: ChildProcess | null;
  aborted: boolean;
}

/**
 * AgentService manages Claude Code agent sessions.
 *
 * This service spawns the Claude CLI as a subprocess and streams events
 * back to the renderer process via IPC.
 *
 * When the actual Claude Agent SDK becomes available, replace the CLI
 * spawning with direct SDK integration.
 */
export class AgentService {
  private sessions = new Map<string, ActiveSession>();

  // Enable mock mode for development/testing without real CLI
  private mockMode = process.env.AGENT_MOCK === 'true' || process.env.NODE_ENV === 'development';

  async startSession({ sessionId, workDir, prompt, permissionMode, window }: AgentOptions) {
    console.log('[AgentService] Starting session:', { sessionId, workDir, prompt: prompt.slice(0, 50), permissionMode, mockMode: this.mockMode });

    // Emit starting event
    this.emit(window, sessionId, { status: 'starting' as AgentStatus });
    this.emitTerminalLine(window, sessionId, '● Starting Claude agent...');

    const session: ActiveSession = {
      process: null,
      aborted: false,
    };
    this.sessions.set(sessionId, session);

    // Use mock mode in development
    if (this.mockMode) {
      console.log('[AgentService] Running in MOCK MODE');
      this.emitTerminalLine(window, sessionId, '! Running in mock mode (development)');
      await this.runMockSession(sessionId, prompt, window, session);
      return;
    }

    try {
      // Build Claude CLI arguments based on permission mode
      const args = this.buildClaudeArgs(prompt, permissionMode);
      console.log('[AgentService] Spawning claude with args:', args);
      this.emitTerminalLine(window, sessionId, `> claude ${args.join(' ')}`);

      // Spawn Claude CLI process
      const claudeProcess = spawn('claude', args, {
        cwd: workDir,
        env: {
          ...process.env,
          // Force non-interactive mode
          CI: 'true',
          TERM: 'xterm-256color',
        },
        shell: true,
      });

      console.log('[AgentService] Process spawned, PID:', claudeProcess.pid);

      session.process = claudeProcess;

      // Track current state for status detection
      let currentStatus: AgentStatus = 'thinking';

      // Handle stdout
      claudeProcess.stdout?.on('data', (data: Buffer) => {
        if (session.aborted) return;

        const text = data.toString();
        console.log('[AgentService] stdout:', text.slice(0, 200));

        // Parse Claude CLI output to detect status changes
        const { status, line } = this.parseOutput(text, currentStatus);

        if (status !== currentStatus) {
          currentStatus = status;
          console.log('[AgentService] Status changed to:', status);
          this.emit(window, sessionId, { status });
        }

        if (line) {
          this.emitTerminalLine(window, sessionId, line);
        }
      });

      // Handle stderr
      claudeProcess.stderr?.on('data', (data: Buffer) => {
        if (session.aborted) return;

        const text = stripAnsi(data.toString()).trim();
        console.log('[AgentService] stderr:', text.slice(0, 200));
        if (text) {
          this.emitTerminalLine(window, sessionId, `! ${text}`);
        }
      });

      // Handle process exit
      claudeProcess.on('close', (code) => {
        console.log('[AgentService] Process exited with code:', code);
        if (session.aborted) return;

        if (code === 0) {
          this.emit(window, sessionId, { status: 'completed' as AgentStatus });
          this.emitTerminalLine(window, sessionId, '✓ Task completed');
        } else {
          this.emit(window, sessionId, {
            status: 'error' as AgentStatus,
            error: `Process exited with code ${code}`,
          });
          this.emitTerminalLine(window, sessionId, `✕ Exited with code ${code}`);
        }

        this.sessions.delete(sessionId);
      });

      // Handle process errors
      claudeProcess.on('error', (err) => {
        console.error('[AgentService] Process error:', err.message);
        if (session.aborted) return;

        this.emit(window, sessionId, {
          status: 'error' as AgentStatus,
          error: err.message,
        });
        this.emitTerminalLine(window, sessionId, `✕ Error: ${err.message}`);
        this.sessions.delete(sessionId);
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (!session.aborted) {
        this.emit(window, sessionId, {
          status: 'error' as AgentStatus,
          error: errorMessage,
        });
        this.emitTerminalLine(window, sessionId, `✕ Error: ${errorMessage}`);
      }

      this.sessions.delete(sessionId);
    }
  }

  private buildClaudeArgs(prompt: string, permissionMode: PermissionMode): string[] {
    const args: string[] = [];

    // Add prompt
    args.push('-p', prompt);

    // Add permission mode flags
    switch (permissionMode) {
      case 'acceptEdits':
        args.push('--dangerously-skip-permissions');
        break;
      case 'planOnly':
        args.push('--plan');
        break;
      case 'askUser':
        // Default behavior - will prompt for permissions
        break;
    }

    // Add output format for easier parsing
    args.push('--output-format', 'stream-json');

    return args;
  }

  private parseOutput(text: string, currentStatus: AgentStatus): { status: AgentStatus; line: string | null } {
    const cleanText = stripAnsi(text).trim();

    // Try to parse as JSON (stream-json format)
    try {
      const lines = cleanText.split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('{')) {
          const event = JSON.parse(line);
          return this.parseJsonEvent(event);
        }
      }
    } catch {
      // Not JSON, parse as plain text
    }

    // Plain text parsing fallback
    if (cleanText.includes('Thinking') || cleanText.includes('thinking')) {
      return { status: 'thinking', line: `● ${cleanText.slice(0, 80)}` };
    }
    if (cleanText.includes('Writing') || cleanText.includes('Editing')) {
      return { status: 'editing', line: `● ${cleanText.slice(0, 80)}` };
    }
    if (cleanText.includes('Running') || cleanText.includes('$')) {
      return { status: 'running-command', line: `> ${cleanText.slice(0, 80)}` };
    }
    if (cleanText.includes('Reading')) {
      return { status: 'thinking', line: `○ ${cleanText.slice(0, 80)}` };
    }

    // Default: keep current status, emit line if non-empty
    return {
      status: currentStatus,
      line: cleanText ? cleanText.slice(0, 100) : null,
    };
  }

  private parseJsonEvent(event: Record<string, unknown>): { status: AgentStatus; line: string | null } {
    const type = event.type as string;

    switch (type) {
      case 'assistant':
        return { status: 'thinking', line: null };

      case 'tool_use': {
        const toolName = event.name as string;
        const input = event.input as Record<string, unknown> | undefined;

        if (toolName === 'Bash') {
          const command = input?.command as string || 'command';
          return { status: 'running-command', line: `> ${command.slice(0, 80)}` };
        }
        if (toolName === 'Write' || toolName === 'Edit') {
          const filePath = (input?.file_path || input?.path) as string || 'file';
          return { status: 'editing', line: `● Editing ${filePath}` };
        }
        if (toolName === 'Read') {
          const filePath = (input?.file_path || input?.path) as string || 'file';
          return { status: 'thinking', line: `○ Reading ${filePath}` };
        }
        return { status: 'thinking', line: `● Using ${toolName}` };
      }

      case 'tool_result': {
        const isError = event.is_error as boolean;
        return {
          status: 'thinking',
          line: isError ? '✕ Tool failed' : '✓ Tool completed',
        };
      }

      default:
        return { status: 'thinking', line: null };
    }
  }

  private emit(window: BrowserWindow, sessionId: string, data: Record<string, unknown>) {
    if (!window.isDestroyed()) {
      window.webContents.send('agent:status', { sessionId, ...data });
    }
  }

  private emitTerminalLine(window: BrowserWindow, sessionId: string, line: string) {
    if (!window.isDestroyed()) {
      window.webContents.send('agent:terminal-line', { sessionId, line });
    }
  }

  /**
   * Mock session for development/testing without the real Claude CLI.
   * Simulates a realistic agent workflow with thinking, reading, editing, and commands.
   */
  private async runMockSession(
    sessionId: string,
    prompt: string,
    window: BrowserWindow,
    session: ActiveSession
  ) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const mockSteps = [
      { status: 'thinking' as AgentStatus, line: '● Analyzing request...', delay: 800 },
      { status: 'thinking' as AgentStatus, line: `○ Reading CLAUDE.md`, delay: 600 },
      { status: 'thinking' as AgentStatus, line: `○ Reading package.json`, delay: 400 },
      { status: 'thinking' as AgentStatus, line: '● Planning approach...', delay: 1000 },
      { status: 'running-command' as AgentStatus, line: '> git status', delay: 500 },
      { status: 'thinking' as AgentStatus, line: '✓ Command completed', delay: 300 },
      { status: 'editing' as AgentStatus, line: '● Editing src/components/Example.tsx', delay: 1200 },
      { status: 'thinking' as AgentStatus, line: '✓ File saved', delay: 300 },
      { status: 'running-command' as AgentStatus, line: '> pnpm lint', delay: 800 },
      { status: 'thinking' as AgentStatus, line: '✓ Lint passed', delay: 300 },
      { status: 'thinking' as AgentStatus, line: '● Reviewing changes...', delay: 600 },
      { status: 'completed' as AgentStatus, line: '✓ Task completed successfully', delay: 0 },
    ];

    for (const step of mockSteps) {
      if (session.aborted) {
        console.log('[AgentService] Mock session aborted');
        return;
      }

      this.emit(window, sessionId, { status: step.status });
      this.emitTerminalLine(window, sessionId, step.line);

      if (step.delay > 0) {
        await sleep(step.delay);
      }
    }

    this.sessions.delete(sessionId);
    console.log('[AgentService] Mock session completed');
  }

  stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.aborted = true;
      if (session.process) {
        session.process.kill('SIGTERM');
      }
      this.sessions.delete(sessionId);
    }
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

// Singleton instance
export const agentService = new AgentService();
