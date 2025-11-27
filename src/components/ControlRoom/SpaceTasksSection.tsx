import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWorkspaceTasksStore,
  workspaceTasksActions,
  type WorkspaceTask,
} from '@/stores/workspace-tasks.store';

interface SpaceTasksSectionProps {
  spaceId: string;
}

export function SpaceTasksSection({ spaceId }: SpaceTasksSectionProps) {
  const [newTaskContent, setNewTaskContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { tasks: allTasks } = useWorkspaceTasksStore();

  // Get tasks for this space, sorted by position (lower = higher in list)
  const tasks = useMemo(() => {
    return allTasks
      .filter((t) => t.spaceId === spaceId)
      .sort((a, b) => a.position - b.position);
  }, [spaceId, allTasks]);

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = taskIds.indexOf(active.id as string);
        const newIndex = taskIds.indexOf(over.id as string);
        const newOrder = arrayMove(taskIds, oldIndex, newIndex);
        workspaceTasksActions.reorderTasks(spaceId, newOrder);
      }
    },
    [spaceId, taskIds]
  );

  const handleAddTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (newTaskContent.trim()) {
        workspaceTasksActions.addTask(spaceId, newTaskContent.trim());
        setNewTaskContent('');
        inputRef.current?.focus();
      }
    },
    [spaceId, newTaskContent]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        if (newTaskContent.trim()) {
          workspaceTasksActions.addTask(spaceId, newTaskContent.trim());
          setNewTaskContent('');
        }
      }
    },
    [spaceId, newTaskContent]
  );

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
      {/* Add new task input */}
      <form onSubmit={handleAddTask} className="flex-shrink-0 mb-2">
        <input
          ref={inputRef}
          data-space-task-input={spaceId}
          type="text"
          value={newTaskContent}
          onChange={(e) => setNewTaskContent(e.target.value)}
          onClick={handleInputClick}
          onKeyDown={handleInputKeyDown}
          placeholder="Add a task..."
          className={cn(
            'w-full bg-black/5 border-0 rounded-lg px-3 py-2',
            'text-xs text-black/70 placeholder:text-black/30',
            'focus:outline-none focus:ring-1 focus:ring-black/20',
            'transition-colors'
          )}
        />
      </form>

      {/* Tasks list - scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {tasks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1 pb-2">
                <AnimatePresence initial={false}>
                  {tasks.map((task) => (
                    <SortableTaskItem key={task.id} task={task} />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-xs text-black/30 text-center py-4">
            No tasks yet
          </p>
        )}
      </div>
    </div>
  );
}

interface SortableTaskItemProps {
  task: WorkspaceTask;
}

function SortableTaskItem({ task }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

interface TaskItemProps {
  task: WorkspaceTask;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

function TaskItem({ task, dragHandleProps, isDragging }: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditing) {
        workspaceTasksActions.toggleTask(task.id);
      }
    },
    [task.id, isEditing]
  );

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(task.content);
      setIsEditing(true);
    },
    [task.content]
  );

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.content) {
      workspaceTasksActions.updateTaskContent(task.id, trimmed);
    }
    setIsEditing(false);
  }, [editValue, task.id, task.content]);

  const handleCancel = useCallback(() => {
    setEditValue(task.content);
    setIsEditing(false);
  }, [task.content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      workspaceTasksActions.deleteTask(task.id);
    },
    [task.id]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group/task flex items-start gap-2 p-2 rounded-lg',
        'bg-black/[0.03] hover:bg-black/[0.06] transition-colors',
        isDragging && 'bg-black/[0.08] shadow-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className={cn(
          'flex-shrink-0 cursor-grab active:cursor-grabbing mt-0.5',
          'text-black/20 hover:text-black/40 transition-colors',
          'opacity-0 group-hover/task:opacity-100'
        )}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Checkbox */}
      <div
        onClick={handleToggle}
        className={cn(
          'flex-shrink-0 w-4 h-4 mt-0.5 rounded border-2 transition-all cursor-pointer',
          'flex items-center justify-center',
          task.completed
            ? 'bg-black/60 border-black/60'
            : 'border-black/20 hover:border-black/40'
        )}
      >
        {task.completed && (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        )}
      </div>

      {/* Content - editable */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex-1 bg-transparent text-xs outline-none min-w-0',
            'text-black/80'
          )}
        />
      ) : (
        <span
          onClick={handleStartEdit}
          className={cn(
            'flex-1 text-xs leading-relaxed break-words cursor-text',
            task.completed ? 'line-through text-black/30' : 'text-black/70'
          )}
        >
          {task.content}
        </span>
      )}

      {/* Delete button - visible on hover */}
      <AnimatePresence>
        {isHovered && !isEditing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onClick={handleDelete}
            className={cn(
              'flex-shrink-0 p-1 rounded transition-colors',
              'text-black/30 hover:text-red-500 hover:bg-red-500/10'
            )}
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
