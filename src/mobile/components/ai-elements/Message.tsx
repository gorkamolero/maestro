// Mobile Message Component - Simplified chat bubbles
import { cn } from '@mobile/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  from: 'user' | 'assistant';
  children: ReactNode;
}

export function Message({ className, from, children, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        'flex w-full max-w-[85%] flex-col gap-1',
        from === 'user' ? 'ml-auto items-end' : 'items-start',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface MessageContentProps extends HTMLAttributes<HTMLDivElement> {
  from?: 'user' | 'assistant';
}

export function MessageContent({ className, children, from, ...props }: MessageContentProps) {
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-2.5 text-sm',
        from === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-white/10 text-white/90',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MessageTime({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10px] text-white/40 px-1', className)}>
      {children}
    </span>
  );
}
