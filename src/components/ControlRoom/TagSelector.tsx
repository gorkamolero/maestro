import { useState, useCallback } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useTagsStore, tagsActions } from '@/stores/tags.store';
import { spacesActions } from '@/stores/spaces.store';
import { cn } from '@/lib/utils';
import { TagBadge } from './TagBadge';
import { TAG_COLOR_PALETTE } from '@/types';
import { ColorPaletteSelector } from '@/components/ui/color-palette-selector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'text-[10px] text-muted-foreground hover:text-foreground',
              'border border-dashed border-white/20 hover:border-white/30',
              'hover:bg-white/5 transition-all duration-200'
            )}
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Tag</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-60 p-3 backdrop-blur-xl bg-popover/95 border-white/10"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Existing tags */}
          {availableTags.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Available tags
              </div>
              <div className="flex flex-col gap-0.5">
                {availableTags.map((tag) => {
                  const isSelected = spaceTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-lg',
                        'hover:bg-white/5 transition-all duration-150 text-left',
                        isSelected && 'bg-white/5'
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
            <div className="space-y-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                placeholder="Tag name..."
                autoFocus
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg',
                  'bg-white/5 border border-white/10',
                  'placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:border-white/20 focus:bg-white/10',
                  'transition-all duration-200'
                )}
              />
              {/* Color picker */}
              <ColorPaletteSelector
                colors={TAG_COLOR_PALETTE}
                selectedIndex={selectedColorIndex}
                onSelect={(_, index) => setSelectedColorIndex(index)}
                size="sm"
                columns={5}
              />
              {/* Actions */}
              <div className="flex items-center gap-1.5 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className={cn(
                    'p-1.5 rounded-lg transition-all duration-200',
                    newTagName.trim()
                      ? 'bg-primary/20 text-primary hover:bg-primary/30'
                      : 'opacity-30 cursor-not-allowed text-muted-foreground'
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
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
                'text-sm text-muted-foreground hover:text-foreground',
                'border border-dashed border-white/10 hover:border-white/20',
                'hover:bg-white/5 transition-all duration-200'
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
