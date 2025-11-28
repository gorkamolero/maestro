// Agent Monitoring System Types
// Types for monitoring AI coding agents (Claude Code, Codex CLI, Gemini CLI)

// ============================================
// COMMON TYPES
// ============================================

export type AgentType = 'claude-code' | 'codex' | 'gemini';

export type AgentSource =
  | 'external' // Detected agent not launched by Maestro
  | 'maestro-pty' // Launched via Maestro's PTY
  | 'maestro-sdk'; // Launched via Claude SDK

export type AgentSessionStatus = 'active' | 'idle' | 'ended';

export interface AgentSession {
  id: string;
  agentType: AgentType;
  source: AgentSource;
  projectPath: string; // Absolute path to repo
  cwd: string; // Current working directory (may differ from projectPath)
  startedAt: string; // ISO timestamp
  lastActivityAt: string; // ISO timestamp
  status: AgentSessionStatus;
  processId?: number; // If we can detect it
  filePath: string; // Path to the JSONL file

  // Stats
  messageCount: number;
  toolUseCount: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// ============================================
// ACTIVITY EVENTS (Normalized across agents)
// ============================================

export type AgentActivityType =
  | 'session_start'
  | 'session_end'
  | 'user_prompt'
  | 'assistant_message'
  | 'assistant_thinking'
  | 'tool_use'
  | 'tool_result'
  | 'error';

export interface BaseActivity {
  id: string; // Generated unique ID
  sessionId: string;
  agentType: AgentType;
  timestamp: string; // ISO timestamp
  type: AgentActivityType;
}

export interface SessionStartActivity extends BaseActivity {
  type: 'session_start';
  cwd: string;
  projectPath: string;
}

export interface SessionEndActivity extends BaseActivity {
  type: 'session_end';
  reason?: 'user_exit' | 'error' | 'timeout' | 'process_exit' | 'unknown';
  duration: number; // milliseconds
}

export interface UserPromptActivity extends BaseActivity {
  type: 'user_prompt';
  content: string;
  truncated: boolean; // True if we truncated for storage
}

export interface AssistantMessageActivity extends BaseActivity {
  type: 'assistant_message';
  content: string;
  truncated: boolean;
}

export interface AssistantThinkingActivity extends BaseActivity {
  type: 'assistant_thinking';
  content: string;
  truncated: boolean;
}

export interface ToolUseActivity extends BaseActivity {
  type: 'tool_use';
  toolName: string; // Normalized: 'read', 'write', 'bash', 'edit', etc.
  toolInput: {
    // For file operations
    path?: string;
    // For bash
    command?: string;
    // For edit
    oldText?: string;
    newText?: string;
    // Generic catch-all
    [key: string]: unknown;
  };
  // Human-readable summary
  summary: string;
}

export interface ToolResultActivity extends BaseActivity {
  type: 'tool_result';
  toolName: string;
  success: boolean;
  output?: string; // Truncated if large
  error?: string;
}

export interface ErrorActivity extends BaseActivity {
  type: 'error';
  errorType: string;
  message: string;
}

export type AgentActivity =
  | SessionStartActivity
  | SessionEndActivity
  | UserPromptActivity
  | AssistantMessageActivity
  | AssistantThinkingActivity
  | ToolUseActivity
  | ToolResultActivity
  | ErrorActivity;

// ============================================
// CONNECTED REPO CONFIG
// ============================================

export interface ConnectedRepo {
  path: string; // User-provided path (may be relative)
  absolutePath: string; // Resolved absolute path
  spaceId: string; // Which Space this is connected to
  monitoringEnabled: boolean;
  autoCreateSegments: boolean; // Create timeline segments for detected sessions
}

// ============================================
// IPC REQUEST/RESPONSE TYPES
// ============================================

export interface ConnectRepoRequest {
  path: string;
  spaceId: string;
  options?: {
    monitoringEnabled?: boolean;
    autoCreateSegments?: boolean;
  };
}

export interface GetSessionsForSpaceRequest {
  spaceId: string;
}

export interface GetActivitiesRequest {
  sessionId: string;
  limit?: number;
}

export interface GetActivitiesForSpaceRequest {
  spaceId: string;
  limit?: number;
}

export interface GetRecentActivitiesRequest {
  limit?: number;
}

// ============================================
// PROCESS DETECTION TYPES
// ============================================

export interface DetectedProcess {
  pid: number;
  name: string;
  cmd: string;
  cwd?: string;
  agentType: AgentType | null;
}

// ============================================
// IPC CHANNEL NAMES
// ============================================

export const AGENT_MONITOR_CHANNELS = {
  // Main -> Renderer (events)
  SESSION_CREATED: 'agent-monitor:session-created',
  SESSION_UPDATED: 'agent-monitor:session-updated',
  SESSION_ENDED: 'agent-monitor:session-ended',
  ACTIVITY_NEW: 'agent-monitor:activity-new',

  // Renderer -> Main (requests)
  CONNECT_REPO: 'agent-monitor:connect-repo',
  DISCONNECT_REPO: 'agent-monitor:disconnect-repo',
  GET_SESSIONS: 'agent-monitor:get-sessions',
  GET_ACTIVE_SESSIONS: 'agent-monitor:get-active-sessions',
  GET_SESSIONS_FOR_SPACE: 'agent-monitor:get-sessions-for-space',
  GET_ACTIVITIES: 'agent-monitor:get-activities',
  GET_ACTIVITIES_FOR_SPACE: 'agent-monitor:get-activities-for-space',
  GET_RECENT_ACTIVITIES: 'agent-monitor:get-recent-activities',
} as const;
