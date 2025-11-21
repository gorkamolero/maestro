import { Panel } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { LocateFixed, Grid3x3, Circle, Plus } from 'lucide-react';
import { Dock, DockIcon } from '@/components/ui/dock';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/animate-ui/components/radix/toggle-group';
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
  onZoomChange?: (level: ZoomLevel) => void;
}

export function TimelineControls({ onBackToNow, onAddTrack, onZoomChange }: TimelineControlsProps) {
  const { zoomLevel, backgroundVariant } = useSnapshot(timelineStore);

  const handleZoomChange = (value: string) => {
    if (value && onZoomChange) {
      onZoomChange(value as ZoomLevel);
    }
  };

  return (
    <Panel position="bottom-center" className="mt-4">
      <TooltipProvider>
        <Dock direction="middle">
          <DockIcon>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onAddTrack}
                  className="flex items-center justify-center w-full h-full"
                  aria-label="Add Track"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Track</p>
              </TooltipContent>
            </Tooltip>
          </DockIcon>

          <DockIcon>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onBackToNow}
                  className="flex items-center justify-center w-full h-full"
                  aria-label="Back to Now"
                >
                  <LocateFixed className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to Now (Space)</p>
              </TooltipContent>
            </Tooltip>
          </DockIcon>

          <DockIcon>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => timelineActions.toggleBackgroundVariant()}
                  className="flex items-center justify-center w-full h-full"
                  aria-label="Toggle Background"
                >
                  {backgroundVariant === 'lines' ? (
                    <Circle className="w-5 h-5" />
                  ) : (
                    <Grid3x3 className="w-5 h-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{backgroundVariant === 'lines' ? 'Switch to Dots' : 'Switch to Grid'}</p>
              </TooltipContent>
            </Tooltip>
          </DockIcon>

          <Separator orientation="vertical" className="h-full py-2" />

          <ToggleGroup
            type="single"
            value={zoomLevel}
            onValueChange={handleZoomChange}
            variant="outline"
            size="sm"
          >
            {ZOOM_LEVELS.map((level) => (
              <ToggleGroupItem key={level.value} value={level.value}>
                {level.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Dock>
      </TooltipProvider>
    </Panel>
  );
}
