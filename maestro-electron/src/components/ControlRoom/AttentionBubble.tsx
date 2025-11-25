import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/stores/notifications.store';

interface AttentionBubbleProps {
  type: NotificationType;
  message: string;
  onDismiss: () => void;
  onClick?: () => void;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  'agent-done': '⚡',
  'agent-error': '✕',
  'build-failed': '✕',
  'build-success': '✓',
  'process-crashed': '💥',
  'mention': '@',
};

const TYPE_COLORS: Record<NotificationType, string> = {
  'agent-done': 'text-blue-400',
  'agent-error': 'text-red-400',
  'build-failed': 'text-red-400',
  'build-success': 'text-green-400',
  'process-crashed': 'text-red-400',
  'mention': 'text-yellow-400',
};

export function AttentionBubble({
  type,
  message,
  onDismiss,
  onClick,
}: AttentionBubbleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute -top-2 -right-2 px-2 py-1 rounded-md text-xs',
        'bg-card border border-white/[0.08] shadow-lg',
        'cursor-pointer hover:bg-accent transition-colors',
        'max-w-[150px] truncate'
      )}
      onClick={handleClick}
    >
      <span className={cn('mr-1', TYPE_COLORS[type])}>
        {TYPE_ICONS[type]}
      </span>
      <span className="text-foreground">{message}</span>
    </motion.div>
  );
}
