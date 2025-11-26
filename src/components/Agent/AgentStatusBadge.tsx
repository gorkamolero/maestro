import { useSnapshot } from 'valtio';
import { motion } from 'motion/react';
import { agentStore } from '@/stores/agent.store';
import { cn } from '@/lib/utils';

interface AgentStatusBadgeProps {
  tabId: string;
  className?: string;
}

export function AgentStatusBadge({ tabId, className }: AgentStatusBadgeProps) {
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  if (!session || session.status === 'idle') return null;

  const isActive = ['starting', 'thinking', 'editing', 'running-command'].includes(session.status);
  const isCompleted = session.status === 'completed';
  const isError = session.status === 'error';

  return (
    <motion.span
      className={cn(
        'w-2 h-2 rounded-full ring-1 ring-background',
        isActive && 'bg-yellow-400',
        isCompleted && 'bg-green-400',
        isError && 'bg-red-400',
        !isActive && !isCompleted && !isError && 'bg-gray-400',
        className
      )}
      animate={isActive ? { opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    />
  );
}
