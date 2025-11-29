import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { SpaceCardsView } from '../components/SpaceCardsView';
import { SpacePanesView } from '../components/SpacePanesView';
import type { SpaceInfo } from '@shared/types';

// Match desktop view modes: 'cards' and 'panes'
type ViewMode = 'cards' | 'panes';

export function SpaceList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, subscribe, on } = useWebSocket();

  // View mode from URL, default to 'cards' (matching desktop)
  const viewMode = (searchParams.get('view') as ViewMode) || 'cards';
  const setViewMode = useCallback((mode: ViewMode) => {
    setSearchParams({ view: mode }, { replace: true });
  }, [setSearchParams]);

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
    <div className="h-full bg-surface-primary text-content-primary flex flex-col overflow-hidden">
      {/* Header - compact status bar style */}
      <header className="flex-shrink-0 z-10 bg-surface-primary/95 backdrop-blur-md border-b border-white/[0.04] px-3 h-9 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ConnectionIndicator connected={isConnected} />
          <span className="text-[11px] font-medium text-content-secondary uppercase tracking-wider">Spaces</span>
          <span className="text-[10px] text-content-tertiary tabular-nums">{activeSpaces.length}</span>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : spaces.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'cards' ? (
          // Cards view - horizontal carousel (mobile adaptation of desktop cards)
          <SpaceCardsView
            spaces={activeSpaces}
            onTaskToggle={handleTaskToggle}
          />
        ) : (
          // Panes view - vertical stacking (mobile adaptation of desktop panes)
          <SpacePanesView
            spaces={activeSpaces}
            onTaskToggle={handleTaskToggle}
          />
        )}
      </main>
    </div>
  );
}

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex gap-0.5">
      <button
        onClick={() => onChange('cards')}
        className={`p-1 rounded transition-colors ${
          mode === 'cards' ? 'text-content-primary bg-white/[0.06]' : 'text-content-tertiary hover:text-content-secondary'
        }`}
        title="Cards view"
      >
        <CardsIcon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onChange('panes')}
        className={`p-1 rounded transition-colors ${
          mode === 'panes' ? 'text-content-primary bg-white/[0.06]' : 'text-content-tertiary hover:text-content-secondary'
        }`}
        title="Panes view"
      >
        <PanesIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
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

function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-pulse text-content-tertiary text-[11px] uppercase tracking-wider">Loading...</div>
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

function CardsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function PanesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="5" rx="1" />
      <rect x="3" y="10" width="18" height="11" rx="1" />
    </svg>
  );
}
