import { useState, useCallback } from 'react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { SpaceCard } from './SpaceCard';
import { MaximizedWorkspace } from './MaximizedWorkspace';
import { MaximizedTab } from './MaximizedTab';
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

type ExpandMode =
  | { type: 'none' }
  | { type: 'space' }
  | { type: 'tab'; tabId: string };

// Wrapper component for the maximized content that has access to collapse
function MaximizedContentWrapper({
  space,
  tabs,
  mode,
  onModeReset,
}: {
  space: Space;
  tabs: Tab[];
  mode: ExpandMode;
  onModeReset: () => void;
}) {
  const { collapse } = useExpandableScreen();

  const handleBack = useCallback(() => {
    collapse();
    onModeReset();
    workspaceActions.returnToControlRoom();
  }, [collapse, onModeReset]);

  if (mode.type === 'tab') {
    const tab = tabs.find((t) => t.id === mode.tabId);
    if (tab) {
      return <MaximizedTab tab={tab} space={space} onBack={handleBack} />;
    }
  }

  return <MaximizedWorkspace space={space} onBack={handleBack} />;
}

export function SpaceCardExpandable({ space, tabs }: SpaceCardExpandableProps) {
  const [expandMode, setExpandMode] = useState<ExpandMode>({ type: 'none' });

  const handleMaximizeSpace = useCallback(() => {
    setExpandMode({ type: 'space' });
  }, []);

  const handleMaximizeTab = useCallback((tabId: string) => {
    setExpandMode({ type: 'tab', tabId });
  }, []);

  const handleModeReset = useCallback(() => {
    setExpandMode({ type: 'none' });
  }, []);

  const handleExpandChange = useCallback(
    (expanded: boolean) => {
      if (expanded && expandMode.type !== 'none') {
        // Set this space as active when expanded
        spacesActions.updateSpaceLastActive(space.id);
        workspaceActions.maximizeSpace(space.id);

        // If maximizing a specific tab, also set it as active
        if (expandMode.type === 'tab') {
          workspaceActions.setActiveTab(expandMode.tabId);
        }
      }
      if (!expanded) {
        handleModeReset();
      }
    },
    [expandMode, space.id, handleModeReset]
  );

  return (
    <ExpandableScreen
      layoutId={`space-${space.id}`}
      triggerRadius="8px"
      contentRadius="0px"
      animationDuration={0.35}
      onExpandChange={handleExpandChange}
    >
      {/* The card trigger */}
      <ExpandableScreenTrigger>
        <SpaceCard
          space={space}
          tabs={tabs}
          onMaximize={handleMaximizeSpace}
          onMaximizeTab={handleMaximizeTab}
        />
      </ExpandableScreenTrigger>

      {/* The maximized content - either workspace or single tab */}
      <ExpandableScreenContent
        className="bg-background"
        showCloseButton={false}
      >
        <MaximizedContentWrapper
          space={space}
          tabs={tabs}
          mode={expandMode}
          onModeReset={handleModeReset}
        />
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
