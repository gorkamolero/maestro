import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Tab, workspaceActions, useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { getTabIcon } from '@/lib/tab-utils';
import { useTabClick } from '@/hooks/useTabClick';
import { useMorphingEdit } from '@/hooks/useMorphingEdit';
import { TabContextMenu } from './TabContextMenu';

interface ListTabProps {
  tab: Tab;
  spaceId: string;
}

export function ListTab({ tab }: ListTabProps) {
  const { activeTabId } = useWorkspaceStore();
  const handleTabClick = useTabClick(tab);
  const { isEditing, setIsEditing, containerRef, morphingProps, formProps } = useMorphingEdit({
    collapsedHeight: 50,
    expandedHeight: 150,
  });

  const isActive = activeTabId === tab.id;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;

    if (title?.trim()) {
      workspaceActions.renameTab(tab.id, title.trim());
      setIsEditing(false);
    }
  };

  return (
    <TabContextMenu tab={tab}>
      <motion.div
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
        !isEditing && 'cursor-grab active:cursor-grabbing hover:border-border/80 hover:bg-background/80',
        isActive && !isEditing && 'border-l-2 border-primary',
      )}
      {...morphingProps}
    >
      {/* Collapsed view */}
      {!isEditing && (
        <div className="flex items-center gap-2 px-3 h-full">
          {/* Icon */}
          <div className="flex-shrink-0">
            {getTabIcon(tab, 'sm')}
          </div>

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
    </TabContextMenu>
  );
}
