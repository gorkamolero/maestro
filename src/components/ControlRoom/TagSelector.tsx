import { useState, useCallback } from 'react';
import { Plus, Check, X, Tag as TagIcon } from 'lucide-react';
import { useTagsStore, tagsActions } from '@/stores/tags.store';
import { spacesActions } from '@/stores/spaces.store';
import { cn } from '@/lib/utils';
import { TagBadge } from './TagBadge';
import { TAG_COLOR_PALETTE } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagSelectorProps {
  spaceId: string;
  spaceTags: string[];
  className?: string;
}

export function TagSelector({ spaceId, spaceTags, className }: TagSelectorProps) {
  const { tags: availableTags } = useTagsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const handleToggleTag = useCallback(
    (tagId: string) => {
      spacesActions.toggleTag(spaceId, tagId);
    },
    [spaceId]
  );

  const handleCreateTag = useCallback(() => {
    if (newTagName.trim()) {
      const tag = tagsActions.addTag(newTagName.trim(), TAG_COLOR_PALETTE[selectedColorIndex]);
      spacesActions.addTag(spaceId, tag.id);
      setNewTagName('');
      setIsCreating(false);
      setSelectedColorIndex((prev) => (prev + 1) % TAG_COLOR_PALETTE.length);
    }
  }, [newTagName, selectedColorIndex, spaceId]);

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      spacesActions.removeTag(spaceId, tagId);
    },
    [spaceId]
  );

  // Get tag objects for the space's tags
  const spaceTagObjects = availableTags.filter((t) => spaceTags.includes(t.id));

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Display current tags */}
      {spaceTagObjects.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          removable
          onRemove={() => handleRemoveTag(tag.id)}
          size="sm"
        />
      ))}

      {/* Add tag button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5',
              'text-[10px] text-black/50 hover:text-black/70',
              'border border-dashed border-black/20 hover:border-black/30',
              'transition-colors'
            )}
          >
            <TagIcon className="w-2.5 h-2.5" />
            <span>Tag</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Existing tags */}
          {availableTags.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1.5">Available tags</div>
              <div className="flex flex-col gap-1">
                {availableTags.map((tag) => {
                  const isSelected = spaceTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-md',
                        'hover:bg-accent transition-colors text-left'
                      )}
                    >
                      <TagBadge tag={tag} size="sm" />
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create new tag */}
          {isCreating ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                placeholder="Tag name"
                autoFocus
                className={cn(
                  'w-full px-2 py-1.5 text-sm rounded-md',
                  'border border-input bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              />
              {/* Color picker */}
              <div className="flex flex-wrap gap-1">
                {TAG_COLOR_PALETTE.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColorIndex(index)}
                    className={cn(
                      'w-5 h-5 rounded-full transition-transform',
                      selectedColorIndex === index && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className={cn(
                    'p-1.5 rounded-md hover:bg-accent transition-colors',
                    !newTagName.trim() && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md',
                'text-sm text-muted-foreground hover:text-foreground',
                'hover:bg-accent transition-colors'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Create new tag
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
