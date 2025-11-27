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
  // Calculate contrasting text color based on background
  const getContrastColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const textColor = getContrastColor(tag.color);

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-all',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        onClick && 'cursor-pointer hover:opacity-80',
        active && 'ring-2 ring-white/50',
        className
      )}
      style={{
        backgroundColor: tag.color,
        color: textColor,
      }}
    >
      {tag.name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:bg-black/20 p-0.5 transition-colors"
        >
          <X className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        </button>
      )}
    </span>
  );
}
