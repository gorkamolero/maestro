import { useState } from 'react';
import { TaskStatus, tasksActions } from '@/stores/tasks.store';

interface TaskQuickAddProps {
  column: TaskStatus;
  spaceId: string;
}

export function TaskQuickAdd({ column, spaceId }: TaskQuickAddProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const task = tasksActions.addTask(spaceId, title, 'inbox');
    if (column !== 'inbox') {
      tasksActions.moveTask(task.id, column);
    }

    setTitle('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
      >
        + Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title && setIsAdding(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setTitle('');
            setIsAdding(false);
          }
        }}
        placeholder="Task title..."
        className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </form>
  );
}
