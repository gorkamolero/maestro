import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Star, X, Edit2 } from 'lucide-react';
import { Tab, workspaceActions } from '@/stores/workspace.store';
import { TabDropZone } from '@/types';
import { cn } from '@/lib/utils';

interface DraggableTabProps {
  tab: Tab;
  zone: TabDropZone;
  index: number;
  spaceId: string;
}

export function DraggableTab({ tab, zone, index }: DraggableTabProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedTitle, setEditedTitle] = useState(tab.title);

  const draggableId = `${zone}-${tab.id}`;

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
      default:
        return <span className="text-xl">📄</span>;
    }
  };

  const isFavoriteZone = zone === 'favorites';

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          data-draggable="true"
          onClick={() => {
            if (!isRenaming) {
              workspaceActions.setActiveTab(tab.id);
            }
          }}
          className={cn(
            'group relative transition-colors',
            isFavoriteZone
              ? 'w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center'
              : 'flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 hover:bg-white/10',
            snapshot.isDragging ? 'opacity-30' : 'cursor-grab'
          )}
          style={{
            ...provided.draggableProps.style,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {isFavoriteZone ? (
            // Favorites: Icon only
            <>{getTabIcon()}</>
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

                  {/* Star Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      workspaceActions.toggleTabFavorite(tab.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Star
                      className={cn(
                        'w-4 h-4',
                        tab.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                      )}
                    />
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
      )}
    </Draggable>
  );
}
