import { useSnapshot } from 'valtio';
import { Panel } from '@xyflow/react';
import { timelineStore } from '@/stores/timeline.store';
import { timeToPixels } from '@/lib/timeline-utils';

interface NowLineProps {
  referenceTime: Date;
}

export function NowLine({ referenceTime }: NowLineProps) {
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const xPosition = timeToPixels(now, zoomLevel, referenceTime);

  return (
    <Panel position="top-left" className="pointer-events-none">
      <div
        className="absolute top-0 h-screen w-0.5 bg-primary pointer-events-none"
        style={{
          left: `${xPosition}px`,
          boxShadow: '0 0 10px hsl(var(--primary))',
        }}
      >
        <div className="absolute -top-1 -left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-background rounded-full" />
        </div>
        <div className="absolute -top-8 left-2 text-xs font-mono text-primary whitespace-nowrap">
          NOW
        </div>
      </div>
    </Panel>
  );
}
