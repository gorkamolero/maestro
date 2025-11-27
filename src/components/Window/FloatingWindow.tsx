import { useCallback, useRef } from 'react';
import type { WindowState } from '@/stores/windows.store';
import { windowsActions } from '@/stores/windows.store';
import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { WindowTitleBar, TITLE_BAR_HEIGHT } from './WindowTitleBar';
import { ResizeHandles } from './ResizeHandles';

interface FloatingWindowProps {
  window: WindowState;
  tab: Tab;
  isFocused: boolean;
  children: React.ReactNode;
}

const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;

export function FloatingWindow({ window, tab, isFocused, children }: FloatingWindowProps) {
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  // ============================================================================
  // Drag handlers
  // ============================================================================

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    windowsActions.focusWindow(window.id);
  }, [window.id]);

  const handleDrag = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!isDraggingRef.current) return;

      windowsActions.updatePosition(window.id, {
        x: window.position.x + deltaX,
        y: window.position.y + deltaY,
      });
    },
    [window.id, window.position.x, window.position.y]
  );

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // ============================================================================
  // Resize handlers
  // ============================================================================

  const handleResizeStart = useCallback(() => {
    isResizingRef.current = true;
    windowsActions.focusWindow(window.id);
  }, [window.id]);

  const handleResize = useCallback(
    (deltaWidth: number, deltaHeight: number, deltaX: number, deltaY: number) => {
      if (!isResizingRef.current) return;

      // Calculate new dimensions
      const newWidth = Math.max(MIN_WIDTH, window.size.width + deltaWidth);
      const newHeight = Math.max(MIN_HEIGHT, window.size.height + deltaHeight);

      // Calculate position adjustment for west/north edge resizing
      // deltaX/deltaY from ResizeHandles indicates the edge being dragged
      let newX = window.position.x;
      let newY = window.position.y;

      if (deltaX !== 0) {
        // West edge: move position by how much width actually changed
        // If min size prevents full resize, don't move position as much
        const actualWidthDelta = newWidth - window.size.width;
        newX = window.position.x - actualWidthDelta;
      }
      if (deltaY !== 0) {
        // North edge: same logic for height
        const actualHeightDelta = newHeight - window.size.height;
        newY = window.position.y - actualHeightDelta;
      }

      windowsActions.updateBounds(
        window.id,
        { x: newX, y: newY },
        { width: newWidth, height: newHeight }
      );
    },
    [window.id, window.size.width, window.size.height, window.position.x, window.position.y]
  );

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
  }, []);

  // ============================================================================
  // Window control handlers
  // ============================================================================

  const handleMaximize = useCallback(() => {
    windowsActions.toggleMode(window.id);
  }, [window.id]);

  const handleClose = useCallback(() => {
    windowsActions.closeWindow(window.id);
  }, [window.id]);

  const handleFocus = useCallback(() => {
    if (!isFocused) {
      windowsActions.focusWindow(window.id);
    }
  }, [window.id, isFocused]);

  // Content area height (total height minus title bar)
  const contentHeight = window.size.height - TITLE_BAR_HEIGHT;

  return (
    <div
      className={cn(
        'absolute rounded-lg overflow-hidden',
        'bg-background border shadow-2xl',
        isFocused ? 'border-primary/30 shadow-primary/10' : 'border-white/[0.08]'
      )}
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex,
      }}
      onMouseDown={handleFocus}
    >
      {/* Title bar - pure DOM for drag handling */}
      <WindowTitleBar
        title={tab.title}
        tabType={tab.type}
        tabEmoji={tab.emoji}
        isMaximized={window.mode === 'maximized'}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* Content area */}
      <div className="relative bg-card" style={{ height: contentHeight }}>
        {children}
      </div>

      {/* Resize handles */}
      <ResizeHandles
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
      />
    </div>
  );
}

export { TITLE_BAR_HEIGHT };
