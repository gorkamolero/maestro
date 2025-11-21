import { memo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { BaseNode } from '@/components/base-node';
import { Button } from '@/components/ui/button';
import { tracksActions } from '@/stores/tracks.store';
import { segmentsActions } from '@/stores/segments.store';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackLabelNodeData {
  trackId: string;
  name: string;
  color: string;
  segmentCount: number;
}

interface TrackLabelNodeProps {
  data: TrackLabelNodeData;
}

function TrackLabelNodeComponent({ data }: TrackLabelNodeProps) {
  const { getViewport } = useReactFlow();
  const viewport = getViewport();

  // Prevent labels from scaling up beyond default size
  const scale = viewport.zoom > 1 ? 1 / viewport.zoom : 1;
  const handleAddSegment = () => {
    const types = ['browser', 'terminal', 'agent', 'note'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];

    const segment = segmentsActions.createSegment(
      data.trackId,
      `${randomType} work`,
      randomType
    );

    tracksActions.addSegment(data.trackId, segment);
  };

  return (
    <BaseNode
      className={cn(
        'h-16 px-4 py-0 flex items-center justify-between gap-3 bg-card/95 backdrop-blur-sm min-w-[200px] group'
      )}
      style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-1 h-12 rounded flex-shrink-0"
          style={{ backgroundColor: data.color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{data.name}</h3>
          <p className="text-xs text-muted-foreground">
            {data.segmentCount} segments
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={handleAddSegment}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </BaseNode>
  );
}

export const TrackLabelNode = memo(TrackLabelNodeComponent);
