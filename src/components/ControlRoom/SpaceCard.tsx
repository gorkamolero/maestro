import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence } from 'motion/react';
import { Play, Pencil, MoreHorizontal, Plus } from 'lucide-react';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { notificationsStore, notificationsActions } from '@/stores/notifications.store';
import { cn } from '@/lib/utils';
import { AttentionBubble } from './AttentionBubble';
import { SpaceTasksSection } from './SpaceTasksSection';
import { TabPreviewList } from './TabPreviewList';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentProgressBar } from './AgentProgressBar';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TagSelector } from './TagSelector';

interface SpaceCardProps {
  space: Space;
  tabs: Tab[];
}

export function SpaceCard({ space, tabs }: SpaceCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(space.name);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { notifications } = useSnapshot(notificationsStore);

  // Get latest notification for this space
  const latestNotification = useMemo(() => {
    const spaceNotifications = notifications
      .filter((n) => n.spaceId === space.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return spaceNotifications[0] || null;
  }, [notifications, space.id]);

  const handleLaunchAll = useCallback(async () => {
    for (const tab of tabs) {
      if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
        await workspaceActions.launchApp(tab);
      }
    }
  }, [tabs]);

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

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEmojiPickerOpen(true);
  }, []);

  const handleIconChange = useCallback((emoji: string) => {
    spacesActions.updateSpace(space.id, { icon: emoji });
    setIsEmojiPickerOpen(false);
  }, [space.id]);

  const handleDeleteSpace = useCallback(() => {
    spacesActions.deleteSpace(space.id);
  }, [space.id]);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'group relative flex flex-col flex-shrink-0',
          'w-[280px] h-full rounded-xl overflow-hidden',
          'transition-shadow hover:shadow-lg'
        )}
        style={{
          backgroundColor: space.primaryColor || 'hsl(var(--card))',
        }}
      >
        {/* Attention bubble for notifications */}
        <AnimatePresence>
          {latestNotification && (
            <AttentionBubble
              type={latestNotification.type}
              message={latestNotification.message}
              onDismiss={() => notificationsActions.dismiss(latestNotification.id)}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col gap-1 px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            {/* Icon */}
            <EmojiPickerComponent
              value={space.icon}
              onChange={handleIconChange}
              open={isEmojiPickerOpen}
              onOpenChange={setIsEmojiPickerOpen}
            >
              <span
                className="text-lg cursor-pointer hover:scale-110 transition-transform"
                onClick={handleIconClick}
              >
                {space.icon || '📁'}
              </span>
            </EmojiPickerComponent>

            {/* Title */}
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
                  'border-b border-black/20 text-black/80'
                )}
              />
            ) : (
              <h3
                className="flex-1 font-medium text-sm truncate text-black/80 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={handleTitleDoubleClick}
              >
                {space.name}
              </h3>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              {tabs.some(t => t.type === 'app-launcher') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchAll();
                      }}
                      className="p-1.5 hover:bg-black/10 rounded transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-black/50" />
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setTitleValue(space.name);
                      setIsEditingTitle(true);
                    }}
                    className="p-1.5 hover:bg-black/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="w-3.5 h-3.5 text-black/50" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Edit space</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tags */}
          <TagSelector
            spaceId={space.id}
            spaceTags={space.tags || []}
          />
        </div>

        {/* Tabs / Favorites */}
        <div className="px-3 pb-2">
          <TabPreviewList
            tabs={tabs}
            spaceId={space.id}
            showAddButton={true}
            maxVisible={6}
          />
        </div>

        {/* Tasks list - scrollable, takes remaining space */}
        <div className="flex-1 overflow-hidden px-3">
          <SpaceTasksSection spaceId={space.id} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-black/5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Focus the add task input - SpaceTasksSection handles this internally
                  const input = document.querySelector(`[data-space-task-input="${space.id}"]`) as HTMLInputElement;
                  input?.focus();
                }}
                className="p-1.5 hover:bg-black/10 rounded transition-colors"
              >
                <Plus className="w-4 h-4 text-black/50" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Add task</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-black/10 rounded transition-colors">
                <MoreHorizontal className="w-4 h-4 text-black/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleIconClick}>
                Change icon
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteSpace}
                className="text-destructive focus:text-destructive"
              >
                Delete space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Agent progress bar */}
        {hasRunningAgent && (
          <AgentProgressBar />
        )}
      </div>
    </TooltipProvider>
  );
}
