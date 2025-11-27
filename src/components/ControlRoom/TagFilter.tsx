import { useCallback } from 'react';
import { X, Filter } from 'lucide-react';
import { useTagsStore, tagsActions } from '@/stores/tags.store';
import { cn } from '@/lib/utils';
import { TagBadge } from './TagBadge';

interface TagFilterProps {
  className?: string;
}

export function TagFilter({ className }: TagFilterProps) {
  const { tags, activeFilters } = useTagsStore();

  const handleToggleFilter = useCallback((tagId: string) => {
    tagsActions.toggleFilter(tagId);
  }, []);

  const handleClearFilters = useCallback(() => {
    tagsActions.clearFilters();
  }, []);

  // Don't render if no tags exist
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Filter:</span>
      </div>

      {/* Tag buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => {
          const isActive = activeFilters.includes(tag.id);
          return (
            <TagBadge
              key={tag.id}
              tag={tag}
              onClick={() => handleToggleFilter(tag.id)}
              active={isActive}
              size="sm"
              className={cn(
                !isActive && 'opacity-50 hover:opacity-80'
              )}
            />
          );
        })}

        {/* Clear filters button */}
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={handleClearFilters}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full',
              'text-[10px] text-muted-foreground hover:text-foreground',
              'bg-muted/50 hover:bg-muted transition-colors'
            )}
          >
            <X className="w-2.5 h-2.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
