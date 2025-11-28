// Agent Monitor - Watch Paths Configuration
// Defines where each AI coding agent stores its session data

import { homedir } from 'os';
import { join } from 'path';
import type { AgentType } from '@/types/agent-events';

export interface AgentWatchConfig {
  name: string;
  basePath: string;
  pattern: string;
  decodeProjectPath: (dirNameOrFilePath: string, content?: string) => string | null;
  sessionIdFromFile: (content: string) => string | null;
}

export const AGENT_WATCH_CONFIGS: Record<AgentType, AgentWatchConfig> = {
  'claude-code': {
    name: 'Claude Code',
    basePath: join(homedir(), '.claude', 'projects'),
    pattern: '**/*.jsonl',
    // Claude Code encodes paths: /Users/gorka/project → -Users-gorka-project
    decodeProjectPath: (dirName: string): string | null => {
      // The directory name is the encoded path
      // Remove leading dash and convert dashes back to slashes
      if (!dirName.startsWith('-')) {
        return null;
      }
      return '/' + dirName.slice(1).replace(/-/g, '/');
    },
    sessionIdFromFile: (content: string): string | null => {
      // First line contains sessionId
      const firstLine = content.split('\n')[0];
      try {
        const parsed = JSON.parse(firstLine);
        return parsed.sessionId || null;
      } catch {
        return null;
      }
    },
  },

  codex: {
    name: 'Codex CLI',
    basePath: join(homedir(), '.codex', 'sessions'),
    pattern: '**/*.jsonl',
    // Codex uses date-sharded paths: YYYY/MM/DD/rollout-TIMESTAMP-UUID.jsonl
    decodeProjectPath: (_filePath: string, content?: string): string | null => {
      // Project path is in session_meta on first line
      if (!content) return null;
      const firstLine = content.split('\n')[0];
      try {
        const meta = JSON.parse(firstLine);
        if (meta.type === 'session_meta') {
          return meta.cwd || null;
        }
      } catch {
        // Ignore parse errors
      }
      return null;
    },
    sessionIdFromFile: (content: string): string | null => {
      const firstLine = content.split('\n')[0];
      try {
        const meta = JSON.parse(firstLine);
        return meta.sessionId || null;
      } catch {
        return null;
      }
    },
  },

  gemini: {
    name: 'Gemini CLI',
    basePath: join(homedir(), '.gemini', 'tmp'),
    pattern: '**/checkpoints/*.json',
    // Gemini uses opaque project hashes
    decodeProjectPath: (_filePath: string, content?: string): string | null => {
      if (!content) return null;
      try {
        const data = JSON.parse(content);
        return data.cwd || data.workingDirectory || null;
      } catch {
        return null;
      }
    },
    sessionIdFromFile: (content: string): string | null => {
      try {
        const data = JSON.parse(content);
        return data.sessionId || data.id || null;
      } catch {
        return null;
      }
    },
  },
};

/**
 * Get all agent types
 */
export function getAgentTypes(): AgentType[] {
  return Object.keys(AGENT_WATCH_CONFIGS) as AgentType[];
}

/**
 * Get watch config for a specific agent type
 */
export function getWatchConfig(agentType: AgentType): AgentWatchConfig {
  return AGENT_WATCH_CONFIGS[agentType];
}
