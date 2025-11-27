import { useSpacesStore } from '@/stores/spaces.store';
import { useTasksStore } from '@/stores/tasks.store';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const { spaces } = useSpacesStore();
  const { tasks } = useTasksStore();

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

  // Total tasks across all spaces
  const totalTasks = tasks.length;
  const completedToday = tasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false;
    const today = new Date().toDateString();
    return new Date(t.completedAt).toDateString() === today;
  }).length;

  return (
    <div className="h-6 glass-bg border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground">
      {/* Left side - Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground font-medium">📦 Maestro v1.0.1</span>
        </div>

        <div className="w-px h-3 bg-border" />
        <span>Control Room</span>

        <div className="w-px h-3 bg-border" />
        <span>{spaces.length} spaces</span>

        {totalTasks > 0 && (
          <>
            <div className="w-px h-3 bg-border" />
            <span>{totalTasks} tasks</span>
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
