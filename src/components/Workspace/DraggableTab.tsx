import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Star, X, Edit2 } from 'lucide-react';
import invariant from 'tiny-invariant';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
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
  const tabRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedTitle, setEditedTitle] = useState(tab.title);

  // Setup draggable
  useEffect(() => {
    const element = tabRef.current;
    invariant(element);

    return draggable({
      element,
      getInitialData: () => ({
        type: 'tab',
        tabId: tab.id,
        sourceZone: zone,
        sourceIndex: index,
        tab: tab,
      } as Record<string, unknown>),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [tab, zone, index]);

  const handleRename = () => {
    if (editedTitle.trim() && editedTitle !== tab.title) {
      workspaceActions.renameTab(tab.id, editedTitle);
    }
    setIsRenaming(false);
  };

  return (
    <motion.div
      ref={tabRef}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab',
        'bg-white/5 hover:bg-white/10 transition-colors',
        isDragging && 'opacity-50'
      )}
      style={{
        // Prevent text selection during drag
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
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
              e.stopPropagation(); // Prevent drag while typing
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
            className="w-full bg-white/10 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
          />
        ) : (
          <span className="text-sm truncate block">{tab.title}</span>
        )}
      </div>

      {/* Actions - only show on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRenaming(true);
          }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag
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
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag
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
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag
          className="p-1 hover:bg-white/10 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
