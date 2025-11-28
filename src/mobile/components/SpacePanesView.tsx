import { useRef, useState, useCallback, useEffect } from 'react';
import { SpaceCard } from './SpaceCard';
import type { SpaceInfo, SpaceDetail } from '@shared/types';
import { api } from '../lib/api';

interface SpacePanesViewProps {
  spaces: SpaceInfo[];
  onTaskToggle?: (spaceId: string, taskId: string, completed: boolean) => void;
}

// Spine width for collapsed panes
const SPINE_WIDTH = 44;
// Active pane takes rest of viewport
const PANE_MIN_WIDTH = 280;

export function SpacePanesView({ spaces, onTaskToggle }: SpacePanesViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spaceDetails, setSpaceDetails] = useState<Record<string, SpaceDetail>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch full space details when a space becomes active
  useEffect(() => {
    const activeSpace = spaces[activeIndex];
    if (!activeSpace || spaceDetails[activeSpace.id]) return;

    api.get<SpaceDetail>(`/api/spaces/${activeSpace.id}`)
      .then((data) => {
        setSpaceDetails((prev) => ({ ...prev, [activeSpace.id]: data }));
      });
  }, [activeIndex, spaces, spaceDetails]);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.touches[0].clientX - touchStart;
    setTouchDelta(delta);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const threshold = 50;
    if (touchDelta > threshold && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    } else if (touchDelta < -threshold && activeIndex < spaces.length - 1) {
      setActiveIndex(activeIndex + 1);
    }

    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [isDragging, touchDelta, activeIndex, spaces.length]);

  // Handle spine click to jump to pane
  const handleSpineClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  if (spaces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-content-tertiary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-card flex items-center justify-center text-2xl">
            📁
          </div>
          <p className="font-medium">No spaces</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full flex overflow-hidden touch-pan-y relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${spaces[activeIndex]?.color || '#ffffff'}15, transparent 50%)`,
        }}
      />

      {spaces.map((space, index) => {
        const isActive = index === activeIndex;
        const isBefore = index < activeIndex;
        const detail = spaceDetails[space.id];

        // Calculate position
        const leftOffset = isBefore
          ? index * SPINE_WIDTH
          : isActive
          ? activeIndex * SPINE_WIDTH
          : (activeIndex * SPINE_WIDTH) + (window.innerWidth - activeIndex * SPINE_WIDTH);

        // Apply drag offset to active pane
        const dragOffset = isActive && isDragging ? touchDelta : 0;

        return (
          <div
            key={space.id}
            className={`absolute inset-y-0 transition-all duration-300 ease-out ${
              isDragging ? 'transition-none' : ''
            }`}
            style={{
              left: leftOffset + dragOffset,
              width: isActive ? `calc(100% - ${activeIndex * SPINE_WIDTH}px)` : SPINE_WIDTH,
              minWidth: isActive ? PANE_MIN_WIDTH : SPINE_WIDTH,
              zIndex: index,
            }}
          >
            {isActive ? (
              // Full pane view
              <div className="h-full p-2 pr-4 animate-fade-in">
                <SpaceCard
                  space={space}
                  variant="pane"
                  tabs={detail?.tabs}
                  onTaskToggle={(taskId, completed) => onTaskToggle?.(space.id, taskId, completed)}
                />
              </div>
            ) : (
              // Spine view - collapsed
              <SpineView
                space={space}
                onClick={() => handleSpineClick(index)}
                isLeft={isBefore}
                index={index}
              />
            )}
          </div>
        );
      })}

      {/* Pagination dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50 bg-surface-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-white/[0.06]">
        {spaces.map((space, index) => (
          <button
            key={space.id}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'w-6' : 'w-2'
            }`}
            style={{
              background: index === activeIndex
                ? space.color || '#ffffff'
                : 'rgba(255,255,255,0.3)',
              boxShadow: index === activeIndex ? `0 0 8px ${space.color}50` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Spine component for collapsed spaces
function SpineView({
  space,
  onClick,
  isLeft,
  index,
}: {
  space: SpaceInfo;
  onClick: () => void;
  isLeft: boolean;
  index: number;
}) {
  const hasActivity = space.agentCount > 0;

  return (
    <button
      onClick={onClick}
      className={`h-full w-full flex flex-col items-center py-5 transition-all duration-200 ${
        isLeft
          ? 'bg-gradient-to-r from-surface-card to-surface-primary'
          : 'bg-gradient-to-l from-surface-elevated to-surface-primary'
      } active:bg-surface-hover border-r border-white/[0.04]`}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Accent line */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] transition-all duration-200"
        style={{
          background: `linear-gradient(180deg, ${space.color}80, ${space.color}20)`,
          boxShadow: hasActivity ? `0 0 8px ${space.color}50` : undefined,
        }}
      />

      {/* Space icon at top */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base mb-3 transition-transform duration-200 hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${space.color || 'rgba(255,255,255,0.1)'}30, ${space.color || 'rgba(255,255,255,0.1)'}10)`,
          boxShadow: hasActivity ? `0 0 12px ${space.color}30` : '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {space.icon || '📁'}
      </div>

      {/* Vertical text label */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden px-1"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        <span className="text-[11px] font-semibold text-content-secondary truncate max-h-[100px] tracking-wide">
          {space.name}
        </span>
      </div>

      {/* Activity indicator */}
      {hasActivity && (
        <div className="mt-3">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: space.color || '#10b981' }}
            />
            <span
              className="relative inline-flex rounded-full h-full w-full"
              style={{
                background: space.color || '#10b981',
                boxShadow: `0 0 8px ${space.color || '#10b981'}60`,
              }}
            />
          </span>
        </div>
      )}

      {/* Tab count badge */}
      <div
        className="mt-3 text-[9px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        {space.tabCount}
      </div>
    </button>
  );
}

// Alternative: Simple horizontal scroll view (cards side by side)
export function SpaceCarouselView({ spaces }: { spaces: SpaceInfo[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Handle scroll to update active index
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.offsetWidth * 0.85;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(newIndex, spaces.length - 1)));
  }, [spaces.length]);

  return (
    <div className="h-full flex flex-col relative">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${spaces[activeIndex]?.color || '#ffffff'}20, transparent 60%)`,
        }}
      />

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 py-3 scrollbar-hide relative"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {spaces.map((space, index) => (
          <div
            key={space.id}
            className="flex-shrink-0 w-[85%] snap-center animate-scale-in"
            style={{
              scrollSnapAlign: 'center',
              animationDelay: `${index * 80}ms`,
            }}
          >
            <SpaceCard space={space} variant="pane" />
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 py-4 relative">
        <div className="flex gap-2 bg-surface-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-white/[0.06]">
          {spaces.map((space, index) => (
            <span
              key={space.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-6' : 'w-2'
              }`}
              style={{
                background: index === activeIndex
                  ? space.color || '#ffffff'
                  : 'rgba(255,255,255,0.3)',
                boxShadow: index === activeIndex ? `0 0 8px ${space.color}50` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
