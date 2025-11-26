import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface TerminalPreviewProps {
  lines: string[];
  visible: boolean;
  maxLines?: number;
}

export function TerminalPreview({ lines, visible, maxLines = 5 }: TerminalPreviewProps) {
  const visibleLines = lines.slice(-maxLines);

  return (
    <AnimatePresence>
      {visible && visibleLines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 8, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 bg-black/90 rounded-lg p-2 font-mono text-xs overflow-hidden"
        >
          {visibleLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'truncate leading-relaxed',
                line.startsWith('✓') && 'text-green-400',
                line.startsWith('✕') && 'text-red-400',
                line.startsWith('●') && 'text-yellow-400',
                line.startsWith('○') && 'text-blue-400',
                line.startsWith('>') && 'text-purple-400',
                line.startsWith('!') && 'text-orange-400',
                !line.match(/^[✓✕●○>!]/) && 'text-gray-400'
              )}
            >
              {line}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
