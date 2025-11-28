import React from 'react';
import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function StatusBadge({ status, size = 'sm', showLabel = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  if (!showLabel) {
    return (
      <span className={`${dotSize} rounded-full ${config.dotClass}`} />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.classes} ${sizeClasses}`}>
      <span className={`${dotSize} rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

// Standalone indicator dot for use in cards
export function StatusIndicator({ status, size = 'md' }: { status: AgentStatus; size?: 'sm' | 'md' | 'lg' }) {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }[size];

  return (
    <span className="relative flex">
      {config.animate && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pingClass}`}
          style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sizeClasses} ${config.dotClass}`} />
    </span>
  );
}

function getStatusConfig(status: AgentStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        classes: 'bg-green-500/10 text-green-400',
        dotClass: 'bg-green-500',
        pingClass: 'bg-green-500 animate-ping',
        animate: true,
      };
    case 'needs_input':
      return {
        label: 'Needs Input',
        classes: 'bg-yellow-500/10 text-yellow-400',
        dotClass: 'bg-yellow-500',
        pingClass: 'bg-yellow-500 animate-ping',
        animate: true,
      };
    case 'idle':
      return {
        label: 'Idle',
        classes: 'bg-zinc-500/10 text-zinc-400',
        dotClass: 'bg-zinc-500',
        pingClass: '',
        animate: false,
      };
    case 'ended':
      return {
        label: 'Completed',
        classes: 'bg-zinc-500/10 text-zinc-500',
        dotClass: 'bg-zinc-600',
        pingClass: '',
        animate: false,
      };
  }
}
