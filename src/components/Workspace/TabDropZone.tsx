import { AnimatePresence, motion } from 'motion/react';
import { Droppable } from '@hello-pangea/dnd';
import { Star } from 'lucide-react';
import type { ReactElement } from 'react';
import { Tab } from '@/stores/workspace.store';
import { TabDropZone as ZoneType } from '@/types';
import { DraggableTab } from './DraggableTab';
import { useDragContext } from './DragContext';
import { cn } from '@/lib/utils';

interface DragCloneContentProps {
  provided: any;
  tab: Tab;
  getTabIcon: (tab: Tab) => ReactElement;
  sourceZone: ZoneType;
}

function DragCloneContent({ provided, tab, getTabIcon, sourceZone }: DragCloneContentProps) {
  // Get targetZone from context so component re-renders when it changes
  const { targetZone } = useDragContext();

  // If no target zone, use source zone; otherwise use target zone
  const effectiveZone = targetZone || sourceZone;
  const renderAsFavorite = effectiveZone === 'favorites';

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        'cursor-grabbing flex items-center justify-center',
        renderAsFavorite ? 'w-12 h-12' : 'min-w-[200px]'
      )}
      style={{
        ...provided.draggableProps.style,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        className={cn(
          'transition-all duration-200',
          renderAsFavorite
            ? 'w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center'
            : 'flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 w-full'
        )}
      >
        {renderAsFavorite ? (
          <div className="flex items-center justify-center w-full h-full">
            {getTabIcon(tab)}
          </div>
        ) : (
          <>
            {/* Status Indicator */}
            {tab.status === 'running' && (
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
            {tab.status === 'idle' && (
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            )}
            <span className="text-sm truncate flex-1">{tab.title}</span>
            {tab.isFavorite && (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface TabDropZoneProps {
  zone: ZoneType;
  tabs: Tab[];
  spaceId: string;
  title: string;
  emptyMessage?: string;
}

export function TabDropZone({
  zone,
  tabs,
  spaceId,
  title,
  emptyMessage = 'No items yet',
}: TabDropZoneProps) {
  const droppableId = `${zone}-${spaceId}`;

  const getTabIcon = (tab: Tab) => {
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

  const renderClone = (provided: any, _snapshot: any, rubric: any) => {
    const tab = tabs[rubric.source.index];
    const sourceZone = rubric.source.droppableId.split('-')[0] as ZoneType;

    return (
      <DragCloneContent
        provided={provided}
        tab={tab}
        getTabIcon={getTabIcon}
        sourceZone={sourceZone}
      />
    );
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
      </div>

      {/* Droppable Zone */}
      <Droppable droppableId={droppableId} renderClone={renderClone}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="relative flex-1 min-h-[100px]"
          >
            {/* Drop zone highlight */}
            {snapshot.isDraggingOver && (
              <motion.div
                layoutId={`dropzone-${zone}`}
                className="absolute inset-0 border-2 border-blue-400/50 rounded-lg pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}

            {/* Tabs List */}
            <div className={zone === 'favorites' ? 'grid grid-cols-3 gap-2' : 'space-y-1'}>
              <AnimatePresence mode="popLayout">
                {tabs.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="px-2 py-4 text-center text-sm text-white/40 col-span-3"
                  >
                    {emptyMessage}
                  </motion.div>
                ) : (
                  tabs.map((tab, index) => (
                    <DraggableTab
                      key={tab.id}
                      tab={tab}
                      zone={zone}
                      index={index}
                      spaceId={spaceId}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
