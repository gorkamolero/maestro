import { AnimatePresence, motion } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { Tab, workspaceActions, workspaceStore } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { useSnapshot } from 'valtio';
import { useTabClick } from '@/hooks/useTabClick';
import { useMorphingEdit } from '@/hooks/useMorphingEdit';

interface DraggableTabProps {
  tab: Tab;
  index: number;
  spaceId: string;
}

export function DraggableTab({ tab }: DraggableTabProps) {
  const { activeTabId } = useSnapshot(workspaceStore);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTabClick = useTabClick(tab);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const isActive = activeTabId === tab.id;

  const collapsedHeight = 50;
  const expandedHeight = 150;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

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
        // Use the app icon if available
        if (tab.appLauncherConfig?.icon) {
          return (
            <img
              src={tab.appLauncherConfig.icon}
              alt={tab.title}
              className="w-6 h-6 rounded"
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
          handleTabClick();
        }
      }}
      className={cn(
        'group relative overflow-hidden',
        'bg-background/50 border border-border',
        !isEditing && 'cursor-pointer hover:border-border/80 hover:bg-background/80',
        isActive && !isEditing && 'border-l-2 border-primary',
        isDragging && 'opacity-50'
      )}
      initial={false}
      animate={{
        height: isEditing ? expandedHeight : collapsedHeight,
        borderRadius: isEditing ? 10 : 8,
      }}
      transition={{
        type: 'spring',
        stiffness: 550,
        damping: 45,
        mass: 0.7,
        delay: isEditing ? 0 : 0.08,
      }}
    >
      {/* Collapsed view */}
      {!isEditing && (
        <div className="flex items-center gap-2 px-3 h-full">
          {/* Status Indicator */}
          {tab.status === 'running' && (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
          {tab.status === 'idle' && (
            <div className="w-2 h-2 rounded-full bg-gray-400" />
          )}

          {/* Title */}
          <span className="text-sm truncate flex-1">{tab.title}</span>

          {/* Close Button - only show on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              workspaceActions.closeTab(tab.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Expanded view - edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.form
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 550,
              damping: 45,
              mass: 0.7,
            }}
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
