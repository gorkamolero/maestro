export type AgentType = 'claude-code' | 'codex' | 'gemini' | 'unknown';
export type AgentStatus = 'active' | 'idle' | 'needs_input' | 'ended';
export type LaunchMode = 'local' | 'mobile';
export type ActivityType = 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'error';
export type TabType = 'terminal' | 'browser' | 'app-launcher' | 'tasks' | 'notes';

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

// Task item for a space
export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// Enhanced Space info with all desktop features
export interface SpaceInfo {
  id: string;
  name: string;
  color?: string;
  secondaryColor?: string;
  icon?: string;
  repoPath?: string;
  tabCount: number;
  agentCount: number;
  lastAccessedAt?: string;
  // What's next bubble
  next?: string | null;
  // Tasks for the space
  tasks?: TaskItem[];
  // Notes preview (plain text extract)
  notesPreview?: string;
  // Content mode preference
  contentMode?: 'tasks' | 'notes';
  // Tags for categorization
  tags?: string[];
  // Whether space is active or in vault
  isActive?: boolean;
}

export interface TabInfo {
  id: string;
  type: TabType | string;
  title?: string;
  url?: string;
  emoji?: string;
  terminalId?: string;
  content?: string;
  agentId?: string;
  disabled?: boolean;
  // Terminal state
  hasTerminalBuffer?: boolean;
  workingDir?: string;
  // For app launcher tabs
  appIcon?: string;
  appColor?: string;
}

export interface SpaceDetail extends SpaceInfo {
  tabs: TabInfo[];
  agents?: AgentInfo[];
  // Full notes content (serialized Lexical state)
  notesContent?: string;
}

export interface TerminalInfo {
  id: string;
  cols: number;
  rows: number;
  cwd: string;
  active: boolean;
}
