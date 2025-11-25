import { motion } from 'motion/react';
import type { AgentStatus } from '@/stores/agent.store';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-16 h-16 text-3xl',
  lg: 'w-32 h-32 text-6xl',
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#888888',
  starting: '#60a5fa', // blue
  thinking: '#facc15', // yellow
  editing: '#4ade80', // green
  'running-command': '#a78bfa', // purple
  waiting: '#fb923c', // orange
  completed: '#4ade80', // green
  error: '#f87171', // red
  stopped: '#6b7280', // gray
};

const ANIMATIONS: Record<AgentStatus, object> = {
  idle: {},
  starting: { scale: [1, 1.1, 1] },
  thinking: { scale: [1, 1.05, 1] },
  editing: { y: [0, -3, 0] },
  'running-command': { rotate: [0, 360] },
  waiting: { opacity: [1, 0.5, 1] },
  completed: { scale: [1, 1.2, 1] },
  error: { x: [-3, 3, -3, 3, 0] },
  stopped: {},
};

const ICONS: Record<AgentStatus, string> = {
  idle: '🤖',
  starting: '🤖',
  thinking: '🤖',
  editing: '🤖',
  'running-command': '🤖',
  waiting: '🤖',
  completed: '✓',
  error: '✕',
  stopped: '⏹',
};

export function AgentAvatar({ status, size = 'md', className }: AgentAvatarProps) {
  const isActive = ['starting', 'thinking', 'editing', 'running-command'].includes(status);
  const color = STATUS_COLORS[status];

  return (
    <div className={cn('relative flex items-center justify-center', SIZE_CLASSES[size], className)}>
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        animate={{
          scale: isActive ? [1, 1.3, 1] : 1,
          opacity: isActive ? [0.2, 0.4, 0.2] : 0.2,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ backgroundColor: color }}
      />

      {/* Main icon */}
      <motion.span
        animate={ANIMATIONS[status]}
        transition={{
          duration: status === 'running-command' ? 2 : 1,
          repeat: isActive ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="relative z-10"
      >
        {ICONS[status]}
      </motion.span>

      {/* Progress dots */}
      {isActive && (
        <div className="absolute -bottom-3 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
