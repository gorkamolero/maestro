export type AgentType = 'claude-code' | 'codex' | 'gemini' | 'unknown';
export type AgentStatus = 'active' | 'idle' | 'needs_input' | 'ended';
export type LaunchMode = 'local' | 'mobile';
export type ActivityType = 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'error';

export interface AgentInfo {
  id: string;
  type: AgentType;
  status: AgentStatus;
  projectPath: string;
  projectName: string;
  spaceId?: string;
  spaceName?: string;
  terminalId?: string;
  launchMode: LaunchMode;
  startedAt: string;
  lastActivityAt: string;
  stats?: {
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
  };
}

export interface AgentActivity {
  sessionId: string;
  type: ActivityType;
  timestamp: string;
  content?: string;
  toolName?: string;
}

export interface SpaceInfo {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  repoPath?: string;
  tabCount: number;
  agentCount: number;
}

export interface TerminalInfo {
  id: string;
  cols: number;
  rows: number;
  cwd: string;
  active: boolean;
}
