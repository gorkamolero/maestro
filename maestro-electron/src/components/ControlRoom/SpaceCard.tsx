import { useCallback, useMemo } from 'react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { WarmthIndicator } from './WarmthIndicator';
import { SpaceStatusSummary } from './SpaceStatusSummary';
import { NextBubble } from './NextBubble';
import { spacesActions } from '@/stores/spaces.store';

interface SpaceCardProps {
  space: Space;
  tabs: Tab[];
  onMaximize: () => void;
}

function getLastActiveText(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Never';

  const hoursSince =
    (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 'Now';
  if (hoursSince < 24) {
    const hours = Math.floor(hoursSince);
    return `${hours}h ago`;
  }
  const days = Math.floor(hoursSince / 24);
  return `${days}d ago`;
}

export function SpaceCard({ space, tabs, onMaximize }: SpaceCardProps) {
  const handleNextChange = useCallback(
    (next: string | null) => {
      spacesActions.setSpaceNext(space.id, next);
    },
    [space.id]
  );

  const lastActiveText = useMemo(
    () => getLastActiveText(space.lastActiveAt),
    [space.lastActiveAt]
  );

  return (
    <div
      className={cn(
        'group flex flex-col p-5 rounded-lg min-h-[120px]',
        'bg-card hover:bg-accent transition-colors cursor-pointer',
        'border border-white/[0.04]'
      )}
      onClick={onMaximize}
    >
      {/* Header: Icon + Name + Warmth */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{space.icon || '📁'}</span>
        <h3 className="flex-1 font-medium text-sm truncate">{space.name}</h3>
        <WarmthIndicator lastActiveAt={space.lastActiveAt} />
      </div>

      {/* Status - minimal text */}
      <div className="flex-1 mb-3">
        {tabs.length > 0 ? (
          <SpaceStatusSummary tabs={tabs} />
        ) : (
          <p className="text-xs text-muted-foreground">{lastActiveText}</p>
        )}
      </div>

      {/* NEXT */}
      <NextBubble value={space.next} onChange={handleNextChange} />
    </div>
  );
}
