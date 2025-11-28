import { useCallback, useMemo, useState } from 'react';
import { Plus, Archive } from 'lucide-react';
import SortableList, { SortableItem } from 'react-easy-sort';
import { arrayMoveImmutable } from 'array-move';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTagsStore } from '@/stores/tags.store';
import { SpaceCard } from './SpaceCard';
import { SpacePanesView } from './SpacePanesView';
import { SpaceViewModeSelector } from './SpaceViewModeSelector';
import { TagFilter } from './TagFilter';
import { VaultDrawer } from './VaultDrawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function ControlRoom() {
  const { spaces, viewMode } = useSpacesStore();
  const { tabs } = useWorkspaceStore();
  const { tags, activeFilters } = useTagsStore();
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Count inactive spaces for vault badge
  const inactiveCount = useMemo(
    () => spaces.filter((space) => space.isActive === false).length,
    [spaces]
  );

  // Filter spaces: only active spaces, then by tag filters
  const filteredSpaces = useMemo(() => {
    // First filter out inactive spaces (vault)
    const activeSpaces = spaces.filter((space) => space.isActive !== false);

    // Then filter by tag filters if any
    if (activeFilters.length === 0) {
      return activeSpaces;
    }
    return activeSpaces.filter((space) => {
      const spaceTags = space.tags || [];
      return activeFilters.some((filterId) => spaceTags.includes(filterId));
    });
  }, [spaces, activeFilters]);

  const handleSortEnd = useCallback(
    (oldIndex: number, newIndex: number) => {
      // Get the space being moved from filtered list
      const movedSpace = filteredSpaces[oldIndex];
      const targetSpace = filteredSpaces[newIndex];
      if (!movedSpace || !targetSpace) return;

      // Find actual indices in full spaces array
      const actualOldIndex = spaces.findIndex((s) => s.id === movedSpace.id);
      const actualNewIndex = spaces.findIndex((s) => s.id === targetSpace.id);
      if (actualOldIndex === -1 || actualNewIndex === -1) return;

      const reordered = arrayMoveImmutable(spaces, actualOldIndex, actualNewIndex);
      spacesActions.reorderSpaces(reordered);
    },
    [spaces, filteredSpaces]
  );

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    spacesActions.addSpace(name);
  }, [spaces.length]);

  // Render panes view (no drag reordering - sticky positioning conflicts)
  if (viewMode === 'panes') {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="relative flex flex-col h-full bg-background">
          {/* Top bar with filter and view mode */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
            {tags.length > 0 && <TagFilter />}
            <SpaceViewModeSelector />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsVaultOpen(true)}
                  className={cn(
                    'relative p-1.5 rounded-md transition-colors',
                    'text-muted-foreground hover:text-foreground hover:bg-accent',
                    inactiveCount > 0 && 'text-foreground'
                  )}
                >
                  <Archive className="w-4 h-4" />
                  {inactiveCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                      {inactiveCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Vault</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <SpacePanesView />
          <VaultDrawer open={isVaultOpen} onOpenChange={setIsVaultOpen} />
        </div>
      </TooltipProvider>
    );
  }

  // Render cards view (default) with drag-and-drop reordering
  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex flex-col h-full bg-background">
        {/* Top bar with filter and view mode */}
        <div className="flex items-center justify-end gap-3 px-6 pt-4">
          {tags.length > 0 && <TagFilter />}
          <SpaceViewModeSelector />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsVaultOpen(true)}
                className={cn(
                  'relative p-1.5 rounded-md transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-accent',
                  inactiveCount > 0 && 'text-foreground'
                )}
              >
                <Archive className="w-4 h-4" />
                {inactiveCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                    {inactiveCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Vault</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Horizontal scrolling spaces with drag-and-drop */}
        <SortableList
          onSortEnd={handleSortEnd}
          className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden px-6 py-4 gap-4"
          draggedItemClassName="opacity-50"
        >
          {filteredSpaces.map((space) => {
            const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
            return (
              <SortableItem key={space.id}>
                <div>
                  <SpaceCard space={space} tabs={spaceTabs} />
                </div>
              </SortableItem>
            );
          })}

          {/* New Space button - not sortable */}
          <button
            type="button"
            onClick={handleNewSpace}
            className={cn(
              'flex-shrink-0 flex flex-col items-center justify-center gap-3',
              'w-[280px] rounded-lg',
              'text-muted-foreground hover:text-foreground',
              'bg-transparent hover:bg-accent',
              'border border-dashed border-border hover:border-transparent',
              'transition-all duration-150'
            )}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">New space</span>
          </button>
        </SortableList>
        <VaultDrawer open={isVaultOpen} onOpenChange={setIsVaultOpen} />
      </div>
    </TooltipProvider>
  );
}
