import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, X, Minimize2 } from 'lucide-react';
import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';

// Tab type icons - reuse from TabPreview
function TabTypeIcon({ type, className }: { type: Tab['type']; className?: string }) {
  const iconClass = cn('w-4 h-4', className);

  // Simple emoji-based icons for now
  const icons: Record<Tab['type'], string> = {
    terminal: '⌨️',
    browser: '🌐',
    'app-launcher': '📱',
    tasks: '✅',
    notes: '📝',
    agent: '🤖',
  };

  return <span className={iconClass}>{icons[type] || '📄'}</span>;
}

interface WindowTitleBarProps {
  title: string;
  tabType: Tab['type'];
  tabEmoji?: string;
  isMaximized: boolean;
  onDragStart: () => void;
  onDrag: (deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const TITLE_BAR_HEIGHT = 32;

export function WindowTitleBar({
  title,
  tabType,
  tabEmoji,
  isMaximized,
  onDragStart,
  onDrag,
  onDragEnd,
  onMaximize,
  onClose,
}: WindowTitleBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;
      // Don't drag from buttons
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      setIsDragging(true);
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      onDragStart();
    },
    [onDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastPosRef.current.x;
      const deltaY = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      onDrag(deltaX, deltaY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag, onDragEnd]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 select-none',
        'bg-card border-b border-white/[0.06]',
        'rounded-t-lg',
        isDragging && 'cursor-grabbing'
      )}
      style={{ height: TITLE_BAR_HEIGHT }}
      onMouseDown={handleMouseDown}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {tabEmoji ? (
          <span className="text-sm">{tabEmoji}</span>
        ) : (
          <TabTypeIcon type={tabType} className="w-4 h-4 opacity-60" />
        )}
      </div>

      {/* Title */}
      <span className="flex-1 text-xs font-medium truncate text-foreground/80">{title}</span>

      {/* Window controls: Maximize toggle + Close */}
      <div className="flex items-center gap-0.5 -mr-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMaximize();
          }}
          className="p-1.5 rounded hover:bg-white/[0.08] transition-colors"
          title={isMaximized ? 'Float' : 'Maximize'}
        >
          {isMaximized ? (
            <Minimize2 className="w-3 h-3 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded hover:bg-destructive/20 transition-colors group"
          title="Close"
        >
          <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

export { TITLE_BAR_HEIGHT };
