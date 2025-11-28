import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { TabBar } from '../components/TabBar';
import { TabContent } from '../components/TabContent';
import { SpaceActions } from '../components/SpaceActions';
import type { SpaceDetail as SpaceDetailType, TabInfo } from '@shared/types';

export function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<SpaceDetailType | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const { isConnected, subscribe, on } = useWebSocket();

  // Fetch space
  useEffect(() => {
    if (!id) return;
    
    api.get<SpaceDetailType>(`/api/spaces/${id}`)
      .then(data => {
        setSpace(data);
        setActiveTabId(data.tabs[0]?.id || null);
        setIsLoading(false);
      });
  }, [id]);

  // Subscribe to updates
  useEffect(() => {
    if (!isConnected || !id) return;
    subscribe('space', id);

    const off = on('space:tab-updated', (msg) => {
      const { spaceId, tab } = msg.payload as { spaceId: string; tab: TabInfo };
      if (spaceId === id) {
        setSpace(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tabs: prev.tabs.map(t => t.id === tab.id ? tab : t),
          };
        });
      }
    });

    return off;
  }, [isConnected, id, subscribe, on]);

  // Swipe navigation
  const tabIndex = space?.tabs.findIndex(t => t.id === activeTabId) ?? -1;
  
  useSwipeNavigation({
    onSwipeLeft: () => {
      if (space && tabIndex >= 0 && tabIndex < space.tabs.length - 1) {
        setActiveTabId(space.tabs[tabIndex + 1].id);
      }
    },
    onSwipeRight: () => {
      if (space && tabIndex > 0) {
        setActiveTabId(space.tabs[tabIndex - 1].id);
      }
    },
  });

  const activeTab = space?.tabs.find(t => t.id === activeTabId);

  if (isLoading || !space) {
    return <LoadingState />;
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex-none border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{space.name}</h1>
          </div>
          <button
            onClick={() => setShowActions(true)}
            className="p-2 -mr-2"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        {space.tabs.length > 0 && (
          <TabBar
            tabs={space.tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
          />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {space.tabs.length === 0 ? (
          <EmptySpaceState onAddTab={() => setShowActions(true)} />
        ) : activeTab ? (
          <TabContent tab={activeTab} spaceId={space.id} />
        ) : null}
      </main>

      {/* Actions Bottom Sheet */}
      <SpaceActions
        open={showActions}
        onClose={() => setShowActions(false)}
        spaceId={space.id}
        spaceName={space.name}
      />
    </div>
  );
}

function EmptySpaceState({ onAddTab }: { onAddTab: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-4">📭</div>
      <p className="text-white/50 text-center mb-4">This space is empty</p>
      <button
        onClick={onAddTab}
        className="px-4 py-2 bg-white/10 rounded-lg text-sm"
      >
        Add Tab
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="animate-pulse text-white/50">Loading space...</div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
