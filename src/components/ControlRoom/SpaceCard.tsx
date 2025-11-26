import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence } from 'motion/react';
import { Play, Maximize2 } from 'lucide-react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { notificationsStore, notificationsActions } from '@/stores/notifications.store';
import { cn } from '@/lib/utils';
import { WarmthIndicator } from './WarmthIndicator';
import { TabPreviewList } from './TabPreviewList';
import { NextBubble } from './NextBubble';
import { AttentionBubble } from './AttentionBubble';
import { SpaceTasksSection } from './SpaceTasksSection';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useExpandableScreen } from '@/components/ui/expandable-screen';
import { AgentProgressBar } from './AgentProgressBar';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';

interface SpaceCardProps {
  space: Space;
  tabs: Tab[];
  onMaximize: () => void;
  onMaximizeTab: (tabId: string) => void;
}

export function SpaceCard({ space, tabs, onMaximize, onMaximizeTab }: SpaceCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(space.name);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
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

  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMaximize();
  }, [onMaximize]);

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

  // ============================================================================
  // Inline Title Editing
  // ============================================================================

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleValue(space.name);
    setIsEditingTitle(true);
  }, [space.name]);

  const handleTitleSave = useCallback(() => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== space.name) {
      spacesActions.updateSpace(space.id, { name: trimmed });
    }
    setIsEditingTitle(false);
  }, [titleValue, space.id, space.name]);

  const handleTitleCancel = useCallback(() => {
    setTitleValue(space.name);
    setIsEditingTitle(false);
  }, [space.name]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  // ============================================================================
  // Icon/Emoji Picker
  // ============================================================================

  const handleIconDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEmojiPickerOpen(true);
  }, []);

  const handleIconChange = useCallback((emoji: string) => {
    spacesActions.updateSpace(space.id, { icon: emoji });
    setIsEmojiPickerOpen(false);
  }, [space.id]);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'group relative flex flex-col p-4 rounded-lg min-h-[160px]',
          'bg-card hover:bg-accent transition-colors',
          'border border-white/[0.04]'
        )}
      >
        {/* Attention bubble for notifications */}
        <AnimatePresence>
          {latestNotification && (
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
          {/* Icon - double click to open emoji picker */}
          <EmojiPickerComponent
            value={space.icon}
            onChange={handleIconChange}
            open={isEmojiPickerOpen}
            onOpenChange={setIsEmojiPickerOpen}
          >
            <span
              className="text-base cursor-pointer hover:bg-white/[0.08] rounded p-0.5 transition-colors"
              onDoubleClick={handleIconDoubleClick}
              onClick={(e) => e.stopPropagation()}
            >
              {space.icon || '📁'}
            </span>
          </EmojiPickerComponent>

          {/* Title - double click to edit inline */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex-1 bg-transparent font-medium text-sm outline-none min-w-0',
                'border-b border-primary/50'
              )}
            />
          ) : (
            <h3
              className="flex-1 font-medium text-sm truncate"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={handleTitleDoubleClick}
            >
              {space.name}
            </h3>
          )}

          {/* Hover actions - only visible on group hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleMaximize}
                  className="p-1.5 hover:bg-white/[0.08] rounded transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Open space</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <WarmthIndicator lastActiveAt={space.lastActiveAt} />
        </div>

        {/* Tab previews */}
        <div className="flex-1 min-h-0">
          <TabPreviewList
            tabs={tabs}
            spaceId={space.id}
            onTabClick={handleTabClick}
          />
        </div>

        {/* NEXT bubble - always visible */}
        <div className="mt-auto pt-2">
          <NextBubble value={space.next} onChange={handleNextChange} />
        </div>

        {/* Tasks section - collapsible */}
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <SpaceTasksSection spaceId={space.id} />
        </div>

        {/* Agent progress bar - shows when agent/terminal is running */}
        {hasRunningAgent && (
          <AgentProgressBar />
        )}
      </div>
    </TooltipProvider>
  );
}
