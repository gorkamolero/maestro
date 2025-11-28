// Agent Monitor - Codex CLI JSONL Parser
// Parses Codex CLI session JSONL files into normalized activities

import { randomUUID } from 'crypto';
import type {
  AgentActivity,
  SessionStartActivity,
  UserPromptActivity,
  AssistantMessageActivity,
  ToolUseActivity,
  ToolResultActivity,
  ErrorActivity,
} from '@/types/agent-events';

// ============================================
// RAW CODEX JSONL TYPES
// ============================================

interface CodexSessionMeta {
  type: 'session_meta';
  sessionId: string;
  cwd: string;
  startTime: string;
  model?: string;
}

interface CodexEventMsg {
  type: 'event_msg';
  payload: CodexPayload;
}

type CodexPayload =
  | { type: 'user_message'; content: string }
  | { type: 'agent_message'; content: string }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; name: string; output: string; success: boolean }
  | { type: 'token_count'; input: number; output: number }
  | { type: 'exec_command'; command: string; cwd?: string }
  | { type: 'exec_result'; exit_code: number; stdout: string; stderr: string }
  | { type: 'file_edit'; path: string; diff?: string }
  | { type: 'error'; message: string; code?: string };

type CodexLine = CodexSessionMeta | CodexEventMsg;

// ============================================
// PARSER
// ============================================

export function parseCodexLine(
  line: string,
  sessionId: string, // Must be provided from session meta
  _filePath: string
): AgentActivity[] {
  const activities: AgentActivity[] = [];

  let parsed: CodexLine;
  try {
    parsed = JSON.parse(line);
  } catch {
    return [];
  }

  const baseProps = {
    sessionId,
    agentType: 'codex' as const,
    timestamp: new Date().toISOString(), // Codex doesn't include timestamps per event
  };

  if (parsed.type === 'session_meta') {
    const activity: SessionStartActivity = {
      ...baseProps,
      id: randomUUID(),
      type: 'session_start',
      cwd: parsed.cwd,
      projectPath: parsed.cwd,
      timestamp: parsed.startTime,
    };
    activities.push(activity);
  } else if (parsed.type === 'event_msg') {
    const payload = parsed.payload;

    switch (payload.type) {
      case 'user_message': {
        const content = payload.content ?? '';
        const activity: UserPromptActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'user_prompt',
          content: truncate(content, 2000),
          truncated: content.length > 2000,
        };
        activities.push(activity);
        break;
      }

      case 'agent_message': {
        const content = payload.content ?? '';
        const activity: AssistantMessageActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'assistant_message',
          content: truncate(content, 2000),
          truncated: content.length > 2000,
        };
        activities.push(activity);
        break;
      }

      case 'tool_call': {
        const activity: ToolUseActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_use',
          toolName: payload.name.toLowerCase(),
          toolInput: payload.arguments,
          summary: generateToolSummary(payload.name, payload.arguments),
        };
        activities.push(activity);
        break;
      }

      case 'tool_result': {
        const activity: ToolResultActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_result',
          toolName: payload.name.toLowerCase(),
          success: payload.success,
          output: truncate(payload.output, 500),
        };
        activities.push(activity);
        break;
      }

      case 'exec_command': {
        const activity: ToolUseActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_use',
          toolName: 'bash',
          toolInput: { command: payload.command, cwd: payload.cwd },
          summary: `Run: ${truncate(payload.command, 50)}`,
        };
        activities.push(activity);
        break;
      }

      case 'exec_result': {
        const activity: ToolResultActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_result',
          toolName: 'bash',
          success: payload.exit_code === 0,
          output: truncate(payload.stdout || payload.stderr, 500),
          error: payload.exit_code !== 0 ? payload.stderr : undefined,
        };
        activities.push(activity);
        break;
      }

      case 'file_edit': {
        const activity: ToolUseActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_use',
          toolName: 'edit',
          toolInput: { path: payload.path },
          summary: `Edit ${payload.path}`,
        };
        activities.push(activity);
        break;
      }

      case 'error': {
        const activity: ErrorActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'error',
          errorType: payload.code || 'unknown',
          message: payload.message,
        };
        activities.push(activity);
        break;
      }

      case 'token_count':
        // We don't emit this as an activity, but we could track it
        break;
    }
  }

  return activities;
}

function truncate(s: string | undefined | null, max: number): string {
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max - 3) + '...';
}

function generateToolSummary(name: string, args: Record<string, unknown>): string {
  const n = name.toLowerCase();
  if (n.includes('read') || n.includes('file')) {
    return `Read ${args.path || args.file || 'file'}`;
  }
  if (n.includes('write')) {
    return `Write ${args.path || args.file || 'file'}`;
  }
  if (n.includes('search')) {
    return `Search: "${args.query || args.pattern || ''}"`;
  }
  return name;
}

// ============================================
// SESSION EXTRACTION
// ============================================

export interface CodexSessionMetaExtracted {
  sessionId: string;
  cwd: string;
  startTime: string;
}

export function extractCodexSessionMeta(firstLine: string): CodexSessionMetaExtracted | null {
  try {
    const parsed = JSON.parse(firstLine);
    if (parsed.type === 'session_meta') {
      return {
        sessionId: parsed.sessionId,
        cwd: parsed.cwd,
        startTime: parsed.startTime,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}
