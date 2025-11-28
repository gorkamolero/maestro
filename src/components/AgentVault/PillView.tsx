// PillView - Collapsed pill showing agent count and status dots

import { motion } from 'motion/react';
import type { AgentSession } from '@/types/agent-events';

interface PillViewProps {
  sessions: AgentSession[];
  onExpand: () => void;
}

export function PillView({ sessions, onExpand }: PillViewProps) {
  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const idleCount = sessions.filter((s) => s.status === 'idle').length;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onExpand}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 transition-colors"
    >
      <span className="text-lg">🤖</span>

      <span className="text-sm text-gray-300">
        {sessions.length} agent{sessions.length !== 1 ? 's' : ''}
      </span>

      {/* Status dots */}
      <div className="flex items-center gap-1">
        {activeCount > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(activeCount, 3) }).map((_, i) => (
              <div key={`active-${i}`} className="w-2 h-2 rounded-full bg-green-500" />
            ))}
            {activeCount > 3 && (
              <span className="text-xs text-green-400">+{activeCount - 3}</span>
            )}
          </div>
        )}
        {idleCount > 0 && (
          <div className="flex items-center gap-0.5 ml-1">
            {Array.from({ length: Math.min(idleCount, 3) }).map((_, i) => (
              <div key={`idle-${i}`} className="w-2 h-2 rounded-full bg-yellow-500" />
            ))}
            {idleCount > 3 && (
              <span className="text-xs text-yellow-400">+{idleCount - 3}</span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
