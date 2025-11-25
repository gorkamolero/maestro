import { useCallback } from 'react';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { NextBubble } from './NextBubble';
import { cn } from '@/lib/utils';

interface FloatingNextBubbleProps {
  spaceId: string | null;
  className?: string;
}

export function FloatingNextBubble({ spaceId, className }: FloatingNextBubbleProps) {
  const { spaces } = useSpacesStore();

  const space = spaceId ? spaces.find((s) => s.id === spaceId) : null;

  const handleChange = useCallback(
    (next: string | null) => {
      if (spaceId) {
        spacesActions.setSpaceNext(spaceId, next);
      }
    },
    [spaceId]
  );

  if (!space) return null;

  return (
    <div
      className={cn(
        'bg-background/95 backdrop-blur-sm rounded-full shadow-lg border border-border',
        'max-w-xs',
        className
      )}
    >
      <NextBubble
        value={space.next}
        onChange={handleChange}
        placeholder="What's next?"
      />
    </div>
  );
}
