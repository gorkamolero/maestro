import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface ActivityLine {
  id: string;
  text: string;
  timestamp: Date;
}

interface AgentActivityLogProps {
  lines: string[];
  maxLines?: number;
  autoScroll?: boolean;
  className?: string;
}

function getLineStyle(line: string): string {
  if (line.startsWith('✓')) return 'text-green-400';
  if (line.startsWith('✕')) return 'text-red-400';
  if (line.startsWith('●')) return 'text-yellow-400';
  if (line.startsWith('○')) return 'text-blue-400';
  if (line.startsWith('>')) return 'text-purple-400';
  if (line.startsWith('!')) return 'text-orange-400';
  return 'text-gray-400';
}

function getLineIcon(line: string): string | null {
  if (line.startsWith('✓')) return '✓';
  if (line.startsWith('✕')) return '✕';
  if (line.startsWith('●')) return '●';
  if (line.startsWith('○')) return '○';
  if (line.startsWith('>')) return '>';
  if (line.startsWith('!')) return '!';
  return null;
}

function stripPrefix(line: string): string {
  // Remove the icon prefix and any following space
  return line.replace(/^[✓✕●○>!]\s*/, '');
}

export function AgentActivityLog({
  lines,
  maxLines = 50,
  autoScroll = true,
  className,
}: AgentActivityLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleLines = lines.slice(-maxLines);

  // Convert to activity lines with IDs for animation
  const activityLines: ActivityLine[] = visibleLines.map((text, index) => ({
    id: `${lines.length - visibleLines.length + index}-${text.slice(0, 20)}`,
    text,
    timestamp: new Date(),
  }));

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines.length, autoScroll]);

  if (activityLines.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full',
          'text-gray-500 text-sm italic',
          className
        )}
      >
        No activity yet
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col gap-0.5 overflow-auto font-mono text-xs',
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {activityLines.map((line) => {
          const icon = getLineIcon(line.text);
          const content = stripPrefix(line.text);
          const colorClass = getLineStyle(line.text);

          return (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-start gap-2 py-0.5 px-1 rounded',
                'hover:bg-white/[0.02]'
              )}
            >
              {/* Icon */}
              {icon && (
                <span className={cn('w-3 text-center shrink-0', colorClass)}>
                  {icon}
                </span>
              )}

              {/* Content */}
              <span className={cn('flex-1 break-words', icon ? 'text-foreground/80' : colorClass)}>
                {content || line.text}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function AgentActivityLogCompact({
  lines,
  maxLines = 5,
  className,
}: Omit<AgentActivityLogProps, 'autoScroll'>) {
  const visibleLines = lines.slice(-maxLines);

  return (
    <div className={cn('font-mono text-[10px] space-y-0.5', className)}>
      {visibleLines.map((line, i) => (
        <div
          key={i}
          className={cn('truncate', getLineStyle(line))}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
