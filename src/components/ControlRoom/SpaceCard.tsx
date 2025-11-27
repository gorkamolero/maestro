import { useState, useMemo, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence } from 'motion/react';
import {
  MoreHorizontal,
  Plus,
  Palette,
  Cpu,
  HardDrive,
  CheckSquare,
  FileText,
  Pencil,
} from 'lucide-react';
import { useSpaceTabsPerformance } from '@/hooks/usePerformance';
import { useSpaceTasks } from '@/hooks/useSpaceTasks';
import { formatMemory, formatCpu } from '@/stores/performance.store';
import { TABS_MAX_VISIBLE, TOOLTIP_DELAY_DURATION } from '@/lib/constants';
import { ColorPaletteSelector } from '@/components/ui/color-palette-selector';
import type { Space } from '@/types';
import { SPACE_COLOR_PALETTE } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { notificationsStore, notificationsActions } from '@/stores/notifications.store';
import { cn } from '@/lib/utils';
import { AttentionBubble } from './AttentionBubble';
import { SpaceTasksSection } from './SpaceTasksSection';
import { SpaceNotesEditor } from './SpaceNotesEditor';
import { CollapsibleSection } from './CollapsibleSection';
import { TabPreviewList } from './TabPreviewList';
import { SpaceCardHeader } from './SpaceCardHeader';
import { NextBubble } from './NextBubble';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentProgressBar } from './AgentProgressBar';
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
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { notifications } = useSnapshot(notificationsStore);
  const { totalMemoryKB, avgCpuPercent } = useSpaceTabsPerformance(space.id);

  // Get tasks for this space
  const { tasks: spaceTasks } = useSpaceTasks(space.id);

  // Get latest notification for this space
  const latestNotification = useMemo(() => {
    const spaceNotifications = notifications
      .filter((n) => n.spaceId === space.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return spaceNotifications[0] || null;
  }, [notifications, space.id]);

  // Check if any agent or terminal is running
  const hasRunningAgent = useMemo(() => {
    return tabs.some(
      (t) => (t.type === 'agent' || t.type === 'terminal') && t.status === 'running'
    );
  }, [tabs]);

  const handleColorChange = useCallback(
    (primary: string, secondary: string) => {
      spacesActions.updateSpace(space.id, { primaryColor: primary, secondaryColor: secondary });
    },
    [space.id]
  );

  const handleDeleteSpace = useCallback(() => {
    spacesActions.removeSpace(space.id);
  }, [space.id]);

  const handleOpenEmojiPicker = useCallback(() => {
    setIsEmojiPickerOpen(true);
  }, []);

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_DURATION}>
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
        <SpaceCardHeader
          space={space}
          tabs={tabs}
          isEmojiPickerOpen={isEmojiPickerOpen}
          setIsEmojiPickerOpen={setIsEmojiPickerOpen}
        />

        {/* What's Next bubble - primary focus indicator */}
        <div className="px-3 pb-2">
          <NextBubble
            value={space.next}
            onChange={(value) => spacesActions.updateSpace(space.id, { next: value })}
          />
        </div>

        {/* Tabs / Favorites */}
        <div className="px-3 pb-2">
          <TabPreviewList
            tabs={tabs}
            spaceId={space.id}
            showAddButton={true}
            maxVisible={TABS_MAX_VISIBLE}
          />
        </div>

        {/* Collapsible Tasks & Notes sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
          <CollapsibleSection
            icon={<CheckSquare className="w-3 h-3" />}
            label="Tasks"
            defaultOpen={spaceTasks.length > 0}
            compact
          >
            <div className="px-1 py-1">
              <SpaceTasksSection spaceId={space.id} />
            </div>
          </CollapsibleSection>
          <CollapsibleSection
            icon={<FileText className="w-3 h-3" />}
            label="Notes"
            defaultOpen={!!(space.notesContent && space.notesContent.trim().length > 0)}
            compact
          >
            <div className="py-1">
              <SpaceNotesEditor spaceId={space.id} initialContent={space.notesContent} />
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Focus the add task input - SpaceTasksSection handles this internally
                  const input = document.querySelector(
                    `[data-space-task-input="${space.id}"]`
                  ) as HTMLInputElement;
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

          {/* Performance metrics */}
          {totalMemoryKB > 0 && (
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {formatCpu(avgCpuPercent)}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatMemory(totalMemoryKB)}
              </span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded transition-colors hover:bg-accent">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenEmojiPicker}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenEmojiPicker}>Change icon</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="w-4 h-4 mr-2" />
                  Change color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-2">
                  <ColorPaletteSelector
                    colors={SPACE_COLOR_PALETTE}
                    selectedColor={space.primaryColor}
                    onSelect={(color) => handleColorChange(color.primary, color.secondary)}
                  />
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
        {hasRunningAgent && <AgentProgressBar />}
      </div>
    </TooltipProvider>
  );
}
