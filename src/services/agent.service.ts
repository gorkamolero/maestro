import { BrowserWindow } from 'electron';
import {
  query,
  type Options,
  type SDKMessage,
  type PermissionMode as SDKPermissionMode,
  type HookCallback,
  type PreToolUseHookInput,
  type PostToolUseHookInput,
  type NotificationHookInput,
  type SessionStartHookInput,
  type SessionEndHookInput,
  type StopHookInput,
  type SubagentStartHookInput,
  type SubagentStopHookInput,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Get the path to the bundled Claude Code CLI.
 * Uses the @anthropic-ai/claude-code package installed as a dependency.
 * This CLI has access to the user's keychain auth from their interactive claude login.
 */
function getClaudeCodePath(): string {
  // Use require.resolve to find the installed package
  const cliPath = require.resolve('@anthropic-ai/claude-code/cli.js');
  console.log('[AgentService] Using bundled Claude Code CLI at:', cliPath);
  return cliPath;
}

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
  allowedTools?: string[];
  window: BrowserWindow;
}

interface ActiveSession {
  abortController: AbortController;
  sessionId: string;
  subagentCount: number;
  hadResultError: boolean; // Track if we got an error in the result message
}

// Map our permission modes to SDK permission modes
const PERMISSION_MODE_MAP: Record<PermissionMode, SDKPermissionMode> = {
  acceptEdits: 'acceptEdits',
  askUser: 'default',
  planOnly: 'plan',
};

/**
 * AgentService manages Claude Code agent sessions using the official SDK.
 *
 * This service uses the Claude Agent SDK's async iterator to stream events
 * back to the renderer process via IPC.
 */
export class AgentService {
  private sessions = new Map<string, ActiveSession>();

  // Enable mock mode for development/testing without real SDK
  private mockMode = process.env.AGENT_MOCK === 'true';

  async startSession({ sessionId, workDir, prompt, permissionMode, allowedTools, window }: AgentOptions) {
    console.log('[AgentService] Starting session:', {
      sessionId,
      workDir,
      prompt: prompt.slice(0, 50),
      permissionMode,
      allowedTools,
      mockMode: this.mockMode,
    });

    // Emit starting event
    this.emit(window, sessionId, { status: 'starting' as AgentStatus });
    this.emitTerminalLine(window, sessionId, '● Starting Claude agent...');

    const abortController = new AbortController();
    const session: ActiveSession = {
      abortController,
      sessionId,
      subagentCount: 0,
      hadResultError: false,
    };
    this.sessions.set(sessionId, session);

    // Use mock mode if enabled
    if (this.mockMode) {
      console.log('[AgentService] Running in MOCK MODE');
      this.emitTerminalLine(window, sessionId, '! Running in mock mode');
      await this.runMockSession(sessionId, prompt, window, abortController.signal);
      return;
    }

    try {
      // Create hook callbacks with proper SDK signatures
      const preToolUseHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID; // Required by SDK signature but not used here
        void options;   // Required by SDK signature but not used here
        const hookInput = input as PreToolUseHookInput;
        const toolName = hookInput.tool_name;
        const toolInput = hookInput.tool_input as Record<string, unknown>;

        // Detect status based on tool
        if (toolName === 'Bash') {
          const command = (toolInput?.command as string) || '';
          this.emit(window, sessionId, {
            status: 'running-command' as AgentStatus,
            currentTool: toolName,
            currentFile: command.slice(0, 80),
          });
          this.emitTerminalLine(window, sessionId, `> ${command.slice(0, 100)}`);
        } else if (toolName === 'Write' || toolName === 'Edit') {
          const filePath = (toolInput?.file_path as string) || (toolInput?.path as string) || '';
          this.emit(window, sessionId, {
            status: 'editing' as AgentStatus,
            currentTool: toolName,
            currentFile: filePath,
          });
          this.emitTerminalLine(window, sessionId, `● Editing ${filePath}`);
        } else if (toolName === 'Read' || toolName === 'Glob' || toolName === 'Grep') {
          const filePath =
            (toolInput?.file_path as string) ||
            (toolInput?.path as string) ||
            (toolInput?.pattern as string) ||
            '';
          this.emit(window, sessionId, { currentTool: toolName });
          this.emitTerminalLine(window, sessionId, `○ Reading ${filePath}`);
        } else if (toolName === 'Task') {
          this.emit(window, sessionId, { currentTool: toolName });
          this.emitTerminalLine(window, sessionId, `● Spawning subagent...`);
        } else {
          this.emit(window, sessionId, { currentTool: toolName });
          this.emitTerminalLine(window, sessionId, `● Using ${toolName}`);
        }

        return { continue: true };
      };

      const postToolUseHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as PostToolUseHookInput;
        const toolName = hookInput.tool_name;
        // Return to thinking after tool completes
        this.emit(window, sessionId, { status: 'thinking' as AgentStatus, currentTool: undefined });
        this.emitTerminalLine(window, sessionId, `✓ ${toolName} completed`);
        return { continue: true };
      };

      const notificationHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as NotificationHookInput;
        // Emit notification to renderer for toast/alert display
        this.emitNotification(window, sessionId, {
          type: hookInput.notification_type,
          title: hookInput.title,
          message: hookInput.message,
        });
        this.emitTerminalLine(window, sessionId, `⚠ ${hookInput.title || hookInput.notification_type}: ${hookInput.message}`);
        return { continue: true };
      };

      const sessionStartHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as SessionStartHookInput;
        this.emit(window, sessionId, { status: 'thinking' as AgentStatus });
        this.emitTerminalLine(window, sessionId, `● Session started (${hookInput.source})`);
        return { continue: true };
      };

      const sessionEndHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as SessionEndHookInput;
        console.log('[AgentService] Session ended:', hookInput.reason);
        this.emitTerminalLine(window, sessionId, `● Session ended: ${hookInput.reason}`);
        return { continue: true };
      };

      const stopHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as StopHookInput;
        console.log('[AgentService] Stop hook:', hookInput.stop_hook_active);
        if (hookInput.stop_hook_active) {
          this.emit(window, sessionId, { status: 'stopped' as AgentStatus });
          this.emitTerminalLine(window, sessionId, '● Agent stopping...');
        }
        return { continue: true };
      };

      const subagentStartHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as SubagentStartHookInput;
        const currentSession = this.sessions.get(sessionId);
        if (currentSession) {
          currentSession.subagentCount++;
        }
        this.emit(window, sessionId, {
          subagentId: hookInput.agent_id,
          subagentType: hookInput.agent_type,
        });
        this.emitTerminalLine(window, sessionId, `● Subagent started: ${hookInput.agent_type} (${hookInput.agent_id.slice(0, 8)})`);
        return { continue: true };
      };

      const subagentStopHook: HookCallback = async (input, toolUseID, options) => {
        void toolUseID;
        void options;
        const hookInput = input as SubagentStopHookInput;
        const currentSession = this.sessions.get(sessionId);
        if (currentSession && currentSession.subagentCount > 0) {
          currentSession.subagentCount--;
        }
        this.emitTerminalLine(window, sessionId, `✓ Subagent completed: ${hookInput.agent_id.slice(0, 8)}`);
        return { continue: true };
      };

      // Build SDK options
      const options: Options = {
        cwd: workDir,
        permissionMode: PERMISSION_MODE_MAP[permissionMode],
        abortController,
        maxTurns: 50,
        allowedTools,
        // Use bundled Claude Code CLI (inherits keychain auth from interactive login)
        pathToClaudeCodeExecutable: getClaudeCodePath(),
        // Enable stderr to see what's happening
        stderr: (message: string) => {
          console.error('[AgentService] STDERR:', message);
          this.emitTerminalLine(window, sessionId, `[stderr] ${message.trim()}`);
        },
        // Hook callbacks for real-time updates (proper SDK signatures)
        hooks: {
          PreToolUse: [{ hooks: [preToolUseHook] }],
          PostToolUse: [{ hooks: [postToolUseHook] }],
          Notification: [{ hooks: [notificationHook] }],
          SessionStart: [{ hooks: [sessionStartHook] }],
          SessionEnd: [{ hooks: [sessionEndHook] }],
          Stop: [{ hooks: [stopHook] }],
          SubagentStart: [{ hooks: [subagentStartHook] }],
          SubagentStop: [{ hooks: [subagentStopHook] }],
        },
      };

      console.log('[AgentService] Starting SDK query...');
      this.emitTerminalLine(window, sessionId, `> claude "${prompt.slice(0, 50)}..."`);

      // Start the query with async iterator
      const queryStream = query({ prompt, options });

      // Process SDK messages
      for await (const message of queryStream) {
        if (abortController.signal.aborted) {
          console.log('[AgentService] Session aborted');
          break;
        }

        this.processSDKMessage(window, sessionId, message);
      }

      // Session completed successfully
      if (!abortController.signal.aborted) {
        this.emit(window, sessionId, { status: 'completed' as AgentStatus });
        this.emitTerminalLine(window, sessionId, '✓ Task completed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AgentService] Error:', errorMessage);

      // Check if we already handled an error from the result message
      const currentSession = this.sessions.get(sessionId);
      const alreadyHandledError = currentSession?.hadResultError ?? false;

      // Don't emit duplicate errors if we already got one from the SDK result
      // The "process exited with code 1" error happens after billing/API errors
      if (!abortController.signal.aborted && !alreadyHandledError) {
        this.emit(window, sessionId, {
          status: 'error' as AgentStatus,
          error: errorMessage,
        });
        this.emitTerminalLine(window, sessionId, `✕ Error: ${errorMessage}`);
      }
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  private processSDKMessage(window: BrowserWindow, sessionId: string, message: SDKMessage) {
    console.log('[AgentService] SDK message:', message.type, 'subtype' in message ? message.subtype : '');

    switch (message.type) {
      case 'assistant':
        // Agent is thinking/responding
        this.emit(window, sessionId, { status: 'thinking' as AgentStatus });
        break;

      case 'stream_event':
        // Partial streaming update - ignore for now
        break;

      case 'tool_progress':
        // Tool is running, update with elapsed time
        this.emitTerminalLine(
          window,
          sessionId,
          `⏱ ${message.tool_name} (${message.elapsed_time_seconds.toFixed(1)}s)`
        );
        break;

      case 'result': {
        // Query completed - check is_error first as subtype can be 'success' even with errors
        const currentSession = this.sessions.get(sessionId);
        if (message.is_error) {
          // Error result - could be billing, API error, etc.
          const errorMsg = 'result' in message && message.result
            ? message.result
            : ('errors' in message ? message.errors.join(', ') : message.subtype);

          // Mark that we already handled an error
          if (currentSession) {
            currentSession.hadResultError = true;
          }

          this.emit(window, sessionId, {
            status: 'error' as AgentStatus,
            error: errorMsg,
            costUSD: message.total_cost_usd,
          });
          this.emitTerminalLine(window, sessionId, `✕ ${errorMsg}`);
        } else if (message.subtype === 'success') {
          this.emit(window, sessionId, {
            status: 'completed' as AgentStatus,
            costUSD: message.total_cost_usd,
            usage: message.usage,
          });
          this.emitTerminalLine(
            window,
            sessionId,
            `✓ Completed (${message.num_turns} turns, $${message.total_cost_usd.toFixed(4)})`
          );
        } else {
          // Other error subtypes (error_max_turns, error_max_budget_usd, etc.)
          const errorMsg = 'errors' in message ? message.errors.join(', ') : message.subtype;
          if (currentSession) {
            currentSession.hadResultError = true;
          }
          this.emit(window, sessionId, {
            status: 'error' as AgentStatus,
            error: errorMsg,
            costUSD: message.total_cost_usd,
          });
          this.emitTerminalLine(window, sessionId, `✕ ${errorMsg}`);
        }
        break;
      }

      case 'system':
        if (message.subtype === 'init') {
          this.emitTerminalLine(
            window,
            sessionId,
            `● Claude ${message.claude_code_version} | ${message.model}`
          );
        }
        break;

      case 'user':
        // User message (synthetic or actual)
        break;

      default:
        // Log unknown message types for debugging
        console.log('[AgentService] Unknown message type:', message.type);
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

  private emitNotification(
    window: BrowserWindow,
    sessionId: string,
    notification: { type: string; title?: string; message: string }
  ) {
    if (!window.isDestroyed()) {
      window.webContents.send('agent:notification', { sessionId, ...notification });
    }
  }

  /**
   * Mock session for development/testing without the real SDK.
   * Simulates a realistic agent workflow.
   */
  private async runMockSession(
    sessionId: string,
    prompt: string,
    window: BrowserWindow,
    signal: AbortSignal
  ) {
    const sleep = (ms: number) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });

    const mockSteps = [
      { status: 'thinking' as AgentStatus, line: '● Analyzing request...', delay: 800 },
      { status: 'thinking' as AgentStatus, line: '○ Reading CLAUDE.md', delay: 600 },
      { status: 'thinking' as AgentStatus, line: '○ Reading package.json', delay: 400 },
      { status: 'thinking' as AgentStatus, line: '● Planning approach...', delay: 1000 },
      { status: 'running-command' as AgentStatus, line: '> git status', delay: 500 },
      { status: 'thinking' as AgentStatus, line: '✓ Command completed', delay: 300 },
      { status: 'editing' as AgentStatus, line: '● Editing src/components/Example.tsx', delay: 1200 },
      { status: 'thinking' as AgentStatus, line: '✓ File saved', delay: 300 },
      { status: 'running-command' as AgentStatus, line: '> pnpm lint', delay: 800 },
      { status: 'thinking' as AgentStatus, line: '✓ Lint passed', delay: 300 },
      { status: 'thinking' as AgentStatus, line: '● Reviewing changes...', delay: 600 },
    ];

    try {
      for (const step of mockSteps) {
        this.emit(window, sessionId, { status: step.status });
        this.emitTerminalLine(window, sessionId, step.line);

        if (step.delay > 0) {
          await sleep(step.delay);
        }
      }

      // Mock completion with cost
      this.emit(window, sessionId, {
        status: 'completed' as AgentStatus,
        costUSD: 0.0234,
        usage: {
          input_tokens: 5000,
          output_tokens: 1500,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 2000,
        },
      });
      this.emitTerminalLine(window, sessionId, '✓ Task completed (mock, $0.0234)');
    } catch {
      // Aborted
      this.emit(window, sessionId, { status: 'stopped' as AgentStatus });
      this.emitTerminalLine(window, sessionId, '● Session stopped');
    }

    this.sessions.delete(sessionId);
    console.log('[AgentService] Mock session completed');
  }

  stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log('[AgentService] Stopping session:', sessionId);
      session.abortController.abort();
      this.sessions.delete(sessionId);
    }
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

// Singleton instance
export const agentService = new AgentService();
