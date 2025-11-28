// Agent Monitor - Gemini CLI Parser
// Parses Gemini CLI checkpoint JSON files into normalized activities

import { randomUUID } from 'crypto';
import type {
  AgentActivity,
  UserPromptActivity,
  AssistantMessageActivity,
  ToolUseActivity,
  ToolResultActivity,
} from '@/types/agent-events';

// Gemini CLI uses JSON checkpoints, not JSONL streaming
// This parser handles checkpoint files

interface GeminiCheckpoint {
  id?: string;
  sessionId?: string;
  cwd?: string;
  workingDirectory?: string;
  messages?: GeminiMessage[];
  toolCalls?: GeminiToolCall[];
  timestamp?: string;
  updatedAt?: string;
}

interface GeminiMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: string;
}

interface GeminiToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  success?: boolean;
  timestamp?: string;
}

export function parseGeminiCheckpoint(content: string, filePath: string): AgentActivity[] {
  const activities: AgentActivity[] = [];

  let checkpoint: GeminiCheckpoint;
  try {
    checkpoint = JSON.parse(content);
  } catch {
    return [];
  }

  const sessionId = checkpoint.sessionId || checkpoint.id || randomUUID();
  const cwd = checkpoint.cwd || checkpoint.workingDirectory || '';

  const baseProps = {
    sessionId,
    agentType: 'gemini' as const,
  };

  // Parse messages
  if (checkpoint.messages) {
    for (const msg of checkpoint.messages) {
      const timestamp =
        msg.timestamp || checkpoint.timestamp || checkpoint.updatedAt || new Date().toISOString();

      if (msg.role === 'user') {
        const activity: UserPromptActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'user_prompt',
          timestamp,
          content: truncate(msg.content, 2000),
          truncated: msg.content.length > 2000,
        };
        activities.push(activity);
      } else if (msg.role === 'model') {
        const activity: AssistantMessageActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'assistant_message',
          timestamp,
          content: truncate(msg.content, 2000),
          truncated: msg.content.length > 2000,
        };
        activities.push(activity);
      }
    }
  }

  // Parse tool calls
  if (checkpoint.toolCalls) {
    for (const tool of checkpoint.toolCalls) {
      const timestamp = tool.timestamp || new Date().toISOString();

      const toolUse: ToolUseActivity = {
        ...baseProps,
        id: randomUUID(),
        type: 'tool_use',
        timestamp,
        toolName: tool.name.toLowerCase(),
        toolInput: tool.args,
        summary: generateSummary(tool.name, tool.args),
      };
      activities.push(toolUse);

      if (tool.result !== undefined) {
        const toolResult: ToolResultActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_result',
          timestamp,
          toolName: tool.name.toLowerCase(),
          success: tool.success !== false,
          output: truncate(tool.result, 500),
        };
        activities.push(toolResult);
      }
    }
  }

  return activities;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 3) + '...';
}

function generateSummary(name: string, args: Record<string, unknown>): string {
  const n = name.toLowerCase();
  if (args.path || args.file) {
    return `${name} ${args.path || args.file}`;
  }
  if (args.command) {
    return `Run: ${truncate(String(args.command), 50)}`;
  }
  if (args.query) {
    return `${name}: "${truncate(String(args.query), 30)}"`;
  }
  return name;
}

export interface GeminiSessionMeta {
  sessionId: string;
  cwd: string;
}

export function extractGeminiSessionMeta(content: string): GeminiSessionMeta | null {
  try {
    const checkpoint = JSON.parse(content);
    const sessionId = checkpoint.sessionId || checkpoint.id;
    const cwd = checkpoint.cwd || checkpoint.workingDirectory;

    if (sessionId) {
      return {
        sessionId,
        cwd: cwd || '',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}
