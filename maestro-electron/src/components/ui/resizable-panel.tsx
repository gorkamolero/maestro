import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
  className?: string;
  children: React.ReactNode;
}

export function ResizablePanel({
  defaultWidth = 240,
  minWidth = 180,
  maxWidth = 400,
  onResize,
  className,
  children,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && panelRef.current) {
        const newWidth = e.clientX;
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        setWidth(constrainedWidth);
        onResize?.(constrainedWidth);
      }
    },
    [isResizing, minWidth, maxWidth, onResize]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing, resize, stopResizing]);

  return (
    <div
      ref={panelRef}
      className={cn('relative flex-shrink-0', className)}
      style={{ width: `${width}px` }}
    >
      {children}

      {/* Resize handle */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400/50 transition-colors group',
          isResizing && 'bg-blue-400'
        )}
        onMouseDown={startResizing}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
    </div>
  );
}
