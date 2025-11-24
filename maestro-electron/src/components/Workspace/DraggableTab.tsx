import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Edit2 } from 'lucide-react';
import { Tab, workspaceActions, workspaceStore } from '@/stores/workspace.store';
import { TabDropZone } from '@/types';
import { cn } from '@/lib/utils';
import { useSnapshot } from 'valtio';
import { useTabClick } from '@/hooks/useTabClick';

interface DraggableTabProps {
  tab: Tab;
  zone: TabDropZone;
  spaceId: string;
}

export function DraggableTab({ tab, zone }: DraggableTabProps) {
  const { activeTabId } = useSnapshot(workspaceStore);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedTitle, setEditedTitle] = useState(tab.title);
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

  const handleRename = () => {
    if (editedTitle.trim() && editedTitle !== tab.title) {
      workspaceActions.renameTab(tab.id, editedTitle);
    }
    setIsRenaming(false);
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

  const isFavoriteZone = zone === 'favorites';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-draggable="true"
      onClick={() => {
        if (!isRenaming) {
          handleTabClick();
        }
      }}
      className={cn(
        'group relative transition-colors',
        isFavoriteZone
          ? 'w-12 h-12 rounded-xl flex items-center justify-center'
          : 'flex items-center gap-2 rounded-lg px-3 py-2',
        // Background colors
        isActive
          ? 'bg-white/15 hover:bg-white/20'
          : 'bg-white/5 hover:bg-white/10',
        // Active state border
        isActive && !isFavoriteZone && 'border-l-2 border-primary',
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      {isFavoriteZone ? (
        // Favorites: Icon only with active indicator
        <>
          {getTabIcon()}
          {isActive && (
            <div className="absolute bottom-1 w-6 h-0.5 bg-primary rounded-full" />
          )}
        </>
      ) : (
        // Tabs: Full layout with status, title, actions
        <>
            {/* Status Indicator */}
            {tab.status === 'running' && (
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
            {tab.status === 'idle' && (
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            )}

            {/* Title or Input */}
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') {
                      setEditedTitle(tab.title);
                      setIsRenaming(false);
                    }
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  autoFocus
                  className="w-full bg-white/10 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <span className="text-sm truncate block">{tab.title}</span>
              )}
            </div>

            {/* Actions - only show on hover */}
            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onPointerDown={(e) => {
                // Prevent drag from starting when clicking buttons
                e.stopPropagation();
              }}
            >
              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  workspaceActions.closeTab(tab.id);
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
    </div>
  );
}
