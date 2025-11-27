import { useState, useCallback } from 'react';
import { X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTagsStore, tagsActions } from '@/stores/tags.store';
import { cn } from '@/lib/utils';

interface TagFilterProps {
  className?: string;
}

export function TagFilter({ className }: TagFilterProps) {
  const { tags, activeFilters } = useTagsStore();
  const [isExpanded, setIsExpanded] = useState(false);

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

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center h-9 rounded-lg overflow-hidden',
        'bg-white/[0.04] border border-white/[0.08]',
        className
      )}
    >
      {/* Filter toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center justify-center h-full px-2.5',
          'text-muted-foreground hover:text-foreground',
          'transition-colors duration-150',
          (isExpanded || hasActiveFilters) && 'text-foreground'
        )}
      >
        <Filter className="w-4 h-4" />
        {/* Active indicator dot */}
        {hasActiveFilters && !isExpanded && (
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: tags.find((t) => activeFilters.includes(t.id))?.color }}
          />
        )}
      </button>

      {/* Expandable tags section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center overflow-hidden"
          >
            <div className="flex items-center gap-1 px-1 border-l border-white/[0.08]">
              {tags.map((tag) => {
                const isActive = activeFilters.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleFilter(tag.id)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md',
                      'text-[11px] font-medium whitespace-nowrap',
                      'transition-all duration-150',
                      isActive
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                );
              })}

              {/* Clear button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-md ml-0.5',
                    'text-muted-foreground hover:text-foreground hover:bg-white/10',
                    'transition-all duration-150'
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
