import type { Space as TrackType } from '@/types';
import { Button } from '@/components/ui/button';
import { spacesActions } from '@/stores/spaces.store';
import { segmentsActions } from '@/stores/segments.store';
import { Plus } from 'lucide-react';

interface TrackProps {
  space: TrackType;
}

export function Space({ space }: TrackProps) {
  const handleAddSegment = () => {
    const types = ['browser', 'terminal', 'agent', 'note'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];

    const segment = segmentsActions.createSegment(
      space.id,
      `${randomType} work`,
      randomType
    );

    // Add to track
    spacesActions.addSegment(space.id, segment);
  };

  return (
    <div className="h-20 border-b border-border flex items-center justify-between px-4 hover:bg-accent/50 transition-colors group">
      <div className="flex items-center gap-3">
        <div
          className="w-1 h-12 rounded"
          style={{ backgroundColor: space.color }}
        />
        <div>
          <h3 className="text-sm font-medium">{space.name}</h3>
          <p className="text-xs text-muted-foreground">
            {space.segments.length} segments
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
