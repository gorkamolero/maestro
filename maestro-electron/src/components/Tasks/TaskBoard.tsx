import { useState } from 'react';
import { useSnapshot } from 'valtio';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { TaskStatus, tasksStore, tasksActions } from '@/stores/tasks.store';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  boardTabId: string;
}

const COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'next', title: 'Next' },
  { id: 'active', title: 'Active' },
  { id: 'done', title: 'Done ✓' },
];

export function TaskBoard({ boardTabId }: TaskBoardProps) {
  const snap = useSnapshot(tasksStore);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Get tasks for this board, grouped by status
  const tasks = snap.tasks.filter((t) => t.boardTabId === boardTabId);
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
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column from drop zone
    let newStatus: TaskStatus;

    // Check if we dropped on a column directly
    if (over.id === 'inbox' || over.id === 'next' || over.id === 'active' || over.id === 'done') {
      newStatus = over.id as TaskStatus;
    } else {
      // Dropped on another task - find its column
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      newStatus = overTask.status;
    }

    // Only move if status changed
    if (task.status !== newStatus) {
      tasksActions.moveTask(taskId, newStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="task-board grid grid-cols-4 gap-4 p-4 h-full">
        {COLUMNS.map((column) => (
          <TaskColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByColumn[column.id]}
            boardTabId={boardTabId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
