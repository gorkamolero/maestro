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
    <div className="h-7 bg-sidebar flex items-center justify-between px-4 text-[11px] text-muted-foreground tracking-tight select-none">
      {/* Left side - Context */}
      <div className="flex items-center gap-4">
        <span className="text-foreground font-medium">Maestro</span>

        <span className="opacity-60">Control Room</span>

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

      {/* Right side - Performance */}
      <div className="flex items-center gap-4 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 opacity-60">
          <Cpu className="w-3 h-3" />
          <span>{cpuUsage}%</span>
        </div>

        <div className="flex items-center gap-1.5 opacity-60">
          <HardDrive className="w-3 h-3" />
          <span>{memoryUsage}%</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-primary">Active</span>
        </div>

        <div className="flex items-center gap-1.5 opacity-60">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
}
