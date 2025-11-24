import { useSnapshot } from 'valtio';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { workspaceActions, workspaceStore, type Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import type { TabDropZone } from '@/types';

interface ReorderItem {
  id: string;
  itemType: 'tab' | 'app';
}

interface SortableGridTabProps {
  item: ReorderItem;
  tab: Tab;
  zone: TabDropZone;
  index: number;
  spaceId: string;
}

export function SortableGridTab({ item, tab }: SortableGridTabProps) {
  const { activeTabId } = useSnapshot(workspaceStore);
  const isActive = activeTabId === tab.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
      onClick={() => workspaceActions.setActiveTab(tab.id)}
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
