import { useRef, useCallback, useState, memo, useEffect } from 'react';
import { Plus, CheckSquare, FileText } from 'lucide-react';
import { arrayMoveImmutable } from 'array-move';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useEditableTitle } from '@/hooks/useEditableTitle';
import { useSpaceTasks } from '@/hooks/useSpaceTasks';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { TabPreviewList } from './TabPreviewList';
import { SpaceTasksSection } from './SpaceTasksSection';
import { SpaceNotesEditor } from './SpaceNotesEditor';
import { TagSelector } from './TagSelector';
import { CollapsibleSection } from './CollapsibleSection';
import { NextBubble } from './NextBubble';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';
import { cn } from '@/lib/utils';

// Pane configuration
const PANE_WIDTH = 480;
const SPINE_WIDTH = 36;

/**
 * SpacePanesView implements the Andy Matuschak / Obsidian sliding panes pattern for Spaces.
 * Each pane has a spine attached to its left edge. When scrolling horizontally,
 * the spines stick to the left and stack on top of each other.
 */
export function SpacePanesView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { spaces } = useSpacesStore();
  const { tabs } = useWorkspaceStore();
  const [focusedSpaceId, setFocusedSpaceId] = useState<string | null>(spaces[0]?.id || null);

  // Drag state for reordering
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Get tabs for a space
  const getSpaceTabs = useCallback(
    (spaceId: string) => tabs.filter((t) => t.spaceId === spaceId),
    [tabs]
  );

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    const newSpace = spacesActions.addSpace(name);
    setFocusedSpaceId(newSpace.id);
    // Scroll to the new pane
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          left: containerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 50);
  }, [spaces.length]);

  const handlePaneClick = useCallback((spaceId: string, index: number) => {
    setFocusedSpaceId(spaceId);
    // Scroll so this pane's content is visible (accounting for stacked spines on the left)
    if (containerRef.current) {
      // We want the pane's content area to be visible, not hidden behind stacked spines
      // The scroll position should place this pane's spine at its sticky position
      const scrollLeft = index * (PANE_WIDTH - SPINE_WIDTH);
      containerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  // Drag handlers for spine reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
    setDropIndex(null);
  }, []);

  const handleDragOverSpine = useCallback(
    (targetIndex: number) => {
      if (draggingIndex === null) return;
      // Simply set the target index - hovering over a spine means "insert here"
      if (targetIndex !== dropIndex && targetIndex !== draggingIndex) {
        setDropIndex(targetIndex);
      }
    },
    [draggingIndex, dropIndex]
  );

  const handleDragEnd = useCallback(() => {
    if (draggingIndex !== null && dropIndex !== null && draggingIndex !== dropIndex) {
      const reordered = arrayMoveImmutable(spaces, draggingIndex, dropIndex);
      spacesActions.reorderSpaces(reordered);
    }
    setDraggingIndex(null);
    setDropIndex(null);
  }, [draggingIndex, dropIndex, spaces]);

  // Get the space being dragged for ghost rendering
  const draggingSpace = draggingIndex !== null ? spaces[draggingIndex] : null;

  // Global mouse up listener to handle drag end
  useEffect(() => {
    if (draggingIndex !== null) {
      const handleMouseUp = () => handleDragEnd();
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [draggingIndex, handleDragEnd]);

  return (
    <div
      ref={containerRef}
      className="flex h-full overflow-x-auto overflow-y-hidden bg-background scroll-smooth"
    >
      {spaces.map((space, index) => (
        <SpacePane
          key={space.id}
          space={space}
          tabs={getSpaceTabs(space.id)}
          index={index}
          totalPanes={spaces.length}
          isFocused={space.id === focusedSpaceId}
          onClick={() => handlePaneClick(space.id, index)}
          isDragging={draggingIndex === index}
          ghostSpace={dropIndex === index && draggingSpace ? draggingSpace : null}
          onDragStart={() => handleDragStart(index)}
          onDragOverSpine={() => handleDragOverSpine(index)}
        />
      ))}

      {/* New Space button at the end */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          minWidth: PANE_WIDTH,
          marginLeft: spaces.length > 0 ? 0 : undefined,
        }}
      >
        <button
          type="button"
          onClick={handleNewSpace}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8',
            'text-muted-foreground hover:text-foreground',
            'bg-transparent hover:bg-accent/50',
            'border border-dashed border-border/50 hover:border-border',
            'rounded-xl transition-all duration-150'
          )}
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">New space</span>
        </button>
      </div>
    </div>
  );
}

interface SpacePaneProps {
  space: Space;
  tabs: Tab[];
  index: number;
  totalPanes: number;
  isFocused: boolean;
  onClick: () => void;
  isDragging: boolean;
  ghostSpace: Space | null; // The space being dragged, shown as ghost at drop position
  onDragStart: () => void;
  onDragOverSpine: () => void;
}

/**
 * A single pane with its spine. The entire pane uses position:sticky
 * so it pins to the left edge as the user scrolls, creating the stacking effect.
 */
const SpacePane = memo(function SpacePane({
  space,
  tabs,
  index,
  totalPanes,
  isFocused,
  onClick,
  isDragging,
  ghostSpace,
  onDragStart,
  onDragOverSpine,
}: SpacePaneProps) {
  // Calculate right offset for right-side stacking
  const rightOffset = (totalPanes - 1 - index) * SPINE_WIDTH;

  // Only scroll into view when clicking the spine, not content
  const handleSpineClick = useCallback(() => {
    onClick();
  }, [onClick]);

  // Get tasks for this space to determine if section should be open
  const { tasks: spaceTasks } = useSpaceTasks(space.id);

  return (
    <div
      data-pane-id={space.id}
      className={cn(
        'relative flex-shrink-0 border-r border-border/30',
        'transition-shadow duration-200',
        isFocused && 'shadow-2xl shadow-black/30',
        isDragging && 'opacity-50'
      )}
      style={{
        position: 'sticky',
        left: index * SPINE_WIDTH,
        minWidth: PANE_WIDTH,
        width: `calc(100vw - ${index * SPINE_WIDTH}px - ${rightOffset}px)`,
        maxWidth: PANE_WIDTH,
      }}
    >
      {/* Ghost spine - shows where the dragged pane will be inserted */}
      {ghostSpace && (
        <div
          className="absolute left-0 top-0 bottom-0 z-50 pointer-events-none opacity-60"
          style={{
            width: SPINE_WIDTH,
            borderLeft: ghostSpace.primaryColor
              ? `3px solid ${ghostSpace.primaryColor}`
              : '3px solid hsl(var(--border))',
            background: ghostSpace.primaryColor
              ? `linear-gradient(180deg, color-mix(in srgb, ${ghostSpace.primaryColor} 30%, rgb(16, 17, 19)) 0%, rgb(12, 13, 15) 100%)`
              : 'linear-gradient(180deg, rgb(18, 19, 21) 0%, rgb(12, 13, 15) 100%)',
            boxShadow: `0 0 12px ${ghostSpace.primaryColor || 'rgba(255,255,255,0.3)'}`,
          }}
        >
          {/* Ghost spine title */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
              <span className="text-sm">{ghostSpace.icon || '📁'}</span>
              <span className="truncate" style={{ maxWidth: '60vh' }}>
                {ghostSpace.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Spine - vertical strip on the left - drag handle */}
      <div
        onClick={handleSpineClick}
        onMouseDown={(e) => {
          e.preventDefault();
          onDragStart();
        }}
        onMouseEnter={onDragOverSpine}
        className={cn(
          'absolute left-0 top-0 bottom-0',
          'border-r border-white/[0.08]',
          'cursor-grab select-none transition-all duration-200',
          'active:cursor-grabbing',
          isDragging && 'cursor-grabbing'
        )}
        style={{
          width: SPINE_WIDTH,
          borderLeft: space.primaryColor
            ? `3px solid ${space.primaryColor}`
            : '3px solid hsl(var(--border))',
          background: space.primaryColor
            ? `linear-gradient(180deg, color-mix(in srgb, ${space.primaryColor} 10%, rgb(16, 17, 19)) 0%, rgb(12, 13, 15) 100%)`
            : 'linear-gradient(180deg, rgb(18, 19, 21) 0%, rgb(12, 13, 15) 100%)',
          boxShadow:
            isFocused && space.primaryColor ? `inset 0 0 30px ${space.primaryColor}25` : undefined,
        }}
      >
        {/* Rotated title text */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="text-sm">{space.icon || '📁'}</span>
            <span className="truncate" style={{ maxWidth: '60vh' }}>
              {space.name}
            </span>
          </div>
        </div>
      </div>

      {/* Content area - offset by spine width */}
      <div
        className="absolute top-0 bottom-0 right-0 flex flex-col"
        style={{
          left: SPINE_WIDTH,
          background: isFocused
            ? 'linear-gradient(180deg, rgb(22, 23, 25) 0%, rgb(16, 17, 19) 100%)'
            : 'linear-gradient(180deg, rgb(18, 19, 21) 0%, rgb(13, 14, 16) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 1px 0 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 h-7 px-2 border-b border-white/[0.06] text-[11px]">
          <SpacePaneHeaderContent space={space} tabs={tabs} />
        </div>
        {/* Tabs section */}
        <div className="px-2 py-1.5 border-b border-border/30">
          <TabPreviewList tabs={tabs} spaceId={space.id} showAddButton={true} maxVisible={6} />
        </div>

        {/* What's Next bubble */}
        <div className="px-2 py-1.5 border-b border-border/30">
          <NextBubble
            value={space.next}
            onChange={(value) => spacesActions.updateSpace(space.id, { next: value })}
          />
        </div>

        {/* Content area - collapsible Tasks and Notes sections */}
        <div className="flex-1 overflow-y-auto">
          <CollapsibleSection
            icon={<CheckSquare className="w-3 h-3" />}
            label="Tasks"
            defaultOpen={spaceTasks.length > 0}
          >
            <div className="px-3 py-2">
              <SpaceTasksSection spaceId={space.id} />
            </div>
          </CollapsibleSection>
          <CollapsibleSection
            icon={<FileText className="w-3 h-3" />}
            label="Notes"
            defaultOpen={!!(space.notesContent && space.notesContent.trim().length > 0)}
          >
            <SpaceNotesEditor spaceId={space.id} initialContent={space.notesContent} />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
});

interface SpacePaneHeaderContentProps {
  space: Space;
  tabs: Tab[];
}

/**
 * Header content - icon + editable title + tab count.
 * Rendered inside the header row which has the gradient background.
 */
const SpacePaneHeaderContent = memo(function SpacePaneHeaderContent({ space, tabs }: SpacePaneHeaderContentProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Use shared editable title hook
  const {
    isEditing: isEditingTitle,
    value: titleValue,
    setValue: setTitleValue,
    inputRef: titleInputRef,
    startEditing: startEditingTitle,
    save: saveTitle,
    handleKeyDown: handleTitleKeyDown,
  } = useEditableTitle({ spaceId: space.id, spaceName: space.name });

  const handleIconChange = useCallback(
    (emoji: string) => {
      spacesActions.updateSpace(space.id, { icon: emoji });
      setIsEmojiPickerOpen(false);
    },
    [space.id]
  );

  return (
    <>
      {/* Icon picker */}
      <EmojiPickerComponent
        value={space.icon}
        onChange={handleIconChange}
        open={isEmojiPickerOpen}
        onOpenChange={setIsEmojiPickerOpen}
      >
        <span
          className="cursor-pointer hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            setIsEmojiPickerOpen(true);
          }}
        >
          {space.icon || '📁'}
        </span>
      </EmojiPickerComponent>

      {/* Editable title */}
      {isEditingTitle ? (
        <input
          ref={titleInputRef}
          type="text"
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={saveTitle}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-[11px] font-medium outline-none min-w-0 border-b border-foreground/20"
        />
      ) : (
        <span
          className="flex-1 font-medium truncate cursor-pointer hover:text-foreground text-foreground/80"
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditingTitle();
          }}
        >
          {space.name}
        </span>
      )}

      {/* Tab count badge */}
      {tabs.length > 0 && (
        <span className="text-muted-foreground/60 tabular-nums">{tabs.length}</span>
      )}

      {/* Tags */}
      <TagSelector spaceId={space.id} spaceTags={space.tags || []} className="ml-auto" />
    </>
  );
});
