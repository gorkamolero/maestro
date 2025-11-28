import { Link } from 'react-router-dom';
import type { SpaceInfo } from '@shared/types';

interface SpaceCardProps {
  space: SpaceInfo;
  variant: 'grid' | 'list';
}

export function SpaceCard({ space, variant }: SpaceCardProps) {
  const hasActivity = space.agentCount > 0;

  if (variant === 'list') {
    return (
      <Link
        to={`/space/${space.id}`}
        className="flex items-center gap-3 p-4 bg-surface-card border border-white/[0.06] rounded-card active:bg-surface-hover transition-colors"
      >
        {/* Left color bar */}
        <div
          className="w-1 h-10 rounded-full shrink-0"
          style={{ backgroundColor: space.color || '#4a4845' }}
        />

        {/* Icon */}
        <SpaceIcon space={space} size="md" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-content-primary truncate">{space.name}</h3>
          <p className="text-[12px] text-content-secondary">
            {space.tabCount} tabs
            {space.agentCount > 0 && (
              <span className="text-accent"> · {space.agentCount} agent{space.agentCount > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        {/* Activity indicator */}
        {hasActivity && <ActivityPulse />}

        <ChevronRight className="w-4 h-4 text-content-tertiary shrink-0" />
      </Link>
    );
  }

  // Grid variant
  return (
    <Link
      to={`/space/${space.id}`}
      className="block aspect-[4/3] relative overflow-hidden rounded-card bg-surface-card border border-white/[0.06] active:bg-surface-hover transition-colors"
    >
      {/* Left color accent bar */}
      {space.color && (
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: space.color }}
        />
      )}

      {/* Content */}
      <div className="absolute inset-0 p-3 pl-4 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <SpaceIcon space={space} size="lg" />
          {hasActivity && <ActivityPulse />}
        </div>

        {/* Footer info */}
        <div className="mt-auto">
          <h3 className="font-medium text-content-primary truncate">{space.name}</h3>

          {/* Tab warmth indicator */}
          <div className="flex items-center gap-2 mt-1.5">
            <WarmthDots count={space.tabCount} max={5} />
            <span className="text-small text-content-tertiary">{space.tabCount} tabs</span>
          </div>
        </div>
      </div>

      {/* Agent count badge */}
      {space.agentCount > 0 && (
        <div className="absolute top-2 right-2 bg-accent/15 text-accent text-[11px] font-medium px-1.5 py-0.5 rounded">
          {space.agentCount}
        </div>
      )}
    </Link>
  );
}

function SpaceIcon({ space, size }: { space: SpaceInfo; size: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-10 h-10 text-lg' : 'w-8 h-8 text-base';

  return (
    <div
      className={`${sizeClasses} rounded-lg flex items-center justify-center shrink-0`}
      style={{ backgroundColor: space.color ? `${space.color}20` : 'rgba(255,255,255,0.08)' }}
    >
      {space.icon || '📁'}
    </div>
  );
}

function WarmthDots({ count, max }: { count: number; max: number }) {
  const filled = Math.min(count, max);
  const empty = max - filled;

  return (
    <div className="flex gap-0.5">
      {[...Array(filled)].map((_, i) => (
        <span key={`f-${i}`} className="w-1.5 h-1.5 rounded-full bg-content-secondary" />
      ))}
      {[...Array(empty)].map((_, i) => (
        <span key={`e-${i}`} className="w-1.5 h-1.5 rounded-full bg-white/10" />
      ))}
    </div>
  );
}

function ActivityPulse() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
