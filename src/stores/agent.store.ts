import { proxy, useSnapshot } from 'valtio';

export type AgentStatus =
  | 'idle'
  | 'starting'
  | 'thinking'
  | 'editing'
  | 'running-command'
  | 'waiting'
  | 'completed'
  | 'error'
  | 'stopped';

export type PermissionMode = 'acceptEdits' | 'askUser' | 'planOnly';

export interface AgentUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface AgentSession {
  id: string;
  tabId: string;
  spaceId: string;
  prompt: string;
  workDir: string;
  permissionMode: PermissionMode;
  status: AgentStatus;
  currentTool?: string; // e.g., "Write", "Bash", "Read"
  currentFile?: string; // e.g., "src/auth/login.ts"
  startedAt: string;
  completedAt?: string;
  error?: string;
  costUSD?: number;
  usage?: AgentUsage;
  terminalLines: string[]; // Last N lines for preview
  ptyId?: string; // For terminal rendering
}

interface AgentState {
  sessions: AgentSession[];
}

export const agentStore = proxy<AgentState>({
  sessions: [],
});

export function useAgentStore() {
  return useSnapshot(agentStore);
}

export const agentActions = {
  createSession: (
    tabId: string,
    spaceId: string,
    prompt: string,
    workDir: string,
    permissionMode: PermissionMode
  ): AgentSession => {
    const session: AgentSession = {
      id: crypto.randomUUID(),
      tabId,
      spaceId,
      prompt,
      workDir,
      permissionMode,
      status: 'starting',
      startedAt: new Date().toISOString(),
      terminalLines: [],
    };
    agentStore.sessions.push(session);
    return session;
  },

  updateStatus: (
    sessionId: string,
    status: AgentStatus,
    details?: Partial<AgentSession>
  ) => {
    const session = agentStore.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'error' || status === 'stopped') {
        session.completedAt = new Date().toISOString();
      }
      if (details) {
        Object.assign(session, details);
      }
    }
  },

  appendTerminalLine: (sessionId: string, line: string) => {
    const session = agentStore.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.terminalLines.push(line);
      // Keep only last 100 lines
      if (session.terminalLines.length > 100) {
        session.terminalLines = session.terminalLines.slice(-100);
      }
    }
  },

  getSessionForTab: (tabId: string): AgentSession | undefined => {
    return agentStore.sessions.find((s) => s.tabId === tabId);
  },

  getSessionsForSpace: (spaceId: string): AgentSession[] => {
    return agentStore.sessions.filter((s) => s.spaceId === spaceId);
  },

  getActiveSessions: (): AgentSession[] => {
    return agentStore.sessions.filter(
      (s) => !['completed', 'error', 'stopped', 'idle'].includes(s.status)
    );
  },

  clearSession: (sessionId: string) => {
    const index = agentStore.sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      agentStore.sessions.splice(index, 1);
    }
  },
};
