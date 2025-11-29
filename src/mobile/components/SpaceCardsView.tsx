import { useRef, useState, useCallback, useEffect } from 'react';
import { SpaceContent } from './SpaceCard';
import type { SpaceInfo, SpaceDetail } from '@shared/types';
import { api } from '../lib/api';

interface SpaceCardsViewProps {
  spaces: SpaceInfo[];
  onTaskToggle?: (spaceId: string, taskId: string, completed: boolean) => void;
}

/**
 * SpaceCardsView - Horizontal carousel for mobile
 *
 * Mobile adaptation of desktop's horizontal cards view:
 * - Horizontal scroll with snap-to-center behavior
 * - Each card is full-width (minus padding)
 * - Cards are vertically scrollable inside
 * - Swipe between spaces like a carousel
 */
export function SpaceCardsView({ spaces, onTaskToggle }: SpaceCardsViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spaceDetails, setSpaceDetails] = useState<Record<string, SpaceDetail>>({});

  // Fetch details for active space
  useEffect(() => {
    const activeSpace = spaces[activeIndex];
    if (!activeSpace || spaceDetails[activeSpace.id]) return;

    api.get<SpaceDetail>(`/api/spaces/${activeSpace.id}`).then((data) => {
      setSpaceDetails((prev) => ({ ...prev, [activeSpace.id]: data }));
    });
  }, [activeIndex, spaces, spaceDetails]);

  // Handle scroll to detect active card
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(newIndex, spaces.length - 1)));
  }, [spaces.length]);

  // Scroll to a specific card
  const scrollToCard = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
  }, []);

  if (spaces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[--bg-card] flex items-center justify-center text-2xl">
            📁
          </div>
          <p className="text-[--text-secondary] font-medium">No spaces</p>
        </div>
      </div>
    );
  }

  const activeSpace = spaces[activeIndex];
  const accentColor = activeSpace?.color || '#f59e0b';

  return (
    <div className="h-full flex flex-col relative">
      {/* Background glow based on active space */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 transition-all duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accentColor}40, transparent 70%)`,
        }}
      />

      {/* Space header - static, not tappable */}
      <div className="relative px-4 py-2 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-base">{activeSpace?.icon || '📁'}</span>
          <span className="text-[13px] font-semibold text-[--text-primary]">
            {activeSpace?.name}
          </span>
        </div>
        {activeSpace?.agentCount > 0 && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase"
            style={{ background: `${accentColor}20`, color: accentColor }}
          >
            {activeSpace.agentCount} live
          </span>
        )}
      </div>

      {/* Horizontal carousel - min-h-0 allows flex shrinking */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {spaces.map((space) => {
          const detail = spaceDetails[space.id];
          return (
            <div
              key={space.id}
              className="flex-shrink-0 w-full h-full snap-center flex flex-col min-h-0"
              style={{ scrollSnapAlign: 'center' }}
            >
              {/* Full-bleed content */}
              <SpaceContent
                space={{ ...space, notesContent: detail?.notesContent }}
                tabs={detail?.tabs}
                onTaskToggle={(taskId, completed) => onTaskToggle?.(space.id, taskId, completed)}
              />
            </div>
          );
        })}
      </div>

      {/* Page indicators */}
      <div className="relative flex justify-center gap-2 py-3 border-t border-white/[0.04]">
        <div className="flex gap-1.5 bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 rounded-full">
          {spaces.map((space, index) => (
            <button
              key={space.id}
              onClick={() => scrollToCard(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-4' : 'w-1.5'
              }`}
              style={{
                background: index === activeIndex ? space.color || '#ffffff' : 'rgba(255,255,255,0.25)',
                boxShadow: index === activeIndex ? `0 0 8px ${space.color}60` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
