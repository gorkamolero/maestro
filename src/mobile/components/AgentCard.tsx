import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusIndicator } from '@shared/components/StatusBadge';
import { formatRelativeTime } from '@shared/utils/format';
import { api } from '../lib/api';
import type { AgentInfo } from '@shared/types';

interface AgentCardProps {
  agent: AgentInfo;
  highlight?: boolean;
}

export function AgentCard({ agent, highlight }: AgentCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const needsInput = agent.status === 'needs_input';

  const handleQuickAction = async (e: React.MouseEvent, action: 'yes' | 'no') => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await api.post(`/api/agents/${agent.id}/input`, { text: action });
    } catch (err) {
      console.error('Failed to send input:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Link
      to={`/agent/${agent.id}`}
      className={`block rounded-card transition-all ${
        highlight
          ? 'bg-status-warning/5 border border-status-warning/20'
          : 'bg-surface-card border border-white/[0.06] active:bg-surface-hover'
      }`}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <StatusIndicator status={agent.status} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-sm truncate text-content-primary">
                {agent.projectName}
              </h3>
              <span className="text-[11px] text-content-tertiary shrink-0">
                {formatRelativeTime(agent.lastActivityAt)}
              </span>
            </div>
            <p className="text-[12px] text-content-secondary mt-0.5">
              {agent.type === 'claude-code' ? 'Claude Code' : agent.type}
              {agent.spaceName && ` · ${agent.spaceName}`}
            </p>
          </div>
        </div>

        {/* Cost display */}
        {agent.stats?.cost != null && agent.stats.cost > 0 && (
          <div className="mt-1.5 text-[11px] text-content-tertiary">
            ${agent.stats.cost.toFixed(4)}
          </div>
        )}

        {/* Inline actions for needs_input */}
        {needsInput && (
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <p className="text-[12px] text-status-warning mb-2.5">
              Waiting for your response...
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => handleQuickAction(e, 'no')}
                disabled={isSubmitting}
                className="flex-1 h-9 px-4 rounded-button bg-surface-hover text-content-secondary font-medium text-[13px]
                  active:bg-white/[0.1] disabled:opacity-50 transition-colors"
              >
                Deny
              </button>
              <button
                onClick={(e) => handleQuickAction(e, 'yes')}
                disabled={isSubmitting}
                className="flex-1 h-9 px-4 rounded-button bg-accent text-white font-medium text-[13px]
                  active:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
