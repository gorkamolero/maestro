import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { SpaceCard } from '../components/SpaceCard';
import { SpacePanesView, SpaceCarouselView } from '../components/SpacePanesView';
import type { SpaceInfo, SpaceDetail } from '@shared/types';

type ViewMode = 'grid' | 'list' | 'panes' | 'carousel';

export function SpaceList() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [spaceDetails, setSpaceDetails] = useState<Record<string, SpaceDetail>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isConnected, subscribe, on } = useWebSocket();

  // Fetch spaces
  useEffect(() => {
    api.get<{ spaces: SpaceInfo[] }>('/api/spaces')
      .then(({ spaces }) => {
        setSpaces(spaces);
        setIsLoading(false);
      });
  }, []);

  // Subscribe to space updates
  useEffect(() => {
    if (!isConnected) return;
    subscribe('spaces');

    const off = on('space:updated', (msg) => {
      const updated = msg.payload as SpaceInfo;
      setSpaces(prev => prev.map(s => s.id === updated.id ? updated : s));
    });

    return off;
  }, [isConnected, subscribe, on]);

  // Fetch space details for grid view (to get tabs)
  useEffect(() => {
    if (viewMode !== 'grid' && viewMode !== 'list') return;

    spaces.forEach((space) => {
      if (!spaceDetails[space.id]) {
        api.get<SpaceDetail>(`/api/spaces/${space.id}`)
          .then((data) => {
            setSpaceDetails((prev) => ({ ...prev, [space.id]: data }));
          });
      }
    });
  }, [spaces, viewMode, spaceDetails]);

  // Handle task toggle
  const handleTaskToggle = useCallback((spaceId: string, taskId: string, completed: boolean) => {
    // Optimistic update
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id !== spaceId || !s.tasks) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t)),
        };
      })
    );

    // TODO: Send to API
    api.post(`/api/spaces/${spaceId}/tasks/${taskId}`, { completed });
  }, []);

  // Sort: active agents first, then by last accessed
  const sortedSpaces = [...spaces].sort((a, b) => {
    // Spaces with active agents first
    if (a.agentCount > 0 && b.agentCount === 0) return -1;
    if (b.agentCount > 0 && a.agentCount === 0) return 1;
    // Then by last accessed
    return new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime();
  });

  // Filter to only active spaces
  const activeSpaces = sortedSpaces.filter((s) => s.isActive !== false);

  return (
    <div className="min-h-screen bg-surface-primary text-content-primary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-primary/90 backdrop-blur-lg border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title font-semibold">Spaces</h1>
          <div className="flex items-center gap-3">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            <ConnectionIndicator connected={isConnected} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {isLoading ? (
          <LoadingState viewMode={viewMode} />
        ) : spaces.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'panes' ? (
          <SpacePanesView
            spaces={activeSpaces}
            onTaskToggle={handleTaskToggle}
          />
        ) : viewMode === 'carousel' ? (
          <SpaceCarouselView spaces={activeSpaces} />
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 gap-3">
            {activeSpaces.map((space, index) => (
              <SpaceCard
                key={space.id}
                space={space}
                variant="grid"
                tabs={spaceDetails[space.id]?.tabs}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {activeSpaces.map((space, index) => (
              <SpaceCard key={space.id} space={space} variant="list" index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex bg-surface-card rounded-lg p-0.5 border border-white/[0.06]">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'grid'
            ? 'bg-surface-hover text-content-primary'
            : 'text-content-tertiary'
        }`}
        title="Cards"
      >
        <GridIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'list'
            ? 'bg-surface-hover text-content-primary'
            : 'text-content-tertiary'
        }`}
        title="List"
      >
        <ListIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('panes')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'panes'
            ? 'bg-surface-hover text-content-primary'
            : 'text-content-tertiary'
        }`}
        title="Panes"
      >
        <PanesIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('carousel')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'carousel'
            ? 'bg-surface-hover text-content-primary'
            : 'text-content-tertiary'
        }`}
        title="Carousel"
      >
        <CarouselIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-surface-card flex items-center justify-center mb-4">
        <FolderIcon className="w-8 h-8 text-content-tertiary" />
      </div>
      <p className="text-content-secondary font-medium">No spaces yet</p>
      <p className="text-content-tertiary text-small mt-1">
        Create spaces in Maestro desktop
      </p>
    </div>
  );
}

function LoadingState({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'panes' || viewMode === 'carousel') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-content-tertiary">Loading spaces...</div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : 'space-y-3'}`}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`bg-surface-card rounded-card animate-pulse ${
            viewMode === 'grid' ? 'h-40' : 'h-16'
          }`}
        />
      ))}
    </div>
  );
}

// Icons
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PanesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="11" height="18" rx="1" />
    </svg>
  );
}

function CarouselIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="6" y="4" width="12" height="16" rx="1" />
      <path d="M2 8v8M22 8v8" strokeLinecap="round" />
    </svg>
  );
}
