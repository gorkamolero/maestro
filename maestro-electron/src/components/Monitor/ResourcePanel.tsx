import { useSnapshot } from 'valtio';
import { useEffect } from 'react';
import { metricsStore, metricsActions } from '@/stores/metrics.store';
import { HardDrive, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResourcePanel() {
  const { systemMetrics, isMonitoring } = useSnapshot(metricsStore);

  useEffect(() => {
    if (!isMonitoring) {
      metricsActions.startMonitoring();
    }
  }, [isMonitoring]);

  if (!systemMetrics) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const ramPercentage = (systemMetrics.used_ram / systemMetrics.total_ram) * 100;
  const cpuPercentage = systemMetrics.total_cpu;

  const getRamColor = (percentage: number) => {
    if (percentage > 90) return 'text-red-500';
    if (percentage > 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCpuColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-500';
    if (percentage > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatBytes = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb.toFixed(0)}MB`;
  };

  return (
    <div className="flex items-center justify-center gap-3 text-xs h-full">
      {/* RAM Indicator */}
      <div className="flex items-center gap-1.5">
        <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={cn('font-medium tabular-nums', getRamColor(ramPercentage))}>
          {formatBytes(systemMetrics.used_ram)}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(systemMetrics.total_ram)}
        </span>
      </div>

      {/* CPU Indicator */}
      <div className="flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={cn('font-medium tabular-nums', getCpuColor(cpuPercentage))}>
          {cpuPercentage.toFixed(0)}%
        </span>
      </div>

      {/* Process count (optional) */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="tabular-nums">{systemMetrics.process_count}</span>
        <span className="text-[10px]">proc</span>
      </div>
    </div>
  );
}
