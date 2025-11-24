import { useSnapshot } from 'valtio';
import { tasksStore, tasksComputed } from '@/stores/tasks.store';
import { TaskBoard } from './TaskBoard';

interface TasksViewProps {
  boardTabId: string;
}

export function TasksView({ boardTabId }: TasksViewProps) {
  const stats = tasksComputed.stats;

  return (
    <div className="tasks-view flex flex-col h-full">
      {/* Header with stats */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Active: {stats.active}</span>
          <span>Today: {stats.completedToday}</span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <TaskBoard boardTabId={boardTabId} />
      </div>
    </div>
  );
}
