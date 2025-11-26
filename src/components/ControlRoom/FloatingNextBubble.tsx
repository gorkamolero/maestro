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
        'px-3 py-2 rounded-lg',
        'bg-card/90 backdrop-blur-sm',
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
