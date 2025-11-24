import { useSnapshot } from 'valtio';
import { workspaceStore } from '@/stores/workspace.store';
import { spacesStore } from '@/stores/spaces.store';
import { tasksStore } from '@/stores/tasks.store';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const { activeSpaceId, tabs, activeTabId } = useSnapshot(workspaceStore);
  const { spaces } = useSnapshot(spacesStore);
  const { tasks } = useSnapshot(tasksStore);

  // Mock performance metrics
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    // Simulate performance monitoring
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 30) + 10); // 10-40%
      setMemoryUsage(Math.floor(Math.random() * 20) + 60); // 60-80%
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Get tasks stats for active space
  const spaceTasks = activeSpaceId ? tasks.filter(t => t.spaceId === activeSpaceId) : [];
  const completedToday = spaceTasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false;
    const today = new Date().toDateString();
    return new Date(t.completedAt).toDateString() === today;
  }).length;

  return (
    <div className="h-6 bg-background border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground">
      {/* Left side - Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground font-medium">📦 Maestro</span>
        </div>

        {activeSpace && (
          <>
            <div className="w-px h-3 bg-border" />
            <span>{activeSpace.name}</span>
          </>
        )}

        {activeTab && (
          <>
            <div className="w-px h-3 bg-border" />
            <span className="capitalize">{activeTab.type} View</span>
          </>
        )}

        {spaceTasks.length > 0 && (
          <>
            <div className="w-px h-3 bg-border" />
            <span>{spaceTasks.length} tasks</span>
            {completedToday > 0 && (
              <span className="text-green-600">· {completedToday} completed today</span>
            )}
          </>
        )}
      </div>

      {/* Right side - Performance */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          <span>CPU: {cpuUsage}%</span>
        </div>

        <div className="w-px h-3 bg-border" />

        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          <span>RAM: {memoryUsage}%</span>
        </div>

        <div className="w-px h-3 bg-border" />

        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-green-500" />
          <span>Active</span>
        </div>

        <div className="w-px h-3 bg-border" />

        <div className="flex items-center gap-1">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
}
