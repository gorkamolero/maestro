import { Panel } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LocateFixed } from 'lucide-react';
import type { ZoomLevel } from '@/types';

const ZOOM_LEVELS: { value: ZoomLevel; label: string }[] = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

interface ZoomControlsProps {
  onBackToNow?: () => void;
}

export function ZoomControls({ onBackToNow }: ZoomControlsProps) {
  const { zoomLevel } = useSnapshot(timelineStore);

  return (
    <Panel position="top-right" className="m-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onBackToNow}
          className="h-8 px-3 text-xs bg-card/95 backdrop-blur-sm border-border"
          title="Back to Now (Space)"
        >
          <LocateFixed className="w-3.5 h-3.5 mr-1.5" />
          Now
        </Button>
        <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-1">
          {ZOOM_LEVELS.map((level) => (
            <Button
              key={level.value}
              size="sm"
              variant={zoomLevel === level.value ? 'default' : 'ghost'}
              onClick={() => timelineActions.setZoomLevel(level.value)}
              className={cn(
                'h-7 px-3 text-xs',
                zoomLevel === level.value && 'bg-primary text-primary-foreground'
              )}
            >
              {level.label}
            </Button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
