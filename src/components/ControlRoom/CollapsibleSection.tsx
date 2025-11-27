import { useState, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  icon: ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Compact mode for card views */
  compact?: boolean;
}

export function CollapsibleSection({
  icon,
  label,
  defaultOpen = false,
  children,
  className,
  compact = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 w-full font-medium transition-colors',
          'text-muted-foreground hover:text-foreground',
          compact
            ? 'h-6 px-1 text-[10px]'
            : 'h-7 px-2 text-[11px] border-b border-white/[0.06]'
        )}
      >
        <ChevronRight
          className={cn(
            'transition-transform duration-150',
            compact ? 'w-2.5 h-2.5' : 'w-3 h-3',
            isOpen && 'rotate-90'
          )}
        />
        {icon}
        <span>{label}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
