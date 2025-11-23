import { useSnapshot } from 'valtio';
import { useEffect } from 'react';
import { metricsStore, metricsActions } from '@/stores/metrics.store';
import { HardDrive, Cpu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SegmentMetricsProps {
  segmentId: string;
  compact?: boolean;
}

export function SegmentMetrics({ segmentId, compact = false }: SegmentMetricsProps) {
  const { segmentMetrics } = useSnapshot(metricsStore);
  const metrics = segmentMetrics.get(segmentId);

  useEffect(() => {
    // Fetch segment metrics periodically
    const interval = setInterval(() => {
      metricsActions.fetchSegmentMetrics(segmentId);
    }, 2000);

    // Initial fetch
    metricsActions.fetchSegmentMetrics(segmentId);

    return () => clearInterval(interval);
  }, [segmentId]);

  if (!metrics) {
    return null;
  }

  const formatBytes = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb.toFixed(0)}MB`;
  };

  const getRamColor = (mb: number) => {
    if (mb > 2048) return 'text-red-500';
    if (mb > 1024) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getCpuColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-500';
    if (percentage > 50) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const handleKillProcess = async (pid: number) => {
    if (confirm(`Kill process ${pid}?`)) {
      try {
        await metricsActions.killProcess(pid);
        // Refresh metrics after killing
        await metricsActions.fetchSegmentMetrics(segmentId);
      } catch (error) {
        console.error('Failed to kill process:', error);
      }
    }
  };

  if (compact) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-[10px] opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <HardDrive className="w-2.5 h-2.5" />
                <span className={cn('tabular-nums', getRamColor(metrics.ram))}>
                  {formatBytes(metrics.ram)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                <span className={cn('tabular-nums', getCpuColor(metrics.cpu))}>
                  {metrics.cpu.toFixed(0)}%
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="text-xs font-medium">Resource Usage</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">RAM</div>
                  <div className="font-medium">{formatBytes(metrics.ram)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CPU</div>
                  <div className="font-medium">{metrics.cpu.toFixed(1)}%</div>
                </div>
              </div>
              {metrics.processes.length > 0 && (
                <div className="text-xs">
                  <div className="text-muted-foreground mb-1">
                    Processes ({metrics.processes.length})
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {metrics.processes.map((process) => (
                      <div key={process.pid} className="text-[10px] font-mono">
                        {process.name} (PID: {process.pid})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-background/50 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium">Resource Usage</div>
        <div className="text-[10px] text-muted-foreground">
          Updated: {new Date(metrics.last_updated).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HardDrive className="w-3 h-3" />
            <span>RAM</span>
          </div>
          <div className={cn('text-lg font-semibold tabular-nums', getRamColor(metrics.ram))}>
            {formatBytes(metrics.ram)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="w-3 h-3" />
            <span>CPU</span>
          </div>
          <div className={cn('text-lg font-semibold tabular-nums', getCpuColor(metrics.cpu))}>
            {metrics.cpu.toFixed(1)}%
          </div>
        </div>
      </div>

      {metrics.processes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Processes ({metrics.processes.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {metrics.processes.map((process) => (
              <div
                key={process.pid}
                className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{process.name}</div>
                  <div className="text-[10px] text-muted-foreground">PID: {process.pid}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="tabular-nums">{formatBytes(process.ram)}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {process.cpu.toFixed(1)}%
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleKillProcess(process.pid)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
