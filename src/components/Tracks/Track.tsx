import type { Track as TrackType } from '@/types';
import { Button } from '@/components/ui/button';
import { tracksActions } from '@/stores/tracks.store';
import { segmentsActions } from '@/stores/segments.store';
import { Plus } from 'lucide-react';

interface TrackProps {
  track: TrackType;
}

export function Track({ track }: TrackProps) {
  const handleAddSegment = () => {
    const types = ['browser', 'terminal', 'agent', 'note'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];

    const segment = segmentsActions.createSegment(
      track.id,
      `${randomType} work`,
      randomType
    );

    // Add to track
    tracksActions.addSegment(track.id, segment);
  };

  return (
    <div className="h-20 border-b border-border flex items-center justify-between px-4 hover:bg-accent/50 transition-colors group">
      <div className="flex items-center gap-3">
        <div
          className="w-1 h-12 rounded"
          style={{ backgroundColor: track.color }}
        />
        <div>
          <h3 className="text-sm font-medium">{track.name}</h3>
          <p className="text-xs text-muted-foreground">
            {track.segments.length} segments
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleAddSegment}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}
