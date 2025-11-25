import { useState, useCallback } from 'react';
import { Settings, Play } from 'lucide-react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { cn } from '@/lib/utils';
import { WarmthIndicator } from './WarmthIndicator';
import { TabPreviewList } from './TabPreviewList';
import { SpaceEditMode } from './SpaceEditMode';
import { NextBubble } from './NextBubble';

interface SpaceCardProps {
  space: Space;
  tabs: Tab[];
  onMaximize: () => void;
  onMaximizeTab: (tabId: string) => void;
}

export function SpaceCard({ space, tabs, onMaximize, onMaximizeTab }: SpaceCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  const handleNextChange = useCallback(
    (next: string | null) => {
      spacesActions.setSpaceNext(space.id, next);
    },
    [space.id]
  );

  const handleLaunchAll = useCallback(async () => {
    // Launch all enabled tabs in the space
    for (const tab of tabs) {
      if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
        await workspaceActions.launchApp(tab);
      }
    }
  }, [tabs]);

  const handleCardClick = () => {
    if (!isEditMode) {
      onMaximize();
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col p-5 rounded-lg min-h-[120px]',
        'bg-card hover:bg-accent transition-colors',
        'border border-white/[0.04]',
        !isEditMode && 'cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      {/* Header: Icon + Name + Actions + Warmth */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{space.icon || '📁'}</span>
        <h3 className="flex-1 font-medium text-sm truncate">{space.name}</h3>

        {/* Hover actions - only visible on group hover when not in edit mode */}
        {!isEditMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditMode(true);
              }}
              className="p-1.5 hover:bg-white/[0.08] rounded transition-colors"
              title="Edit space"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {tabs.some((t) => t.type === 'app-launcher') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLaunchAll();
                }}
                className="p-1.5 hover:bg-white/[0.08] rounded transition-colors"
                title="Launch all apps"
              >
                <Play className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        <WarmthIndicator lastActiveAt={space.lastActiveAt} />
      </div>

      {/* Tab previews OR Edit mode */}
      <div className="flex-1 mb-3">
        {isEditMode ? (
          <SpaceEditMode
            space={space}
            tabs={tabs}
            onDone={() => setIsEditMode(false)}
          />
        ) : (
          <TabPreviewList tabs={tabs} onTabClick={onMaximizeTab} />
        )}
      </div>

      {/* NEXT bubble - always visible */}
      {!isEditMode && (
        <NextBubble value={space.next} onChange={handleNextChange} />
      )}
    </div>
  );
}
