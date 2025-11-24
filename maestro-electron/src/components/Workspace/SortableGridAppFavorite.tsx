import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { AppFavoriteGridItem } from '@/components/Launcher';
import type { Favorite, ConnectedApp } from '@/types/launcher';

interface ReorderItem {
  id: string;
  itemType: 'tab' | 'app';
}

interface SortableGridAppFavoriteProps {
  item: ReorderItem;
  favorite: Favorite;
  connectedApp: ConnectedApp;
}

export function SortableGridAppFavorite({ item, favorite, connectedApp }: SortableGridAppFavoriteProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-draggable="true"
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      <AppFavoriteGridItem
        favorite={favorite}
        connectedApp={connectedApp}
      />
    </div>
  );
}
