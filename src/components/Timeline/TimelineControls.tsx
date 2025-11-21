import { Panel } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LocateFixed, Grid3x3, Circle, Plus } from 'lucide-react';
import type { ZoomLevel } from '@/types';

const ZOOM_LEVELS: { value: ZoomLevel; label: string }[] = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

interface TimelineControlsProps {
  onBackToNow?: () => void;
  onAddTrack?: () => void;
  centerOnNow?: () => void;
}

export function TimelineControls({ onBackToNow, onAddTrack, centerOnNow }: TimelineControlsProps) {
  const { zoomLevel, backgroundVariant } = useSnapshot(timelineStore);

  const handleZoomChange = (level: ZoomLevel) => {
    timelineActions.setZoomLevel(level);
    // Center on NOW after zoom change
    if (centerOnNow) {
      centerOnNow();
    }
  };

  return (
    <Panel position="top-right" className="mr-4 mb-4 ml-4" style={{ marginTop: '40px' }}>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={onAddTrack}
          className="h-8 px-3 text-xs"
          title="Add Track"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Track
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBackToNow}
          className="h-8 px-2 bg-card/95 backdrop-blur-sm border-border"
          title="Back to Now (Space)"
        >
          <LocateFixed className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => timelineActions.toggleBackgroundVariant()}
          className="h-8 px-2 bg-card/95 backdrop-blur-sm border-border"
          title={`Switch to ${backgroundVariant === 'lines' ? 'Dots' : 'Grid'}`}
        >
          {backgroundVariant === 'lines' ? (
            <Circle className="w-3.5 h-3.5" />
          ) : (
            <Grid3x3 className="w-3.5 h-3.5" />
          )}
        </Button>
        <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-1">
          {ZOOM_LEVELS.map((level) => (
            <Button
              key={level.value}
              size="sm"
              variant={zoomLevel === level.value ? 'default' : 'ghost'}
              onClick={() => handleZoomChange(level.value)}
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
