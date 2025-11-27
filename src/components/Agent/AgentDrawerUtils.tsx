import { Coins } from 'lucide-react';
import { type AgentStatus, type AgentUsage } from '@/stores/agent.store';

/**
 * Human-readable labels for each agent status
 */
export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Ready to start',
  starting: 'Starting...',
  thinking: 'Thinking...',
  editing: 'Editing files...',
  'running-command': 'Running command...',
  waiting: 'Waiting...',
  completed: 'Completed',
  error: 'Error',
  stopped: 'Stopped',
};

/**
 * Statuses that indicate the agent is actively working
 */
export const ACTIVE_STATUSES: AgentStatus[] = [
  'starting',
  'thinking',
  'editing',
  'running-command',
  'waiting',
];

/**
 * Format large token numbers for display (e.g., 1500 -> "1.5K")
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Available tools that can be restricted for agent sessions
 */
export const AVAILABLE_TOOLS = [
  { name: 'Read', desc: 'Read files' },
  { name: 'Write', desc: 'Create files' },
  { name: 'Edit', desc: 'Edit files' },
  { name: 'Bash', desc: 'Run commands' },
  { name: 'Glob', desc: 'Search files' },
  { name: 'Grep', desc: 'Search content' },
  { name: 'Task', desc: 'Spawn agents' },
  { name: 'WebFetch', desc: 'Fetch URLs' },
  { name: 'WebSearch', desc: 'Search web' },
] as const;

// ============================================================================
// Cost Display Component
// ============================================================================

interface CostDisplayProps {
  costUSD?: number;
  usage?: AgentUsage;
  compact?: boolean;
}

/**
 * Displays agent session cost and token usage
 */
export function CostDisplay({ costUSD, usage, compact = false }: CostDisplayProps) {
  if (!costUSD && !usage) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Coins className="w-3 h-3" />
        {costUSD !== undefined ? `$${costUSD.toFixed(4)}` : '...'}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total Cost</span>
        <span className="text-sm font-medium">
          {costUSD !== undefined ? `$${costUSD.toFixed(4)}` : '—'}
        </span>
      </div>
      {usage && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Input tokens</span>
            <span className="text-xs font-mono">{formatTokens(usage.input_tokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Output tokens</span>
            <span className="text-xs font-mono">{formatTokens(usage.output_tokens)}</span>
          </div>
          {usage.cache_read_input_tokens !== undefined && usage.cache_read_input_tokens > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cache hits</span>
              <span className="text-xs font-mono text-green-400">
                {formatTokens(usage.cache_read_input_tokens)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
