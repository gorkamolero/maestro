import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence } from 'motion/react';
import { Play, Pencil, MoreHorizontal, Plus, Palette } from 'lucide-react';
import type { Space } from '@/types';
import { SPACE_COLOR_PALETTE } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { notificationsStore, notificationsActions } from '@/stores/notifications.store';
import { cn } from '@/lib/utils';
import { AttentionBubble } from './AttentionBubble';
import { SpaceTasksSection } from './SpaceTasksSection';
import { SpaceContentModeSelector } from './SpaceContentModeSelector';
import { SpaceNotesEditor } from './SpaceNotesEditor';
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface SpaceCardProps {
  space: Space;
  tabs: Tab[];
}

export function SpaceCard({ space, tabs }: SpaceCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(space.name);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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

  const handleColorChange = useCallback((primary: string, secondary: string) => {
    spacesActions.updateSpace(space.id, { primaryColor: primary, secondaryColor: secondary });
  }, [space.id]);

  const handleDeleteSpace = useCallback(() => {
    spacesActions.removeSpace(space.id);
  }, [space.id]);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'group relative flex flex-col flex-shrink-0',
          'w-[280px] h-full rounded-xl overflow-hidden',
          'backdrop-blur-xl',
          'transition-all duration-300'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          // Glassmorphism + left accent bar with subtle color tint
          borderLeft: space.primaryColor
            ? `3px solid ${space.primaryColor}${isHovered ? '' : 'D9'}`
            : undefined,
          boxShadow: isHovered
            ? `
              inset 0 1px 0 0 rgba(255,255,255,0.08),
              inset 0 0 0 1px rgba(255,255,255,0.12),
              0 12px 40px -8px rgba(0,0,0,0.6)
              ${space.primaryColor ? `, 0 0 30px -10px ${space.primaryColor}50` : ''}
            `
            : `
              inset 0 1px 0 0 rgba(255,255,255,0.05),
              inset 0 0 0 1px rgba(255,255,255,0.08),
              0 8px 32px -8px rgba(0,0,0,0.5)
            `,
          background: space.primaryColor
            ? `linear-gradient(180deg, ${space.primaryColor}${isHovered ? '18' : '10'} 0%, transparent 50%), rgba(25, 25, 28, ${isHovered ? '0.85' : '0.8'})`
            : `rgba(25, 25, 28, ${isHovered ? '0.85' : '0.8'})`,
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
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
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
                'border-b border-foreground/20 text-foreground'
              )}
            />
          ) : (
            <h3
              className="flex-1 font-medium text-sm truncate cursor-pointer text-foreground"
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
                    className="p-1.5 rounded transition-colors hover:bg-accent"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setTitleValue(space.name);
                    setIsEditingTitle(true);
                  }}
                  className="p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 hover:bg-accent"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Edit space</p>
              </TooltipContent>
            </Tooltip>
          </div>
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

        {/* Mode selector */}
        <div className="px-3 pb-2">
          <SpaceContentModeSelector spaceId={space.id} mode={space.contentMode || 'tasks'} />
        </div>

        {/* Content area - tasks or notes based on mode */}
        <div className="flex-1 overflow-hidden px-3">
          {(space.contentMode || 'tasks') === 'tasks' ? (
            <SpaceTasksSection spaceId={space.id} />
          ) : (
            <SpaceNotesEditor spaceId={space.id} initialContent={space.notesContent} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Focus the add task input - SpaceTasksSection handles this internally
                  const input = document.querySelector(`[data-space-task-input="${space.id}"]`) as HTMLInputElement;
                  input?.focus();
                }}
                className="p-1.5 rounded transition-colors hover:bg-accent"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Add task</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded transition-colors hover:bg-accent">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="w-4 h-4 mr-2" />
                  Change color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="grid grid-cols-4 gap-1 p-2">
                    {SPACE_COLOR_PALETTE.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => handleColorChange(color.primary, color.secondary)}
                        className={cn(
                          'w-6 h-6 rounded-full transition-transform hover:scale-110',
                          space.primaryColor === color.primary && 'ring-2 ring-offset-2 ring-offset-popover ring-primary'
                        )}
                        style={{ backgroundColor: color.primary }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
