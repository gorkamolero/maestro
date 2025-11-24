import { motion } from 'motion/react';
import { Clock, MoreVertical, Play } from 'lucide-react';
import { useSnapshot } from 'valtio';
import { Task, tasksActions } from '@/stores/tasks.store';
import { workspaceActions } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time-utils';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
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

  return (
    <motion.div
      layout
      layoutId={task.id}
      className={cn(
        'task-card p-3 mb-2 rounded-lg border cursor-pointer',
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
      {/* Priority dots and menu */}
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
          className="opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open context menu
          }}
        >
          <MoreVertical size={14} className="text-muted-foreground" />
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
    </motion.div>
  );
}
