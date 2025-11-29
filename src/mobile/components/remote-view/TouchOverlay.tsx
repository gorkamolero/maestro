import { useState, useEffect, useCallback, useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import type { RemoteInput } from '../../../renderer/remote-view/types';

// Gesture timing constants
const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 30;
const MAX_ZOOM = 4;

interface TouchOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onInput: (input: RemoteInput) => void;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

export function TouchOverlay({ videoRef, onInput }: TouchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const lastTapTime = useRef(0);
  const lastTapPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Apply transform to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
    video.style.transformOrigin = 'center center';
    video.style.transition = transform.scale === 1 ? 'transform 200ms ease-out' : 'none';
  }, [transform, videoRef]);

  // Convert screen coordinates to video coordinates
  // Accounts for object-fit: contain which centers video with letterboxing
  const screenToVideo = useCallback((screenX: number, screenY: number) => {
    const video = videoRef.current;
    if (!video) return { x: 0, y: 0 };

    const rect = video.getBoundingClientRect();
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    const videoAspect = videoWidth / videoHeight;
    const containerAspect = rect.width / rect.height;

    let contentWidth: number;
    let contentHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (videoAspect > containerAspect) {
      contentWidth = rect.width;
      contentHeight = rect.width / videoAspect;
      offsetX = 0;
      offsetY = (rect.height - contentHeight) / 2;
    } else {
      contentHeight = rect.height;
      contentWidth = rect.height * videoAspect;
      offsetX = (rect.width - contentWidth) / 2;
      offsetY = 0;
    }

    const relativeX = (screenX - rect.left - transform.x) / transform.scale - offsetX;
    const relativeY = (screenY - rect.top - transform.y) / transform.scale - offsetY;

    const x = (relativeX / contentWidth) * videoWidth;
    const y = (relativeY / contentHeight) * videoHeight;

    return { x, y };
  }, [videoRef, transform]);

  // Get max pan bounds based on zoom level
  const getMaxPan = useCallback(() => {
    const video = videoRef.current;
    if (!video) return { x: 0, y: 0 };

    const rect = video.getBoundingClientRect();
    const scaledWidth = rect.width * transform.scale;
    const scaledHeight = rect.height * transform.scale;

    return {
      x: Math.max(0, (scaledWidth - rect.width) / 2),
      y: Math.max(0, (scaledHeight - rect.height) / 2),
    };
  }, [videoRef, transform.scale]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useGesture(
    {
      onPointerDown: (state) => {
        state.event.preventDefault();
        const x = state.event.clientX;
        const y = state.event.clientY;

        // Start long press timer for right-click (only when not zoomed)
        if (transform.scale === 1) {
          longPressTimer.current = setTimeout(() => {
            const videoPos = screenToVideo(x, y);
            onInput({ type: 'rightclick', ...videoPos });
            longPressTimer.current = null;
          }, LONG_PRESS_MS);
        }
      },

      onPointerUp: (state) => {
        const x = state.event.clientX;
        const y = state.event.clientY;
        const tap = state.tap;

        clearLongPress();

        // Handle tap
        if (tap || tap === undefined) {
          const now = Date.now();

          // Check for double tap - always allow for zoom toggle
          if (
            now - lastTapTime.current < DOUBLE_TAP_MS &&
            Math.abs(x - lastTapPos.current.x) < DOUBLE_TAP_DISTANCE &&
            Math.abs(y - lastTapPos.current.y) < DOUBLE_TAP_DISTANCE
          ) {
            const videoPos = screenToVideo(x, y);
            onInput({ type: 'doubleclick', ...videoPos });
            setTransform((prev) =>
              prev.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }
            );
            lastTapTime.current = 0;
          } else if (transform.scale === 1) {
            // Single tap - click (only when not zoomed)
            const videoPos = screenToVideo(x, y);
            onInput({ type: 'click', ...videoPos });
            lastTapTime.current = now;
            lastTapPos.current = { x, y };
          } else {
            // When zoomed, track tap position for potential double-tap to zoom out
            lastTapTime.current = now;
            lastTapPos.current = { x, y };
          }
        }
      },

      onDrag: (state) => {
        const movement = state.movement ?? [0, 0];
        const [mx, my] = movement;
        const xy = state.xy ?? [0, 0];
        const [x, y] = xy;
        const { first, memo } = state;

        clearLongPress();

        if (transform.scale > 1) {
          // Pan when zoomed
          const maxPan = getMaxPan();
          const startTransform = first ? { x: transform.x, y: transform.y } : (memo ?? { x: transform.x, y: transform.y });

          setTransform((prev) => ({
            ...prev,
            x: Math.min(Math.max(startTransform.x + mx, -maxPan.x), maxPan.x),
            y: Math.min(Math.max(startTransform.y + my, -maxPan.y), maxPan.y),
          }));

          return startTransform;
        } else {
          // Send mouse move events when not zoomed
          const videoPos = screenToVideo(x, y);
          onInput({ type: 'move', ...videoPos });
        }
      },

      onPinch: (state) => {
        const offset = state.offset ?? [1, 0];
        const [scale] = offset;
        const { first, memo } = state;

        clearLongPress();

        const newScale = Math.min(Math.max(scale, 1), MAX_ZOOM);

        if (first) {
          return { x: transform.x, y: transform.y };
        }

        setTransform((prev) => ({
          scale: newScale,
          x: newScale === 1 ? 0 : memo?.x ?? prev.x,
          y: newScale === 1 ? 0 : memo?.y ?? prev.y,
        }));

        return memo;
      },

      onWheel: (state) => {
        const delta = state.delta ?? [0, 0];
        const [, dy] = delta;
        const xy = state.xy ?? [0, 0];
        const [x, y] = xy;

        if (transform.scale === 1) {
          const videoPos = screenToVideo(x, y);
          onInput({ type: 'scroll', ...videoPos, deltaY: dy });
        }
      },
    },
    {
      target: overlayRef,
      eventOptions: { passive: false },
      drag: {
        filterTaps: true,
        threshold: 5,
      },
      pinch: {
        scaleBounds: { min: 1, max: MAX_ZOOM },
        rubberband: true,
      },
    }
  );

  return (
    <>
      {/* Touch capture layer */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-20 touch-none"
        style={{ paddingBottom: 'calc(2.75rem + env(safe-area-inset-bottom))' }}
      />

      {/* Zoom indicator */}
      {transform.scale > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 rounded-md bg-black/70 border border-white/[0.1] text-[11px] text-white font-medium">
          {Math.round(transform.scale * 100)}%
        </div>
      )}
    </>
  );
}
