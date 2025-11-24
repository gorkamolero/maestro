import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Home, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMorphingEdit } from '@/hooks/useMorphingEdit';
import { spacesActions } from '@/stores/spaces.store';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';

const SPACE_ICONS: Record<string, LucideIcon> = {
  home: Home,
};

interface SpaceButtonProps {
  space: {
    id: string;
    name: string;
    icon?: string;
    segments: Array<{ status: string }>;
  };
  isActive: boolean;
  onSwitch: () => void;
  onDelete: () => void;
}

export function SpaceButton({ space, isActive, onSwitch, onDelete }: SpaceButtonProps) {
  const [icon, setIcon] = useState(space.icon || '');

  const { isEditing, setIsEditing, containerRef, morphingProps, formProps } = useMorphingEdit({
    collapsedHeight: 32,
    expandedHeight: 180,
  });

  const Icon = SPACE_ICONS[space.icon || 'home'] || Home;
  const hasActiveSegments = space.segments.filter((s) => s.status === 'active').length > 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    if (name?.trim()) {
      spacesActions.updateSpace(space.id, {
        name: name.trim(),
        icon: icon || undefined
      });
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setIsEditing(false);
  };

  return (
    <motion.button
      style={{
        width: isEditing ? '180px' : '32px',
      }}
      onDoubleClick={() => {
        if (!isEditing) {
          setIsEditing(true);
        }
      }}
      onClick={() => {
        if (!isEditing) {
          onSwitch();
        }
      }}
      className={cn(
        'group relative overflow-hidden transition-all',
        'hover:bg-background/80',
        isActive ? 'bg-background shadow-sm' : 'bg-muted/50',
        !isEditing && 'rounded-lg flex items-center justify-center'
      )}
      {...morphingProps}
    >
      {/* Collapsed view */}
      {!isEditing && (
        <div className="relative w-full h-full flex items-center justify-center">
          {space.icon ? (
            <span className="text-lg">{space.icon}</span>
          ) : (
            <Icon className="w-4 h-4" />
          )}
          {hasActiveSegments && (
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
          {isActive && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
          )}
        </div>
      )}

      {/* Expanded view - edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.form
            ref={containerRef}
            {...formProps}
            onSubmit={handleSubmit}
            className="absolute inset-0 flex flex-col p-2 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5 flex-1">
              <label htmlFor={`name-${space.id}`} className="text-xs font-medium">
                Space Name
              </label>
              <input
                id={`name-${space.id}`}
                name="name"
                type="text"
                defaultValue={space.name}
                autoFocus
                className="px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Space name..."
              />

              <label className="text-xs font-medium mt-1">
                Icon
              </label>
              <EmojiPickerComponent value={icon} onChange={setIcon}>
                <button
                  type="button"
                  className="w-full h-10 border border-dashed border-border rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center text-lg"
                >
                  {icon || '+'}
                </button>
              </EmojiPickerComponent>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-2 py-1 text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 rounded-md transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                }}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
