import { useRef, useState, useCallback, useEffect } from 'react';
import { SpaceContent } from './SpaceCard';
import type { SpaceInfo, SpaceDetail } from '@shared/types';
import { api } from '../lib/api';

interface SpacePanesViewProps {
  spaces: SpaceInfo[];
  onTaskToggle?: (spaceId: string, taskId: string, completed: boolean) => void;
}

// Vertical pane configuration - matching desktop proportions rotated 90°
const SPINE_HEIGHT = 36; // Compact horizontal spine (matches status bar height)
const PANE_HEIGHT = 500; // Height of each pane (creates enough content for scrolling)

/**
 * SpacePanesView - Vertical stacking panes for mobile
 *
 * Direct port of desktop's horizontal Andy Matuschak pattern, rotated 90°:
 * - Desktop: horizontal scroll, spines on LEFT, stack left-to-right
 * - Mobile: vertical scroll, spines on TOP, stack top-to-bottom
 *
 * Key mechanics:
 * 1. Container has fixed height (from parent) with overflow-y-auto
 * 2. Each pane has minHeight creating total height > viewport (enables scroll)
 * 3. Each pane is position:sticky with top: index * SPINE_HEIGHT
 * 4. As you scroll down, panes stick and spines stack at top
 */
export function SpacePanesView({ spaces, onTaskToggle }: SpacePanesViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [spaceDetails, setSpaceDetails] = useState<Record<string, SpaceDetail>>({});
  const [focusedSpaceId, setFocusedSpaceId] = useState<string | null>(spaces[0]?.id || null);

  // Fetch space details when focused
  useEffect(() => {
    if (!focusedSpaceId || spaceDetails[focusedSpaceId]) return;

    api.get<SpaceDetail>(`/api/spaces/${focusedSpaceId}`).then((data) => {
      setSpaceDetails((prev) => ({ ...prev, [focusedSpaceId]: data }));
    });
  }, [focusedSpaceId, spaceDetails]);

  const handlePaneClick = useCallback((spaceId: string, index: number) => {
    setFocusedSpaceId(spaceId);
    // Scroll to position this pane's content visible (accounting for stacked spines above)
    if (containerRef.current) {
      const scrollTop = index * (PANE_HEIGHT - SPINE_HEIGHT);
      containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
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

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overflow-x-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Flex column container - panes are children */}
      <div className="flex flex-col">
        {spaces.map((space, index) => (
          <SpacePane
            key={space.id}
            space={space}
            detail={spaceDetails[space.id]}
            index={index}
            totalPanes={spaces.length}
            isFocused={space.id === focusedSpaceId}
            onClick={() => handlePaneClick(space.id, index)}
            onTaskToggle={onTaskToggle}
          />
        ))}

        {/* Bottom spacer - ensures last pane can scroll up fully */}
        <div
          className="flex-shrink-0"
          style={{ height: `calc(100vh - ${spaces.length * SPINE_HEIGHT}px - 45px)` }}
        />
      </div>
    </div>
  );
}

interface SpacePaneProps {
  space: SpaceInfo;
  detail?: SpaceDetail;
  index: number;
  totalPanes: number;
  isFocused: boolean;
  onClick: () => void;
  onTaskToggle?: (spaceId: string, taskId: string, completed: boolean) => void;
}

/**
 * A single pane with its spine.
 * The entire pane uses position:sticky so it pins to the top as user scrolls,
 * with each subsequent pane stacking below the previous pane's spine.
 */
function SpacePane({
  space,
  detail,
  index,
  totalPanes,
  isFocused,
  onClick,
  onTaskToggle,
}: SpacePaneProps) {
  const accentColor = space.color || '#f59e0b';
  const hasActivity = space.agentCount > 0;

  // Calculate bottom offset for responsive height (like desktop's rightOffset)
  const bottomOffset = (totalPanes - 1 - index) * SPINE_HEIGHT;

  return (
    <div
      className="flex-shrink-0 relative"
      style={{
        position: 'sticky',
        top: index * SPINE_HEIGHT,
        // Fixed height for each pane - creates the scroll content
        minHeight: PANE_HEIGHT,
        // Responsive height that accounts for stacked spines and compact bars
        height: `calc(100vh - ${index * SPINE_HEIGHT}px - ${bottomOffset}px - 45px)`,
        maxHeight: PANE_HEIGHT,
        // Ensure pane has background to cover content below
        background: 'var(--bg-primary)',
        // Z-index: later panes ABOVE earlier ones so their spines appear over content
        zIndex: index + 1,
      }}
    >
      {/* Spine - compact horizontal strip at top */}
      <div
        onClick={onClick}
        className="absolute left-0 right-0 top-0 cursor-pointer select-none transition-all duration-200"
        style={{
          height: SPINE_HEIGHT,
          borderTop: `2px solid ${accentColor}`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 10%, rgb(18, 19, 21)) 0%, rgb(14, 15, 17) 100%)`,
          boxShadow: isFocused ? `inset 0 0 20px ${accentColor}15, 0 1px 4px rgba(0,0,0,0.3)` : '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        {/* Spine content - compact horizontal layout */}
        <div className="absolute inset-0 flex items-center gap-2 px-3 overflow-hidden">
          <span className="text-sm shrink-0">{space.icon || '📁'}</span>
          <span className="flex-1 text-[11px] font-medium text-white/80 truncate uppercase tracking-wider">
            {space.name}
          </span>
          {space.tabCount > 0 && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded tabular-nums bg-white/[0.06] text-white/50">
              {space.tabCount}
            </span>
          )}
          {hasActivity && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                style={{ background: accentColor }}
              />
              <span
                className="relative inline-flex rounded-full h-full w-full"
                style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}80` }}
              />
            </span>
          )}
        </div>
      </div>

      {/* Content area - below spine */}
      <div
        className="absolute left-0 right-0 bottom-0 overflow-hidden flex flex-col"
        style={{
          top: SPINE_HEIGHT,
          background: isFocused
            ? 'linear-gradient(180deg, rgb(22, 23, 25) 0%, rgb(16, 17, 19) 100%)'
            : 'linear-gradient(180deg, rgb(18, 19, 21) 0%, rgb(13, 14, 16) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <SpaceContent
          space={{ ...space, notesContent: detail?.notesContent }}
          tabs={detail?.tabs}
          onTaskToggle={(taskId, completed) => onTaskToggle?.(space.id, taskId, completed)}
        />
      </div>
    </div>
  );
}

