import crypto from 'crypto';

export interface WSEnvelope<T = unknown> {
  v: 1;                     // Protocol version
  id: string;               // Message UUID
  ts: string;               // ISO timestamp
  type: string;             // Message type
  payload: T;
  timestamp: number;        // Unix ms (for latency calc)
}

// Inbound (client → server)
export type ClientMessage =
  | { type: 'ping' }
  | { type: 'subscribe'; payload: { channel: string; id?: string } }
  | { type: 'unsubscribe'; payload: { channel: string; id?: string } }
  | { type: 'term:input'; payload: { id: string; data: string; seq?: number } }
  | { type: 'term:resize'; payload: { id: string; cols: number; rows: number } };

// Outbound (server → client)
export type ServerMessage =
  | { type: 'pong' }
  | { type: 'connected'; payload: { clientId: string } }
  | { type: 'subscribed'; payload: { channel: string; id?: string } }
  | { type: 'error'; payload: { code: string; message: string } }
  // Terminal
  | { type: 'term:frame'; payload: TerminalFrame }
  | { type: 'term:exit'; payload: { id: string; code: number } }
  // Agents
  | { type: 'agent:created'; payload: AgentInfo }
  | { type: 'agent:updated'; payload: AgentInfo }
  | { type: 'agent:ended'; payload: { id: string } }
  | { type: 'agent:activity'; payload: AgentActivity };

export interface TerminalFrame {
  id: string;
  seq: number;
  ts: number;
  data: string;
}

export interface AgentInfo {
  id: string;
  type: 'claude-code' | 'codex' | 'gemini';
  status: 'active' | 'idle' | 'needs_input' | 'ended';
  projectPath: string;
  projectName: string;
  spaceId?: string;
  spaceName?: string;
  terminalId?: string;
  launchMode: 'local' | 'mobile';
  startedAt: string;
  lastActivityAt: string;
}

export interface AgentActivity {
  sessionId: string;
  type: 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'error';
  timestamp: string;
  content?: string;
  toolName?: string;
}

// Helper to create envelope
export function envelope<T>(type: string, payload: T): WSEnvelope<T> {
  return {
    v: 1,
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    type,
    payload,
    timestamp: Date.now(),
  };
}
