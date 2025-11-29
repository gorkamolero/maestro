import React, { useRef, useCallback } from 'react';

interface TouchOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onInput: (input: any) => void;
}

export function TouchOverlay({ videoRef, onInput }: TouchOverlayProps) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPosition = useCallback((touch: React.Touch) => {
    const video = videoRef.current;
    if (!video) return { x: 0, y: 0 };
    const rect = video.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }, [videoRef]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (e.touches.length === 1) {
      const pos = getPosition(e.touches[0]);
      touchStartRef.current = { ...pos, time: Date.now() };

      // Long press = right click
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          onInput({ type: 'rightclick', ...pos });
          touchStartRef.current = null;
        }
      }, 500);
    } else if (e.touches.length === 2) {
      // Two finger tap = right click
      clearTimeout(longPressTimerRef.current!);
      onInput({ type: 'rightclick', ...getPosition(e.touches[0]) });
      touchStartRef.current = null;
    }
  }, [getPosition, onInput]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Two finger drag = scroll
    if (e.touches.length === 2 && touchStartRef.current) {
      const pos = getPosition(e.touches[0]);
      const deltaY = (touchStartRef.current.y - pos.y) * 3;
      onInput({ type: 'scroll', x: pos.x, y: pos.y, deltaY });
      touchStartRef.current = { ...pos, time: Date.now() };
    }
  }, [getPosition, onInput]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchStartRef.current) {
      const duration = Date.now() - touchStartRef.current.time;
      if (duration < 200) {
        onInput({ type: 'click', x: touchStartRef.current.x, y: touchStartRef.current.y });
      }
      touchStartRef.current = null;
    }
  }, [onInput]);

  return (
    <div
      className="absolute inset-0 z-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
}
