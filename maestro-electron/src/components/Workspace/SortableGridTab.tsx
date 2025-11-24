import { useSnapshot } from 'valtio';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { workspaceStore, type Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import type { TabDropZone } from '@/types';
import { useTabClick } from '@/hooks/useTabClick';

interface SortableGridTabProps {
  tab: Tab;
  zone: TabDropZone;
  index: number;
  spaceId: string;
}

export function SortableGridTab({ tab }: SortableGridTabProps) {
  const { activeTabId } = useSnapshot(workspaceStore);
  const isActive = activeTabId === tab.id;
  const handleClick = useTabClick(tab);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
    width: '48px',
    height: '48px',
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-draggable="true"
      onClick={handleClick}
      className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing',
        isActive ? 'bg-white/15 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10',
        isDragging && 'opacity-50'
      )}
    >
      {getTabIcon()}
      {isActive && (
        <div className="absolute bottom-1 w-6 h-0.5 bg-primary rounded-full" />
      )}
    </div>
  );
}
