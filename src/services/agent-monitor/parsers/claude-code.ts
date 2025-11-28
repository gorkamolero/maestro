// Agent Monitor - Claude Code JSONL Parser
// Parses Claude Code session JSONL files into normalized activities

import { randomUUID } from 'crypto';
import { normalize, isAbsolute } from 'path';
import type {
  AgentActivity,
  ToolUseActivity,
  SessionStartActivity,
  UserPromptActivity,
  AssistantMessageActivity,
  AssistantThinkingActivity,
  ToolResultActivity,
} from '@/types/agent-events';

// ============================================
// RAW CLAUDE CODE JSONL TYPES
// ============================================

interface ClaudeCodeMessage {
  type: 'user' | 'assistant' | 'system';
  message: {
    role: string;
    content: ClaudeCodeContent[];
  };
  timestamp: string;
  sessionId: string;
  cwd?: string;
  uuid?: string;
  parentUuid?: string;
}

type ClaudeCodeContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

// Tool name mapping from Claude Code's internal names
const TOOL_NAME_MAP: Record<string, string> = {
  Read: 'read',
  Write: 'write',
  Edit: 'edit',
  Bash: 'bash',
  Glob: 'glob',
  Grep: 'grep',
  LS: 'ls',
  TodoRead: 'todo_read',
  TodoWrite: 'todo_write',
  WebFetch: 'web_fetch',
  WebSearch: 'web_search',
  NotebookRead: 'notebook_read',
  NotebookEdit: 'notebook_edit',
  Task: 'task',
  MultiEdit: 'multi_edit',
};

// ============================================
// PARSER
// ============================================

export function parseClaudeCodeLine(line: string, _filePath: string): AgentActivity[] {
  const activities: AgentActivity[] = [];

  let parsed: ClaudeCodeMessage;
  try {
    parsed = JSON.parse(line);
  } catch {
    console.warn(`[ClaudeCodeParser] Failed to parse line: ${line.slice(0, 100)}...`);
    return [];
  }

  const baseProps = {
    sessionId: parsed.sessionId,
    agentType: 'claude-code' as const,
    timestamp: parsed.timestamp,
  };

  // Process based on message type
  const contents = parsed.message?.content;
  if (!Array.isArray(contents)) {
    return activities;
  }

  if (parsed.type === 'user') {
    for (const content of contents) {
      if (content.type === 'text') {
        const activity: UserPromptActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'user_prompt',
          content: truncateContent(content.text, 2000),
          truncated: content.text.length > 2000,
        };
        activities.push(activity);
      }
    }
  } else if (parsed.type === 'assistant') {
    for (const content of contents) {
      if (content.type === 'text') {
        const activity: AssistantMessageActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'assistant_message',
          content: truncateContent(content.text, 2000),
          truncated: content.text.length > 2000,
        };
        activities.push(activity);
      } else if (content.type === 'thinking') {
        const activity: AssistantThinkingActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'assistant_thinking',
          content: truncateContent(content.thinking, 1000),
          truncated: content.thinking.length > 1000,
        };
        activities.push(activity);
      } else if (content.type === 'tool_use') {
        activities.push(parseToolUse(baseProps, content));
      } else if (content.type === 'tool_result') {
        const activity: ToolResultActivity = {
          ...baseProps,
          id: randomUUID(),
          type: 'tool_result',
          toolName: 'unknown', // Tool name comes from paired tool_use
          success: !content.is_error,
          output: truncateContent(content.content, 500),
          error: content.is_error ? content.content : undefined,
        };
        activities.push(activity);
      }
    }
  } else if (parsed.type === 'system') {
    // System messages often indicate session boundaries
    const text = contents
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    if (text.includes('session') || text.includes('starting')) {
      const activity: SessionStartActivity = {
        ...baseProps,
        id: randomUUID(),
        type: 'session_start',
        cwd: parsed.cwd || '',
        projectPath: parsed.cwd || '',
      };
      activities.push(activity);
    }
  }

  return activities;
}

function parseToolUse(
  baseProps: { sessionId: string; agentType: 'claude-code'; timestamp: string },
  content: { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
): ToolUseActivity {
  const normalizedName = TOOL_NAME_MAP[content.name] || content.name.toLowerCase();
  const input = content.input;

  // Generate human-readable summary
  let summary = `${content.name}`;

  switch (normalizedName) {
    case 'read':
      summary = `Read ${input.file_path || input.path || 'file'}`;
      break;
    case 'write':
      summary = `Write ${input.file_path || input.path || 'file'}`;
      break;
    case 'edit':
      summary = `Edit ${input.file_path || input.path || 'file'}`;
      break;
    case 'multi_edit':
      summary = `Multi-edit ${input.file_path || input.path || 'file'}`;
      break;
    case 'bash': {
      const cmd = String(input.command || '').slice(0, 50);
      summary = `Run: ${cmd}${String(input.command || '').length > 50 ? '...' : ''}`;
      break;
    }
    case 'glob':
      summary = `Find files: ${input.pattern || '*'}`;
      break;
    case 'grep':
      summary = `Search: "${input.pattern || input.query || ''}"`;
      break;
    case 'ls':
      summary = `List ${input.path || '.'}`;
      break;
    case 'web_fetch':
      summary = `Fetch ${input.url || 'URL'}`;
      break;
    case 'web_search':
      summary = `Search web: "${input.query || ''}"`;
      break;
    case 'task':
      summary = `Task: ${String(input.description || input.prompt || '').slice(0, 40)}...`;
      break;
    default:
      summary = `${content.name}`;
  }

  return {
    ...baseProps,
    id: randomUUID(),
    type: 'tool_use',
    toolName: normalizedName,
    toolInput: {
      path: (input.file_path as string) || (input.path as string),
      command: input.command as string,
      ...input,
    },
    summary,
  };
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength - 3) + '...';
}

// ============================================
// SESSION EXTRACTION
// ============================================

export interface ClaudeCodeSessionMeta {
  sessionId: string;
  projectPath: string;
  cwd: string;
  startedAt: string;
  /** Whether this session was launched via Happy Coder (mobile) */
  isHappySession?: boolean;
}

export function extractClaudeCodeSessionMeta(firstLines: string[], filePath: string): ClaudeCodeSessionMeta | null {
  let sessionId: string | null = null;
  let projectPath = '';
  let cwd = '';
  let startedAt = '';
  let isHappySession = false;

  // Check all lines for Happy Coder signature and session info
  for (const line of firstLines) {
    // Detect Happy Coder sessions by checking for mcp__happy tool calls
    if (line.includes('mcp__happy')) {
      isHappySession = true;
    }

    try {
      const parsed = JSON.parse(line) as ClaudeCodeMessage;
      if (parsed.sessionId && !sessionId) {
        sessionId = parsed.sessionId;
        startedAt = parsed.timestamp;
        cwd = parsed.cwd || '';

        // Decode project path from file path
        // ~/.claude/projects/-Users-gorka-project/session.jsonl
        const pathParts = filePath.split('/');
        const projectsIndex = pathParts.indexOf('projects');

        projectPath = parsed.cwd || '';

        if (projectsIndex !== -1 && projectsIndex + 1 < pathParts.length) {
          const encodedPath = pathParts[projectsIndex + 1];
          if (encodedPath.startsWith('-')) {
            // Decode the path and sanitize to prevent path traversal attacks
            const decodedPath = '/' + encodedPath.slice(1).replace(/-/g, '/');
            const normalizedPath = normalize(decodedPath);

            // Validate: must be absolute and not contain traversal after normalization
            if (isAbsolute(normalizedPath) && !normalizedPath.includes('..')) {
              projectPath = normalizedPath;
            }
            // If validation fails, fall back to parsed.cwd which is already set
          }
        }
      }
    } catch {
      continue;
    }
  }

  if (!sessionId) return null;

  return {
    sessionId,
    projectPath,
    cwd: cwd || projectPath,
    startedAt,
    isHappySession,
  };
}
