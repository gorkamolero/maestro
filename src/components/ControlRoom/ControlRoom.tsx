import { useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTagsStore } from '@/stores/tags.store';
import { SpaceCard } from './SpaceCard';
import { TagFilter } from './TagFilter';
import { cn } from '@/lib/utils';

export function ControlRoom() {
  const { spaces } = useSpacesStore();
  const { tabs } = useWorkspaceStore();
  const { tags, activeFilters } = useTagsStore();

  // Filter spaces by active tag filters
  const filteredSpaces = useMemo(() => {
    if (activeFilters.length === 0) {
      return spaces;
    }
    return spaces.filter((space) => {
      const spaceTags = space.tags || [];
      // Space must have at least one of the active filter tags
      return activeFilters.some((filterId) => spaceTags.includes(filterId));
    });
  }, [spaces, activeFilters]);

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    spacesActions.addSpace(name);
  }, [spaces.length]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Filter bar - only show if tags exist */}
      {tags.length > 0 && (
        <div className="px-4 pt-3 pb-0">
          <TagFilter />
        </div>
      )}

      {/* Horizontal scrolling spaces */}
      <div className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden px-4 py-4 gap-3">
        {filteredSpaces.map((space) => {
          const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
          return (
            <SpaceCard
              key={space.id}
              space={space}
              tabs={spaceTabs}
            />
          );
        })}

        {/* New Space button */}
        <button
          type="button"
          onClick={handleNewSpace}
          className={cn(
            'flex-shrink-0 flex flex-col items-center justify-center gap-2',
            'w-[280px] rounded-xl',
            'text-muted-foreground hover:text-foreground',
            'border-2 border-dashed border-white/[0.08] hover:border-white/[0.15]',
            'hover:bg-white/[0.02] transition-all'
          )}
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm">New space</span>
        </button>
      </div>
    </div>
  );
}
