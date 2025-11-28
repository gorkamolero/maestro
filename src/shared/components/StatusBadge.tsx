import React from 'react';
import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.classes} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

function getStatusConfig(status: AgentStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        classes: 'bg-green-500/10 text-green-400',
        dotClass: 'bg-green-400 animate-pulse',
      };
    case 'needs_input':
      return {
        label: 'Needs Input',
        classes: 'bg-amber-500/10 text-amber-400',
        dotClass: 'bg-amber-400 animate-pulse',
      };
    case 'idle':
      return {
        label: 'Idle',
        classes: 'bg-white/10 text-white/60',
        dotClass: 'bg-white/40',
      };
    case 'ended':
      return {
        label: 'Ended',
        classes: 'bg-white/5 text-white/40',
        dotClass: 'bg-white/20',
      };
  }
}
