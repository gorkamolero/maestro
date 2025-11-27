import { useMemo } from 'react';
import { useSpacesStore } from '@/stores/spaces.store';
import { useTasksStore } from '@/stores/tasks.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useActiveSpacePerformance, usePerformanceFormatters } from '@/hooks/usePerformance';
import { formatMemory } from '@/stores/performance.store';
import { Activity, Cpu, HardDrive, Wifi, Layers } from 'lucide-react';

export function StatusBar() {
  const { spaces } = useSpacesStore();
  const { tasks } = useTasksStore();
  const { tabs, activeSpaceId } = useWorkspaceStore();
  const { spaceMetrics, systemMetrics, isConnected } = useActiveSpacePerformance();
  const { formatSpaceMemory, formatSpaceCpu } = usePerformanceFormatters();

  // Get active space name
  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId),
    [spaces, activeSpaceId]
  );

  const activeSpaceTabs = useMemo(
    () => tabs.filter((t) => t.spaceId === activeSpaceId),
    [tabs, activeSpaceId]
  );

  // Total tasks across all spaces - memoize to avoid recalculating on each render
  const { totalTasks, completedToday } = useMemo(() => {
    const today = new Date().toDateString();
    let completed = 0;
    for (const t of tasks) {
      if (t.status === 'done' && t.completedAt) {
        if (new Date(t.completedAt).toDateString() === today) {
          completed++;
        }
      }
    }
    return { totalTasks: tasks.length, completedToday: completed };
  }, [tasks]);

  return (
    <div className="h-7 bg-sidebar flex items-center justify-between px-4 text-[11px] text-muted-foreground tracking-tight select-none">
      {/* Left side - Context */}
      <div className="flex items-center gap-4">
        <span className="text-foreground font-medium">Maestro</span>

        {activeSpace ? (
          <span className="text-primary">{activeSpace.name}</span>
        ) : (
          <span className="opacity-60">No space selected</span>
        )}

        <span className="opacity-60">{spaces.length} spaces</span>

        {totalTasks > 0 && (
          <>
            <span className="opacity-60">{totalTasks} tasks</span>
            {completedToday > 0 && (
              <span className="text-primary">{completedToday} done today</span>
            )}
          </>
        )}
      </div>

      {/* Right side - Performance (Active Space) */}
      <div className="flex items-center gap-4 font-mono text-[10px]">
        {/* Active space tab count and memory */}
        {activeSpace && (
          <div
            className="flex items-center gap-1.5 opacity-60"
            title={`${activeSpaceTabs.length} tabs in ${activeSpace.name}`}
          >
            <Layers className="w-3 h-3" />
            <span>{activeSpaceTabs.length}</span>
          </div>
        )}

        {/* Space CPU (average across tabs) */}
        <div
          className="flex items-center gap-1.5 opacity-60"
          title={`CPU usage for ${activeSpace?.name || 'space'}`}
        >
          <Cpu className="w-3 h-3" />
          <span>{formatSpaceCpu(spaceMetrics)}</span>
        </div>

        {/* Space Memory (total for space tabs) */}
        <div
          className="flex items-center gap-1.5 opacity-60"
          title={`Memory usage for ${activeSpace?.name || 'space'}`}
        >
          <HardDrive className="w-3 h-3" />
          <span>{formatSpaceMemory(spaceMetrics)}</span>
        </div>

        {/* System-wide metrics */}
        <div
          className="flex items-center gap-1.5 border-l border-border pl-3 opacity-40"
          title="Total app memory"
        >
          <span>{formatMemory(systemMetrics.memoryMB * 1024)}</span>
        </div>

        {/* Activity status */}
        <div className="flex items-center gap-1.5">
          <Activity
            className={`w-3 h-3 ${spaceMetrics?.activeAppCount ? 'text-primary' : 'opacity-40'}`}
          />
          <span className={spaceMetrics?.activeAppCount ? 'text-primary' : 'opacity-40'}>
            {spaceMetrics?.activeAppCount || 0} active
          </span>
        </div>

        {/* Connection status */}
        <div
          className={`flex items-center gap-1.5 ${isConnected ? 'opacity-60' : 'text-destructive'}`}
        >
          <Wifi className="w-3 h-3" />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}
