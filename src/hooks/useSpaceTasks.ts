import { useMemo } from 'react';
import { useWorkspaceTasksStore } from '@/stores/workspace-tasks.store';

/**
 * Hook to get tasks for a specific space.
 * Extracts common pattern used in SpaceCard and SpacePanesView.
 */
export function useSpaceTasks(spaceId: string) {
  const { tasks: allTasks } = useWorkspaceTasksStore();

  // Compute all derived values in a single pass to avoid multiple iterations
  return useMemo(() => {
    const tasks = [];
    let completedCount = 0;

    for (const task of allTasks) {
      if (task.spaceId === spaceId) {
        tasks.push(task);
        if (task.completed) {
          completedCount++;
        }
      }
    }

    return {
      tasks,
      count: tasks.length,
      hasIncompleteTasks: completedCount < tasks.length,
      completedCount,
    };
  }, [allTasks, spaceId]);
}
