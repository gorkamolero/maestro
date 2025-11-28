import { useMemo, useCallback } from 'react';
import { Play, Pencil } from 'lucide-react';
import { useEditableTitle } from '@/hooks/useEditableTitle';
import { cn } from '@/lib/utils';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';
import { TagSelector } from './TagSelector';

interface SpaceCardHeaderProps {
  space: Space;
  tabs: Tab[];
  isEmojiPickerOpen: boolean;
  setIsEmojiPickerOpen: (open: boolean) => void;
  /** Props for the drag handle (applied to emoji icon) */
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

export function SpaceCardHeader({
  space,
  tabs,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  dragHandleProps,
}: SpaceCardHeaderProps) {
  // Editable title hook
  const {
    isEditing: isEditingTitle,
    value: titleValue,
    setValue: setTitleValue,
    inputRef: titleInputRef,
    startEditing: startEditingTitle,
    save: saveTitle,
    handleKeyDown: handleTitleKeyDown,
  } = useEditableTitle({ spaceId: space.id, spaceName: space.name });

  const handleLaunchAll = useCallback(async (): Promise<void> => {
    for (const tab of tabs) {
      if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
        await workspaceActions.launchApp(tab);
      }
    }
  }, [tabs]);

  const handleIconClick = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsEmojiPickerOpen(true);
  }, [setIsEmojiPickerOpen]);

  const handleIconChange = useCallback((emoji: string): void => {
    spacesActions.updateSpace(space.id, { icon: emoji });
    setIsEmojiPickerOpen(false);
  }, [space.id, setIsEmojiPickerOpen]);

  const hasLaunchableTabs = useMemo(
    () => tabs.some((t) => t.type === 'app-launcher'),
    [tabs]
  );

  return (
    <div className="flex flex-col gap-2 px-3 pt-3 pb-2">
      <div className="flex items-center gap-2">
        {/* Icon - serves as drag handle */}
        <EmojiPickerComponent
          value={space.icon}
          onChange={handleIconChange}
          open={isEmojiPickerOpen}
          onOpenChange={setIsEmojiPickerOpen}
        >
          <span
            className={cn(
              'text-lg cursor-grab hover:scale-110 transition-transform',
              'active:cursor-grabbing'
            )}
            onClick={handleIconClick}
            {...dragHandleProps}
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
            onBlur={saveTitle}
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
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEditingTitle();
            }}
          >
            {space.name}
          </h3>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          {hasLaunchableTabs && (
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
                  startEditingTitle();
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

      {/* Tags */}
      <TagSelector spaceId={space.id} spaceTags={space.tags || []} />
    </div>
  );
}
