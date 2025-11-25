import { useMemo } from 'react';
import { Flame, Sun, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

type Warmth = 'hot' | 'warm' | 'cold';

interface WarmthIndicatorProps {
  lastActiveAt: string | null;
  className?: string;
}

function getWarmth(lastActiveAt: string | null): Warmth {
  if (!lastActiveAt) return 'cold';

  const hoursSince = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 'hot'; // Active within last hour
  if (hoursSince < 24) return 'warm'; // Active today
  return 'cold'; // Not active today
}

const warmthConfig: Record<Warmth, { icon: typeof Flame; color: string; label: string }> = {
  hot: {
    icon: Flame,
    color: 'text-orange-500',
    label: 'Active recently',
  },
  warm: {
    icon: Sun,
    color: 'text-amber-400',
    label: 'Active today',
  },
  cold: {
    icon: Snowflake,
    color: 'text-blue-400/60',
    label: 'Inactive',
  },
};

export function WarmthIndicator({ lastActiveAt, className }: WarmthIndicatorProps) {
  const warmth = useMemo(() => getWarmth(lastActiveAt), [lastActiveAt]);
  const config = warmthConfig[warmth];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center', className)} title={config.label}>
      <Icon className={cn('w-4 h-4', config.color)} />
    </div>
  );
}

export { getWarmth };
export type { Warmth };
