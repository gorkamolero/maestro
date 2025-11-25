import { useCallback, useMemo } from 'react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { WarmthIndicator } from './WarmthIndicator';
import { SpaceStatusSummary } from './SpaceStatusSummary';
import { NextBubble } from './NextBubble';
import { MaximizedWorkspace } from './MaximizedWorkspace';
import { spacesActions } from '@/stores/spaces.store';
import { workspaceActions } from '@/stores/workspace.store';
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
  useExpandableScreen,
} from '@/components/ui/expandable-screen';

interface SpaceCardExpandableProps {
  space: Space;
  tabs: Tab[];
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

// Inner component that can use the expandable screen context
function SpaceCardContent({ space, tabs }: SpaceCardExpandableProps) {
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

// Wrapper component for the maximized content that has access to collapse
function MaximizedWorkspaceWrapper({ space }: { space: Space }) {
  const { collapse } = useExpandableScreen();

  const handleBack = useCallback(() => {
    collapse();
    // Also update workspace store state
    workspaceActions.returnToControlRoom();
  }, [collapse]);

  return <MaximizedWorkspace space={space} onBack={handleBack} />;
}

export function SpaceCardExpandable({ space, tabs }: SpaceCardExpandableProps) {
  const handleExpand = useCallback(() => {
    // Set this space as active when expanded
    spacesActions.updateSpaceLastActive(space.id);
    workspaceActions.maximizeSpace(space.id);
  }, [space.id]);

  return (
    <ExpandableScreen
      layoutId={`space-${space.id}`}
      triggerRadius="8px"
      contentRadius="0px"
      animationDuration={0.35}
      onExpandChange={(expanded) => {
        if (expanded) {
          handleExpand();
        }
      }}
    >
      {/* The card trigger */}
      <ExpandableScreenTrigger>
        <SpaceCardContent space={space} tabs={tabs} />
      </ExpandableScreenTrigger>

      {/* The maximized workspace content */}
      <ExpandableScreenContent
        className="bg-background"
        showCloseButton={false}
      >
        <MaximizedWorkspaceWrapper space={space} />
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
