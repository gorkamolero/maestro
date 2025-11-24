import { useSnapshot } from 'valtio';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { workspaceStore, workspaceActions, type Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { useTabClick } from '@/hooks/useTabClick';
import { useMorphingEdit } from '@/hooks/useMorphingEdit';

interface SortableGridTabProps {
  tab: Tab;
  spaceId: string;
}

export function SortableGridTab({ tab }: SortableGridTabProps) {
  const { activeTabId } = useSnapshot(workspaceStore);
  const isActive = activeTabId === tab.id;
  const handleClick = useTabClick(tab);
  const { isEditing, setIsEditing, containerRef, morphingProps, formProps } = useMorphingEdit({
    collapsedHeight: 72,
    expandedHeight: 180,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;

    if (title?.trim()) {
      workspaceActions.renameTab(tab.id, title.trim());
      setIsEditing(false);
    }
  };

  const getTabIcon = () => {
    switch (tab.type) {
      case 'terminal':
        return <span className="text-xl">{'>'}</span>;
      case 'browser':
        return <span className="text-xl">🌐</span>;
      case 'note':
        return <span className="text-xl">📝</span>;
      case 'app-launcher':
        if (tab.appLauncherConfig?.icon) {
          return (
            <img
              src={tab.appLauncherConfig.icon}
              alt={tab.title}
              className="w-8 h-8 rounded"
            />
          );
        }
        return <span className="text-xl">🚀</span>;
      default:
        return <span className="text-xl">📄</span>;
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        width: isEditing ? '200px' : '72px',
      }}
      {...attributes}
      {...(!isEditing && listeners)}
      data-draggable="true"
      onDoubleClick={() => {
        if (!isEditing) {
          setIsEditing(true);
        }
      }}
      onClick={() => {
        if (!isEditing) {
          handleClick();
        }
      }}
      className={cn(
        'group relative overflow-hidden',
        'bg-background/50 border border-border',
        !isEditing && 'cursor-pointer hover:border-border/80 hover:bg-background/80',
        isActive && !isEditing && 'border-b-2 border-primary',
        isDragging && 'opacity-50'
      )}
      {...morphingProps}
    >
      {/* Collapsed view - icon + label */}
      {!isEditing && (
        <div className="flex flex-col items-center justify-center h-full gap-1 p-2">
          {getTabIcon()}
          <span className="text-[10px] truncate w-full text-center">{tab.title}</span>

          {/* Close Button - only show on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              workspaceActions.closeTab(tab.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-1 right-1 p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Expanded view - edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.form
            ref={containerRef}
            {...formProps}
            onSubmit={handleSubmit}
            className="absolute inset-0 flex flex-col p-3 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 flex-1">
              <label htmlFor={`title-${tab.id}`} className="text-xs font-medium">
                Tab Name
              </label>
              <input
                id={`title-${tab.id}`}
                name="title"
                type="text"
                defaultValue={tab.title}
                autoFocus
                className="px-2 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Tab name..."
              />
            </div>
            <div className="flex justify-end gap-2">
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
    </motion.div>
  );
}
