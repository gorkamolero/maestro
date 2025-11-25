import { motion } from 'motion/react';

/**
 * An indeterminate progress bar that shows when an agent/terminal is running.
 * Uses a sliding gradient animation to indicate activity.
 */
export function AgentProgressBar() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/[0.04] overflow-hidden rounded-b-lg">
      <motion.div
        className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
        animate={{
          x: ['-100%', '400%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
