import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';

// Types
export type TaskStatus = 'inbox' | 'next' | 'active' | 'done' | 'archived';
export type TaskPriority = 0 | 1 | 2 | 3; // 0=none, 1=low, 2=normal, 3=high

export interface TaskSession {
  startedAt: Date;
  endedAt: Date | null;
  duration: number;
}

export interface Task {
  id: string;
  boardTabId: string; // The tasks tab this task belongs to
  title: string;
  description?: string;

  // Status flow
  status: TaskStatus;
  priority: TaskPriority;

  // Time tracking
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeSpent: number; // milliseconds
  sessions: TaskSession[];

  // Workspace integration
  linkedTabIds: string[];
  linkedAppIds: string[];
  linkedNoteIds: string[]; // Linked notes from notes system

  // Organization
  labels: string[];
  dueDate?: Date;
  parentId?: string;
}

export interface TaskFilter {
  boardTabId: string | null;
  status: TaskStatus | null;
  search: string;
}

export interface TaskStats {
  active: number;
  completedToday: number;
  timeToday: number;
}

interface TasksState {
  tasks: Task[];
  view: 'board' | 'list' | 'timeline';
  filter: TaskFilter;
  sortBy: 'priority' | 'dueDate' | 'created' | 'manual';
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: tasksHistory } = await persistWithHistory<TasksState>(
  {
    tasks: [],
    view: 'board',
    filter: { boardTabId: null, status: null, search: '' },
    sortBy: 'manual',
  },
  'maestro-tasks',
  {
    debounceTime: 1000,
    omit: ['filter'], // Don't persist UI filters
  }
);

export { tasksHistory };

// Getter that always returns current value (important after undo/redo which replaces .value)
export const getTasksStore = () => tasksHistory.value;

/**
 * Hook to get reactive tasks state. Use this instead of useSnapshot(tasksStore).
 */
export function useTasksStore() {
  const { value } = useSnapshot(tasksHistory);
  return value;
}

// Computed values
export const tasksComputed = {
  get tasksByBoard(): Record<string, Task[]> {
    return getTasksStore().tasks.reduce(
      (acc, task) => {
        if (!acc[task.boardTabId]) acc[task.boardTabId] = [];
        acc[task.boardTabId].push(task);
        return acc;
      },
      {} as Record<string, Task[]>
    );
  },

  get activeTasks(): Task[] {
    return getTasksStore().tasks.filter((t) => t.status === 'active');
  },

  get stats(): TaskStats {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayTasks = getTasksStore().tasks.filter(
      (t) => t.completedAt && new Date(t.completedAt).getTime() >= today
    );

    return {
      active: tasksComputed.activeTasks.length,
      completedToday: todayTasks.length,
      timeToday: todayTasks.reduce((sum, t) => sum + t.timeSpent, 0),
    };
  },

  getTasksByBoard(boardTabId: string): Task[] {
    return getTasksStore().tasks.filter((t) => t.boardTabId === boardTabId);
  },

  getTasksByStatus(boardTabId: string, status: TaskStatus): Task[] {
    return getTasksStore().tasks.filter((t) => t.boardTabId === boardTabId && t.status === status);
  },
};

// Actions
export const tasksActions = {
  addTask(boardTabId: string, title: string, status: TaskStatus = 'inbox'): Task {
    const store = getTasksStore();
    const task: Task = {
      id: crypto.randomUUID(),
      boardTabId,
      title,
      status,
      priority: 1,
      createdAt: new Date(),
      timeSpent: 0,
      sessions: [],
      linkedTabIds: [],
      linkedAppIds: [],
      linkedNoteIds: [],
      labels: [],
    };

    store.tasks.push(task);
    return task;
  },

  moveTask(id: string, status: TaskStatus) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (!task) return;

    const prevStatus = task.status;
    task.status = status;

    // Handle status transitions
    if (status === 'active' && prevStatus !== 'active') {
      tasksActions.startTask(id);
    } else if (status === 'done' && prevStatus === 'active') {
      tasksActions.pauseTask(id);
    }

    if (status === 'done' && !task.completedAt) {
      task.completedAt = new Date();
    }
  },

  startTask(id: string) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (!task) return;

    // Pause any other active tasks in the same space
    store.tasks.forEach((t) => {
      if (t.spaceId === task.spaceId && t.status === 'active' && t.id !== id) {
        tasksActions.pauseTask(t.id);
      }
    });

    task.status = 'active';
    task.startedAt = new Date();

    // Start a new session
    task.sessions.push({
      startedAt: new Date(),
      endedAt: null,
      duration: 0,
    });
  },

  pauseTask(id: string) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (!task || task.status !== 'active') return;

    const currentSession = task.sessions[task.sessions.length - 1];
    if (currentSession && !currentSession.endedAt) {
      currentSession.endedAt = new Date();
      currentSession.duration =
        currentSession.endedAt.getTime() - currentSession.startedAt.getTime();
      task.timeSpent += currentSession.duration;
    }

    task.status = 'next';
  },

  completeTask(id: string) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (!task) return;

    // End current session if active
    if (task.status === 'active') {
      tasksActions.pauseTask(id);
    }

    task.status = 'done';
    task.completedAt = new Date();
  },

  deleteTask(id: string) {
    const store = getTasksStore();
    const index = store.tasks.findIndex((t) => t.id === id);
    if (index >= 0) store.tasks.splice(index, 1);
  },

  updateTask(id: string, updates: Partial<Task>) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === id);
    if (!task) return;

    Object.assign(task, updates);
  },

  archiveCompleted(boardTabId: string) {
    const store = getTasksStore();
    store.tasks.forEach((task) => {
      if (task.boardTabId === boardTabId && task.status === 'done') {
        task.status = 'archived';
      }
    });
  },

  linkTabs(taskId: string, tabIds: string[]) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.linkedTabIds = tabIds;
  },

  linkApps(taskId: string, appIds: string[]) {
    const store = getTasksStore();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.linkedAppIds = appIds;
  },
};

// Time tracking for active tasks (update every second)
setInterval(() => {
  tasksComputed.activeTasks.forEach((task) => {
    const session = task.sessions[task.sessions.length - 1];
    if (session && !session.endedAt) {
      // Calculate elapsed time
      const elapsed = Date.now() - new Date(session.startedAt).getTime();
      const previousTime = task.sessions.slice(0, -1).reduce((sum, s) => sum + s.duration, 0);
      task.timeSpent = previousTime + elapsed;
    }
  });
}, 1000);
