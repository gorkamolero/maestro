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
import { ChevronDown, Plus, Check, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWorkspaceTasksStore,
  workspaceTasksActions,
  type WorkspaceTask,
} from '@/stores/workspace-tasks.store';
import { Expandable, ExpandableContent } from '@/components/ui/expandable';

interface SpaceTasksSectionProps {
  spaceId: string;
}

export function SpaceTasksSection({ spaceId }: SpaceTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const incompleteCount = useMemo(() => {
    return tasks.filter((t) => !t.completed).length;
  }, [tasks]);

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

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

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
      // Cmd+Enter or Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
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

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  return (
    <Expandable
      expanded={isExpanded}
      onToggle={() => setIsExpanded((prev) => !prev)}
      className="w-full"
    >
      {/* Trigger header */}
      <div
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-2 py-2 px-1 -mx-1 rounded cursor-pointer',
          'text-xs text-muted-foreground hover:text-foreground transition-colors',
          'hover:bg-white/[0.04]'
        )}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3" />
        </motion.div>
        <span className="font-medium">Tasks</span>
        {incompleteCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary">
            {incompleteCount}
          </span>
        )}
      </div>

      {/* Expandable content */}
      <ExpandableContent preset="fade">
        <div
          className="pt-2 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Add new task input */}
          <form onSubmit={handleAddTask} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onClick={handleInputClick}
              onKeyDown={handleInputKeyDown}
              placeholder="Add a task... (⌘↵)"
              className={cn(
                'flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5',
                'text-xs placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50',
                'transition-colors'
              )}
            />
            <button
              type="submit"
              disabled={!newTaskContent.trim()}
              className={cn(
                'p-1.5 rounded transition-colors',
                'hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Tasks list - scrollable with drag and drop */}
          {tasks.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={taskIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
                  <AnimatePresence initial={false}>
                    {tasks.map((task) => (
                      <SortableTaskItem key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          )}

          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground/50 text-center py-2">
              No tasks yet
            </p>
          )}
        </div>
      </ExpandableContent>
    </Expandable>
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
        'group flex items-start gap-2 p-2 rounded',
        'bg-white/[0.02] hover:bg-white/[0.04] transition-colors',
        isDragging && 'bg-white/[0.06] shadow-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className={cn(
          'flex-shrink-0 cursor-grab active:cursor-grabbing',
          'text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors',
          'opacity-0 group-hover:opacity-100'
        )}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Checkbox */}
      <div
        onClick={handleToggle}
        className={cn(
          'flex-shrink-0 w-4 h-4 mt-0.5 rounded border transition-colors cursor-pointer',
          task.completed
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/30 hover:border-muted-foreground/50'
        )}
      >
        {task.completed && (
          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
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
            'text-foreground'
          )}
        />
      ) : (
        <span
          onClick={handleStartEdit}
          className={cn(
            'flex-1 text-xs leading-relaxed break-words cursor-text',
            task.completed && 'line-through text-muted-foreground/50'
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
              'text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10'
            )}
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
