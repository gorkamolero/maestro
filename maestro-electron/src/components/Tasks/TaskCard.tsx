import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, MoreVertical, Play, Edit2 } from 'lucide-react';
import { useSnapshot } from 'valtio';
import { Task, tasksActions } from '@/stores/tasks.store';
import { workspaceActions } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time-utils';
import { MorphSurface } from '@/components/ui/morph-surface';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isActive = task.status === 'active';
  const isDone = task.status === 'done';

  const handleClick = () => {
    if (task.status === 'inbox' || task.status === 'next') {
      // Start the task
      tasksActions.startTask(task.id);

      // Open linked tabs
      task.linkedTabIds.forEach((tabId) => {
        workspaceActions.setActiveTab(tabId);
      });

      // Launch linked apps
      task.linkedAppIds.forEach((appId) => {
        const connectedApp = launcherActions.getConnectedApp(appId);
        if (connectedApp) {
          launcherActions.launchApp(appId, {
            filePath: null,
            deepLink: null,
            launchMethod: 'app-only',
          });
        }
      });
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleUpdate = async (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (title?.trim()) {
      tasksActions.updateTask(task.id, {
        title: title.trim(),
        description: description?.trim() || undefined,
      });
    }
  };

  return (
    <motion.div
      layout
      layoutId={task.id}
      className={cn(
        'task-card group p-3 mb-2 rounded-lg border cursor-pointer',
        'bg-background/50 border-border',
        'hover:border-border/80 hover:bg-background/80',
        'transition-all duration-200',
        isActive && 'border-primary shadow-lg shadow-primary/20',
        isDone && 'opacity-60'
      )}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Priority dots and edit button */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-1">
          {[...Array(task.priority)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary opacity-60"
            />
          ))}
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleEdit}
        >
          <Edit2 size={14} className="text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {/* Title */}
      <h4
        className={cn(
          'text-sm font-medium text-foreground',
          isDone && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </h4>

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

      {/* Edit Surface */}
      {isEditing && (
        <div className="absolute inset-0 z-50">
          <MorphSurface
            isOpen={isEditing}
            onOpenChange={setIsEditing}
            expandedWidth={400}
            expandedHeight={300}
            onSubmit={handleUpdate}
            onSuccess={() => setIsEditing(false)}
            renderContent={({ onSubmit }) => (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  onSubmit(formData);
                }}
                className="flex flex-col h-full p-4 gap-3"
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    defaultValue={task.title}
                    autoFocus
                    className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Task title..."
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={task.description || ''}
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Add more details..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
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
              </form>
            )}
          />
        </div>
      )}
    </motion.div>
  );
}
