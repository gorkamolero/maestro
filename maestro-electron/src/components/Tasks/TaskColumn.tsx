import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus, tasksActions } from '@/stores/tasks.store';
import { TaskCard } from './TaskCard';
import { TaskQuickAdd } from './TaskQuickAdd';
import { SortableTaskCard } from './SortableTaskCard';
import { cn } from '@/lib/utils';

interface TaskColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  spaceId: string;
}

export function TaskColumn({ id, title, tasks, spaceId }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const handleArchive = () => {
    if (id === 'done') {
      tasksActions.archiveCompleted(spaceId);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'task-column flex flex-col h-full rounded-lg border border-border bg-muted/30 p-3',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      {/* Quick add */}
      <div className="mt-2">
        <TaskQuickAdd column={id} spaceId={spaceId} />
      </div>

      {/* Archive button for Done column */}
      {id === 'done' && tasks.length > 0 && (
        <button
          onClick={handleArchive}
          className="mt-2 w-full p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
        >
          Archive all
        </button>
      )}
    </div>
  );
}
