import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types';

interface TagBadgeProps {
  tag: Tag;
  /** Show remove button */
  removable?: boolean;
  /** Callback when remove is clicked */
  onRemove?: () => void;
  /** Click handler for the badge itself */
  onClick?: () => void;
  /** Whether the tag is currently active (for filter state) */
  active?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  className?: string;
}

export function TagBadge({
  tag,
  removable = false,
  onRemove,
  onClick,
  active = false,
  size = 'sm',
  className,
}: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        'backdrop-blur-sm border border-white/10',
        'transition-all duration-200',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        onClick && 'cursor-pointer hover:scale-105 hover:border-white/20',
        active && 'ring-1 ring-white/30 ring-offset-1 ring-offset-transparent',
        className
      )}
      style={{
        backgroundColor: `${tag.color}40`, // 25% opacity for glass effect
        color: tag.color,
        textShadow: '0 0 10px currentColor',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'ml-0.5 rounded-full p-0.5 transition-all',
            'hover:bg-white/10 hover:scale-110'
          )}
        >
          <X className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        </button>
      )}
    </span>
  );
}
