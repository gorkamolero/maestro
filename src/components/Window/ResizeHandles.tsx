import { useState, useEffect, useCallback, useRef } from 'react';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeHandlesProps {
  onResizeStart: () => void;
  onResize: (
    deltaWidth: number,
    deltaHeight: number,
    deltaX: number,
    deltaY: number,
    direction: ResizeDirection
  ) => void;
  onResizeEnd: () => void;
  minWidth?: number;
  minHeight?: number;
}

const HANDLE_SIZE = 8;
const CORNER_SIZE = 12;

export function ResizeHandles({
  onResizeStart,
  onResize,
  onResizeEnd,
  // minWidth and minHeight are enforced by the parent component
}: ResizeHandlesProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (direction: ResizeDirection) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeDirection(direction);
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      onResizeStart();
    },
    [onResizeStart]
  );

  useEffect(() => {
    if (!isResizing || !resizeDirection) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastPosRef.current.x;
      const deltaY = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      let dWidth = 0;
      let dHeight = 0;
      let dX = 0;
      let dY = 0;

      // Calculate deltas based on direction
      if (resizeDirection.includes('e')) {
        dWidth = deltaX;
      }
      if (resizeDirection.includes('w')) {
        dWidth = -deltaX;
        dX = deltaX;
      }
      if (resizeDirection.includes('s')) {
        dHeight = deltaY;
      }
      if (resizeDirection.includes('n')) {
        dHeight = -deltaY;
        dY = deltaY;
      }

      onResize(dWidth, dHeight, dX, dY, resizeDirection);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      onResizeEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDirection, onResize, onResizeEnd]);

  // Cursor styles for each direction
  const cursorMap: Record<ResizeDirection, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
  };

  return (
    <>
      {/* Edge handles */}
      {/* North */}
      <div
        className="absolute left-[12px] right-[12px] top-0 hover:bg-primary/20"
        style={{ height: HANDLE_SIZE, cursor: cursorMap.n }}
        onMouseDown={handleMouseDown('n')}
      />
      {/* South */}
      <div
        className="absolute left-[12px] right-[12px] bottom-0 hover:bg-primary/20"
        style={{ height: HANDLE_SIZE, cursor: cursorMap.s }}
        onMouseDown={handleMouseDown('s')}
      />
      {/* East */}
      <div
        className="absolute top-[12px] bottom-[12px] right-0 hover:bg-primary/20"
        style={{ width: HANDLE_SIZE, cursor: cursorMap.e }}
        onMouseDown={handleMouseDown('e')}
      />
      {/* West */}
      <div
        className="absolute top-[12px] bottom-[12px] left-0 hover:bg-primary/20"
        style={{ width: HANDLE_SIZE, cursor: cursorMap.w }}
        onMouseDown={handleMouseDown('w')}
      />

      {/* Corner handles */}
      {/* North-West */}
      <div
        className="absolute top-0 left-0 hover:bg-primary/20"
        style={{ width: CORNER_SIZE, height: CORNER_SIZE, cursor: cursorMap.nw }}
        onMouseDown={handleMouseDown('nw')}
      />
      {/* North-East */}
      <div
        className="absolute top-0 right-0 hover:bg-primary/20"
        style={{ width: CORNER_SIZE, height: CORNER_SIZE, cursor: cursorMap.ne }}
        onMouseDown={handleMouseDown('ne')}
      />
      {/* South-West */}
      <div
        className="absolute bottom-0 left-0 hover:bg-primary/20"
        style={{ width: CORNER_SIZE, height: CORNER_SIZE, cursor: cursorMap.sw }}
        onMouseDown={handleMouseDown('sw')}
      />
      {/* South-East */}
      <div
        className="absolute bottom-0 right-0 hover:bg-primary/20"
        style={{ width: CORNER_SIZE, height: CORNER_SIZE, cursor: cursorMap.se }}
        onMouseDown={handleMouseDown('se')}
      />
    </>
  );
}
