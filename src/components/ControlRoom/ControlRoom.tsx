import { useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTagsStore } from '@/stores/tags.store';
import { SpaceCard } from './SpaceCard';
import { SpacePanesView } from './SpacePanesView';
import { SpaceViewModeSelector } from './SpaceViewModeSelector';
import { TagFilter } from './TagFilter';
import { cn } from '@/lib/utils';

export function ControlRoom() {
  const { spaces, viewMode } = useSpacesStore();
  const { tabs } = useWorkspaceStore();
  const { tags, activeFilters } = useTagsStore();

  // Filter spaces by active tag filters
  const filteredSpaces = useMemo(() => {
    if (activeFilters.length === 0) {
      return spaces;
    }
    return spaces.filter((space) => {
      const spaceTags = space.tags || [];
      return activeFilters.some((filterId) => spaceTags.includes(filterId));
    });
  }, [spaces, activeFilters]);

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    spacesActions.addSpace(name);
  }, [spaces.length]);

  // Render panes view
  if (viewMode === 'panes') {
    return (
      <div className="relative flex flex-col h-full bg-background">
        {/* Top bar with filter and view mode */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
          {tags.length > 0 && <TagFilter />}
          <SpaceViewModeSelector />
        </div>
        <SpacePanesView />
      </div>
    );
  }

  // Render cards view (default)
  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Top bar with filter and view mode */}
      <div className="flex items-center justify-end gap-3 px-6 pt-4">
        {tags.length > 0 && <TagFilter />}
        <SpaceViewModeSelector />
      </div>

      {/* Horizontal scrolling spaces */}
      <div className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden px-6 py-4 gap-4">
        {filteredSpaces.map((space) => {
          const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
          return <SpaceCard key={space.id} space={space} tabs={spaceTabs} />;
        })}

        {/* New Space button - Zed/Telegram style */}
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
      </div>
    </div>
  );
}
