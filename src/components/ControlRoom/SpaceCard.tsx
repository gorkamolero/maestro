import { useState, useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence } from 'motion/react';
import { Settings, Play } from 'lucide-react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { notificationsStore, notificationsActions } from '@/stores/notifications.store';
import { cn } from '@/lib/utils';
import { WarmthIndicator } from './WarmthIndicator';
import { TabPreviewList } from './TabPreviewList';
import { SpaceEditMode } from './SpaceEditMode';
import { NextBubble } from './NextBubble';
import { AttentionBubble } from './AttentionBubble';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useExpandableScreen } from '@/components/ui/expandable-screen';
import { AgentProgressBar } from './AgentProgressBar';

interface SpaceCardProps {
  space: Space;
  tabs: Tab[];
  onMaximize: () => void;
  onMaximizeTab: (tabId: string) => void;
}

export function SpaceCard({ space, tabs, onMaximize, onMaximizeTab }: SpaceCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const { expand } = useExpandableScreen();
  const { notifications } = useSnapshot(notificationsStore);

  // Get latest notification for this space
  const latestNotification = useMemo(() => {
    const spaceNotifications = notifications
      .filter((n) => n.spaceId === space.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return spaceNotifications[0] || null;
  }, [notifications, space.id]);

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

  // Handle tab click - expand for non-app-launcher tabs
  const handleTabClick = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.type !== 'app-launcher') {
      // Expand the card and show the tab
      expand();
      onMaximizeTab(tabId);
    }
    // App-launcher tabs are handled by TabPreviewIcon directly (launch app)
  }, [tabs, expand, onMaximizeTab]);

  // Check if any agent or terminal is running
  const hasRunningAgent = useMemo(() => {
    return tabs.some(t => (t.type === 'agent' || t.type === 'terminal') && t.status === 'running');
  }, [tabs]);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'group relative flex flex-col p-4 rounded-lg min-h-[160px]',
          'bg-card hover:bg-accent transition-colors',
          'border border-white/[0.04]',
          !isEditMode && 'cursor-pointer'
        )}
        onClick={handleCardClick}
      >
        {/* Attention bubble for notifications */}
        <AnimatePresence>
          {latestNotification && !isEditMode && (
            <AttentionBubble
              type={latestNotification.type}
              message={latestNotification.message}
              onDismiss={() => notificationsActions.dismiss(latestNotification.id)}
              onClick={() => {
                onMaximize();
              }}
            />
          )}
        </AnimatePresence>

        {/* Header: Icon + Name + Actions + Warmth */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{space.icon || '📁'}</span>
          <h3 className="flex-1 font-medium text-sm truncate">{space.name}</h3>

          {/* Hover actions - only visible on group hover when not in edit mode */}
          {!isEditMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditMode(true);
                    }}
                    className="p-1.5 hover:bg-white/[0.08] rounded transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Edit space</p>
                </TooltipContent>
              </Tooltip>
              {tabs.some((t) => t.type === 'app-launcher') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchAll();
                      }}
                      className="p-1.5 hover:bg-white/[0.08] rounded transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Launch all apps</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          <WarmthIndicator lastActiveAt={space.lastActiveAt} />
        </div>

        {/* Tab previews OR Edit mode */}
        <div className="flex-1 min-h-0">
          {isEditMode ? (
            <SpaceEditMode
              space={space}
              tabs={tabs}
              onDone={() => setIsEditMode(false)}
            />
          ) : (
            <TabPreviewList
              tabs={tabs}
              spaceId={space.id}
              onTabClick={handleTabClick}
            />
          )}
        </div>

        {/* NEXT bubble - always visible */}
        {!isEditMode && (
          <div className="mt-auto pt-2">
            <NextBubble value={space.next} onChange={handleNextChange} />
          </div>
        )}

        {/* Agent progress bar - shows when agent/terminal is running */}
        {hasRunningAgent && !isEditMode && (
          <AgentProgressBar />
        )}
      </div>
    </TooltipProvider>
  );
}
