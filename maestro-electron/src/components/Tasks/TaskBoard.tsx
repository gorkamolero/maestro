import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { DndContext, DragOverlay, closestCorners, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { TaskStatus, tasksStore, tasksComputed, tasksActions } from '@/stores/tasks.store';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  spaceId: string;
}

const COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'next', title: 'Next' },
  { id: 'active', title: 'Active' },
  { id: 'done', title: 'Done ✓' },
];

export function TaskBoard({ spaceId }: TaskBoardProps) {
  const snap = useSnapshot(tasksStore);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Get tasks for this space, grouped by status
  const tasks = snap.tasks.filter((t) => t.spaceId === spaceId);
  const tasksByColumn: Record<TaskStatus, typeof tasks> = {
    inbox: tasks.filter((t) => t.status === 'inbox'),
    next: tasks.filter((t) => t.status === 'next'),
    active: tasks.filter((t) => t.status === 'active'),
    done: tasks.filter((t) => t.status === 'done'),
    archived: [],
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;

    // Determine target column from drop zone
    let newStatus: TaskStatus;

    if (over.id === 'inbox' || over.id === 'next' || over.id === 'active' || over.id === 'done') {
      newStatus = over.id as TaskStatus;
    } else {
      // Dropped on another task - find its column
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      newStatus = overTask.status;
    }

    // Move the task
    tasksActions.moveTask(taskId, newStatus);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="task-board grid grid-cols-4 gap-4 p-4 h-full">
        {COLUMNS.map((column) => (
          <TaskColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByColumn[column.id]}
            spaceId={spaceId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
