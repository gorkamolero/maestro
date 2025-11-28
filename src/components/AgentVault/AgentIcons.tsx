// Agent type icons for Claude Code, Codex CLI, and Gemini CLI
import type { AgentType } from '@/types/agent-events';

interface IconProps {
  className?: string;
}

// Anthropic/Claude icon - stylized "A" shape
export function ClaudeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L3 20h4l1.5-3h7l1.5 3h4L12 2zm0 6l2.5 6h-5L12 8z" />
    </svg>
  );
}

// OpenAI/Codex icon - hexagon shape
export function CodexIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L17.5 8v8L12 19.5 6.5 16V8L12 4.5z" />
    </svg>
  );
}

// Google/Gemini icon - sparkle/star shape
export function GeminiIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z" />
    </svg>
  );
}

// Get the appropriate icon component for an agent type
export function AgentTypeIcon({ agentType, className }: { agentType: AgentType; className?: string }) {
  switch (agentType) {
    case 'claude-code':
      return <ClaudeIcon className={className} />;
    case 'codex':
      return <CodexIcon className={className} />;
    case 'gemini':
      return <GeminiIcon className={className} />;
    default:
      return <ClaudeIcon className={className} />;
  }
}

// Agent type display names
export const AGENT_TYPE_NAMES: Record<AgentType, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
};

// Agent type colors
export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  'claude-code': 'text-orange-400',
  codex: 'text-emerald-400',
  gemini: 'text-blue-400',
};
