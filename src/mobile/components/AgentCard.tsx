import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@shared/components/StatusBadge';
import { formatRelativeTime } from '@shared/utils/format';
import type { AgentInfo } from '@shared/types';

interface AgentCardProps {
  agent: AgentInfo;
  highlight?: boolean;
}

export function AgentCard({ agent, highlight }: AgentCardProps) {
  return (
    <Link
      to={`/agent/${agent.id}`}
      className={`block p-4 rounded-xl transition-colors ${
        highlight 
          ? 'bg-amber-500/10 border border-amber-500/30' 
          : 'bg-white/5 active:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{agent.projectName}</h3>
          <p className="text-sm text-white/50 truncate mt-0.5">
            {agent.type} • {formatRelativeTime(agent.lastActivityAt)}
          </p>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      
      {agent.stats?.cost != null && agent.stats.cost > 0 && (
        <p className="text-xs text-white/30 mt-2">
          ${agent.stats.cost.toFixed(4)}
        </p>
      )}
    </Link>
  );
}
