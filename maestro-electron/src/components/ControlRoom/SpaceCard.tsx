import { useCallback, useMemo } from 'react';
import { Home } from 'lucide-react';
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
  if (!lastActiveAt) return 'Never active';

  const hoursSince = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 'Active now';
  if (hoursSince < 24) {
    const hours = Math.floor(hoursSince);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hoursSince / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function SpaceCard({ space, tabs, onMaximize }: SpaceCardProps) {
  const handleNextChange = useCallback(
    (next: string | null) => {
      spacesActions.setSpaceNext(space.id, next);
    },
    [space.id]
  );

  // Memoize last active text to avoid calling Date.now() during render
  const lastActiveText = useMemo(
    () => getLastActiveText(space.lastActiveAt),
    [space.lastActiveAt]
  );

  return (
    <div
      className={cn(
        'group relative flex flex-col p-4 rounded-xl border border-border',
        'bg-card hover:bg-accent/50 transition-all cursor-pointer',
        'hover:shadow-lg hover:scale-[1.02]'
      )}
      onClick={onMaximize}
      style={{
        borderLeftColor: space.primaryColor,
        borderLeftWidth: '3px',
      }}
    >
      {/* Header: Icon, Name, Warmth */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">
            {space.icon || <Home className="w-5 h-5" />}
          </span>
          <h3 className="font-medium truncate">{space.name}</h3>
        </div>
        <WarmthIndicator lastActiveAt={space.lastActiveAt} />
      </div>

      {/* Status Summary */}
      <div className="flex-1 mb-3">
        {tabs.length > 0 ? (
          <SpaceStatusSummary tabs={tabs} />
        ) : (
          <div className="text-xs text-muted-foreground">
            Last: {lastActiveText}
          </div>
        )}
      </div>

      {/* NEXT Bubble */}
      <NextBubble
        value={space.next}
        onChange={handleNextChange}
      />

      {/* Maximize button - visible on hover */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMaximize();
          }}
          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Maximize
        </button>
      </div>
    </div>
  );
}
