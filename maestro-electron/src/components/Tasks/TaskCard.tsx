import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Play, Trash2 } from 'lucide-react';
import { Task, tasksActions } from '@/stores/tasks.store';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time-utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = task.status === 'active';
  const isDone = task.status === 'done';

  const collapsedHeight = task.description ? 90 : 70;
  const expandedHeight = 300;

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
    const description = formData.get('description') as string;

    if (title?.trim()) {
      tasksActions.updateTask(task.id, {
        title: title.trim(),
        description: description?.trim() || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    tasksActions.deleteTask(task.id);
  };

  return (
    <div className="task-card mb-2">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            ref={containerRef}
            onClick={() => {
              if (!isEditing) {
                setIsEditing(true);
              }
            }}
            className={cn(
              'relative overflow-hidden',
              'bg-background/50 border border-border',
              !isEditing && 'cursor-pointer hover:border-border/80 hover:bg-background/80',
              isActive && !isEditing && 'border-primary shadow-lg shadow-primary/20',
              isDone && !isEditing && 'opacity-60'
            )}
            initial={false}
            animate={{
              height: isEditing ? expandedHeight : collapsedHeight,
              borderRadius: isEditing ? 14 : 10,
            }}
            transition={{
              type: 'spring',
              stiffness: 550,
              damping: 45,
              mass: 0.7,
              delay: isEditing ? 0 : 0.08,
            }}
          >
        {/* Collapsed view - task card */}
        {!isEditing && (
          <div className="p-3">
            {/* Title with priority dots */}
            <div className="flex items-start gap-2">
              {/* Priority dots */}
              <div className="flex flex-col gap-1 pt-1">
                {[...Array(task.priority)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary opacity-60"
                  />
                ))}
              </div>

              {/* Title */}
              <h4
                className={cn(
                  'text-sm font-medium text-foreground flex-1',
                  isDone && 'line-through text-muted-foreground'
                )}
              >
                {task.title}
              </h4>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Time tracking */}
            {(isActive || isDone) && task.timeSpent > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                {isActive && (
                  <Play size={10} className="text-primary animate-pulse" />
                )}
                <Clock size={10} />
                <span>{formatDuration(task.timeSpent)}</span>
              </div>
            )}

            {/* Linked indicators */}
            {(task.linkedTabIds.length > 0 || task.linkedAppIds.length > 0) && (
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                {task.linkedTabIds.length > 0 && (
                  <span>{task.linkedTabIds.length} tabs</span>
                )}
                {task.linkedAppIds.length > 0 && (
                  <span>{task.linkedAppIds.length} apps</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expanded view - edit form */}
        <AnimatePresence>
          {isEditing && (
            <motion.form
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
              className="absolute inset-0 flex flex-col p-4 gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor={`title-${task.id}`} className="text-sm font-medium">
                  Title
                </label>
                <input
                  id={`title-${task.id}`}
                  name="title"
                  type="text"
                  defaultValue={task.title}
                  autoFocus
                  className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Task title..."
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label htmlFor={`description-${task.id}`} className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id={`description-${task.id}`}
                  name="description"
                  defaultValue={task.description || ''}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Add more details..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 />
            Delete Task
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
