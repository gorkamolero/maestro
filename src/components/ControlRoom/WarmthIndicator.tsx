import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type Warmth = 'hot' | 'warm' | 'cold';

interface WarmthIndicatorProps {
  lastActiveAt: string | null;
  className?: string;
}

export function getWarmth(lastActiveAt: string | null): Warmth {
  if (!lastActiveAt) return 'cold';

  const hoursSince = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 'hot';
  if (hoursSince < 24) return 'warm';
  return 'cold';
}

export function WarmthIndicator({ lastActiveAt, className }: WarmthIndicatorProps) {
  const warmth = useMemo(() => getWarmth(lastActiveAt), [lastActiveAt]);

  // Simple dot - just opacity changes, no color
  return (
    <div
      className={cn(
        'w-1.5 h-1.5 rounded-full',
        warmth === 'hot' && 'bg-foreground',
        warmth === 'warm' && 'bg-foreground/40',
        warmth === 'cold' && 'bg-foreground/15',
        className
      )}
      title={warmth === 'hot' ? 'Active now' : warmth === 'warm' ? 'Active today' : 'Inactive'}
    />
  );
}
