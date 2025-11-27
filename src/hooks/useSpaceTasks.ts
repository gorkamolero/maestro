import { useMemo } from 'react';
import { useWorkspaceTasksStore } from '@/stores/workspace-tasks.store';

/**
 * Hook to get tasks for a specific space.
 * Extracts common pattern used in SpaceCard and SpacePanesView.
 */
export function useSpaceTasks(spaceId: string) {
  const { tasks: allTasks } = useWorkspaceTasksStore();

  const spaceTasks = useMemo(
    () => allTasks.filter((t) => t.spaceId === spaceId),
    [allTasks, spaceId]
  );

  return {
    tasks: spaceTasks,
    count: spaceTasks.length,
    hasIncompleteTasks: spaceTasks.some((t) => !t.completed),
    completedCount: spaceTasks.filter((t) => t.completed).length,
  };
}
