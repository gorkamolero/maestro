import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { SpaceCard } from '../components/SpaceCard';
import type { SpaceInfo } from '@shared/types';

export function SpaceList() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { isConnected, subscribe, on } = useWebSocket();

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

  // Sort: recently accessed first, then by agent activity
  const sortedSpaces = [...spaces].sort((a, b) => {
    // Spaces with active agents first
    if (a.agentCount > 0 && b.agentCount === 0) return -1;
    if (b.agentCount > 0 && a.agentCount === 0) return 1;
    // Then by last accessed
    return new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-surface-primary text-content-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-primary/90 backdrop-blur-lg border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title font-semibold">Spaces</h1>
          <div className="flex items-center gap-3">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <ConnectionIndicator connected={isConnected} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <LoadingGrid />
        ) : spaces.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {sortedSpaces.map(space => (
              <SpaceCard key={space.id} space={space} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSpaces.map(space => (
              <SpaceCard key={space.id} space={space} variant="list" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ViewToggle({ mode, onChange }: { mode: 'grid' | 'list'; onChange: (m: 'grid' | 'list') => void }) {
  return (
    <div className="flex bg-surface-card rounded-lg p-0.5 border border-white/[0.06]">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'grid'
            ? 'bg-surface-hover text-content-primary'
            : 'text-content-tertiary'
        }`}
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
      >
        <ListIcon className="w-4 h-4" />
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

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="aspect-[4/3] bg-surface-card rounded-card animate-pulse" />
      ))}
    </div>
  );
}

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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
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

