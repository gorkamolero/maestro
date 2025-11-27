import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';

// Types
export interface WorkspaceTask {
  id: string;
  spaceId: string;
  content: string;
  completed: boolean;
  createdAt: Date;
  position: number; // Lower = higher in list (newer tasks get lower position)
}

interface WorkspaceTasksState {
  tasks: WorkspaceTask[];
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: workspaceTasksHistory } = await persistWithHistory<WorkspaceTasksState>(
  {
    tasks: [],
  },
  'maestro-workspace-tasks',
  {
    debounceTime: 500,
  }
);

export { workspaceTasksHistory };

// Getter that always returns current value
export const getWorkspaceTasksStore = () => workspaceTasksHistory.value;

/**
 * Hook to get reactive workspace tasks state.
 */
export function useWorkspaceTasksStore() {
  const { value } = useSnapshot(workspaceTasksHistory);
  return value;
}

// Computed values
export const workspaceTasksComputed = {
  /**
   * Get tasks for a specific workspace, sorted by createdAt (newest first)
   */
  getTasksForSpace(spaceId: string): WorkspaceTask[] {
    return getWorkspaceTasksStore()
      .tasks.filter((t) => t.spaceId === spaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Get count of incomplete tasks for a space
   */
  getIncompleteCount(spaceId: string): number {
    return getWorkspaceTasksStore().tasks.filter((t) => t.spaceId === spaceId && !t.completed)
      .length;
  },
};

// Actions
export const workspaceTasksActions = {
  addTask(spaceId: string, content: string): WorkspaceTask {
    const store = getWorkspaceTasksStore();

    // Find the minimum position for this space (to insert at top)
    const spaceTasks = store.tasks.filter((t) => t.spaceId === spaceId);
    const minPosition = spaceTasks.length > 0 ? Math.min(...spaceTasks.map((t) => t.position)) : 0;

    const task: WorkspaceTask = {
      id: crypto.randomUUID(),
      spaceId,
      content,
      completed: false,
      createdAt: new Date(),
      position: minPosition - 1, // Insert at top
    };

    store.tasks.push(task);
    return task;
  },

  toggleTask(id: string) {
    const store = getWorkspaceTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
    }
  },

  updateTaskContent(id: string, content: string) {
    const store = getWorkspaceTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (task) {
      task.content = content;
    }
  },

  deleteTask(id: string) {
    const store = getWorkspaceTasksStore();
    const index = store.tasks.findIndex((t) => t.id === id);
    if (index >= 0) {
      store.tasks.splice(index, 1);
    }
  },

  deleteCompletedTasks(spaceId: string) {
    const store = getWorkspaceTasksStore();
    store.tasks = store.tasks.filter((t) => t.spaceId !== spaceId || !t.completed);
  },

  deleteAllTasksForSpace(spaceId: string) {
    const store = getWorkspaceTasksStore();
    store.tasks = store.tasks.filter((t) => t.spaceId !== spaceId);
  },

  reorderTasks(spaceId: string, orderedIds: string[]) {
    const store = getWorkspaceTasksStore();
    // Assign new positions based on the order
    orderedIds.forEach((id, index) => {
      const task = store.tasks.find((t) => t.id === id);
      if (task) {
        task.position = index;
      }
    });
  },
};
