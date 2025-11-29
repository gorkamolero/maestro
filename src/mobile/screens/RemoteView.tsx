import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Globe, Bookmark, ExternalLink, RefreshCw, X, Monitor } from 'lucide-react';
import { RemoteViewer } from '../components/remote-view/RemoteViewer';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../lib/api';
import type { SpaceInfo, SpaceBookmark } from '@shared/types';

interface ViewingState {
  type: 'browser' | 'shadow';
  id: string;
  url: string;
  spaceId?: string;
  bounds: { width: number; height: number };
}

export function RemoteView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected, send, on } = useWebSocket();

  const debugMode = searchParams.get('debug');

  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [expandedSpaceId, setExpandedSpaceId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ViewingState | null>(null);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(!debugMode);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Fetch spaces with bookmarks
  useEffect(() => {
    if (debugMode) {
      return;
    }

    api.get<{ spaces: SpaceInfo[] }>('/api/spaces')
      .then(({ spaces: spaceList }) => {
        setSpaces(spaceList.filter(s => s.isActive !== false));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debugMode]);

  // Refresh spaces
  const refreshSpaces = useCallback(() => {
    setLoading(true);
    api.get<{ spaces: SpaceInfo[] }>('/api/spaces')
      .then(({ spaces: spaceList }) => {
        setSpaces(spaceList.filter(s => s.isActive !== false));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Listen for shadow browser opened confirmation
  useEffect(() => {
    const unsub = on('shadow-browser:opened', (msg) => {
      const { shadowId, url, bounds } = msg.payload as {
        shadowId: string;
        url: string;
        bounds: { width: number; height: number };
      };
      setViewing({ type: 'shadow', id: shadowId, url, bounds });
    });
    return unsub;
  }, [on]);

  // Listen for errors
  useEffect(() => {
    const unsub = on('shadow-browser:error', (msg) => {
      const { error } = msg.payload as { error: string };
      console.error('[RemoteView] Shadow browser error:', error);
    });
    return unsub;
  }, [on]);

  // Open URL in shadow browser
  const openUrl = useCallback((url: string, spaceId?: string, partition?: string) => {
    if (!isConnected) return;

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `http://${normalizedUrl}`;
    }

    send('shadow-browser:open', {
      url: normalizedUrl,
      spaceId: spaceId || 'default',
      partition,
      quality,
    });
  }, [isConnected, send, quality]);

  // Handle bookmark click
  const handleBookmarkClick = (bookmark: SpaceBookmark, space: SpaceInfo) => {
    openUrl(bookmark.url, space.id);
  };

  // Handle URL input submit
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      openUrl(urlInput);
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    if (viewing?.type === 'shadow') {
      send('shadow-browser:close', {});
    }
    setViewing(null);
  }, [viewing, send]);

  // Lock to landscape when viewing
  useEffect(() => {
    if (viewing) {
      screen.orientation?.lock?.('landscape').catch(() => {});
    }
    return () => {
      screen.orientation?.unlock?.();
    };
  }, [viewing]);

  // If viewing, show the viewer
  if (viewing) {
    return (
      <div className="h-full bg-black">
        <RemoteViewer
          browserId={viewing.id}
          bounds={viewing.bounds}
          quality={quality}
          onQualityChange={setQuality}
          onDisconnect={handleDisconnect}
          isShadowBrowser={viewing.type === 'shadow'}
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-surface-primary text-content-primary overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-primary border-b border-white/[0.08]">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 -ml-1 flex items-center justify-center rounded-lg active:bg-white/[0.06] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-content-secondary" />
            </button>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400" />
              <span className="text-[15px] font-medium">Remote View</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-hover">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'
                }`}
              />
              <span className="text-[10px] font-medium text-content-tertiary uppercase tracking-wider">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                showUrlInput
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'active:bg-white/[0.06] text-content-secondary'
              }`}
            >
              {showUrlInput ? <X className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            </button>
            <button
              onClick={refreshSpaces}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg active:bg-white/[0.06] disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-content-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* URL Input Bar */}
      {showUrlInput && (
        <div className="sticky top-12 z-10 p-3 bg-surface-primary border-b border-white/[0.08]">
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="localhost:3000 or https://..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-surface-hover border border-white/[0.08] rounded-lg text-[14px] placeholder:text-content-tertiary focus:outline-none focus:border-amber-400/50 transition-colors"
              />
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            </div>
            <button
              type="submit"
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg text-[14px] disabled:opacity-40 transition-opacity active:scale-[0.98]"
            >
              Open
            </button>
          </form>
        </div>
      )}

      <main className="p-4 pb-24">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-xl bg-surface-card border border-white/[0.08] flex items-center justify-center mb-4">
              <div className="w-6 h-6 border-2 border-content-tertiary/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
            <p className="text-[14px] font-medium text-content-primary mb-1">Connecting to Maestro</p>
            <p className="text-[12px] text-content-tertiary">Establishing connection...</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-surface-hover animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-xl bg-surface-card border border-white/[0.08] flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-content-tertiary" />
            </div>
            <p className="text-[14px] font-medium text-content-primary mb-1">No Spaces Available</p>
            <p className="text-[12px] text-content-tertiary text-center px-8 mb-4">
              Create spaces with bookmarks in Maestro desktop, or tap the globe icon to open any URL
            </p>
            <button
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-[13px] font-medium active:scale-[0.98] transition-transform"
            >
              <Globe className="w-4 h-4" />
              <span>Open URL</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {spaces.map((space) => {
              const hasBookmarks = space.bookmarks && space.bookmarks.length > 0;
              const isExpanded = expandedSpaceId === space.id;
              const accentColor = space.color || '#f59e0b';

              return (
                <div
                  key={space.id}
                  className="rounded-lg bg-surface-card border border-white/[0.08] overflow-hidden"
                >
                  {/* Space header */}
                  <button
                    onClick={() => setExpandedSpaceId(isExpanded ? null : space.id)}
                    className="w-full p-3 flex items-center gap-3 text-left active:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {space.icon || space.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[14px] truncate">{space.name}</div>
                      <div className="text-[11px] text-content-tertiary">
                        {hasBookmarks ? `${space.bookmarks?.length ?? 0} bookmark${(space.bookmarks?.length ?? 0) !== 1 ? 's' : ''}` : 'No bookmarks'}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-content-tertiary transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Bookmarks list */}
                  {isExpanded && hasBookmarks && space.bookmarks && (
                    <div className="border-t border-white/[0.06]">
                      {space.bookmarks.map((bookmark) => (
                        <button
                          key={bookmark.id}
                          onClick={() => handleBookmarkClick(bookmark, space)}
                          className="w-full px-3 py-2.5 flex items-center gap-3 text-left active:bg-white/[0.04] border-b border-white/[0.04] last:border-b-0 transition-colors"
                        >
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${accentColor}15` }}
                          >
                            <Bookmark className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium truncate">{bookmark.name}</div>
                            <div className="text-[10px] text-content-tertiary truncate">{bookmark.url}</div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-content-tertiary shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Empty bookmarks message */}
                  {isExpanded && !hasBookmarks && (
                    <div className="border-t border-white/[0.06] p-3 text-center">
                      <p className="text-content-tertiary text-[11px]">
                        Add bookmarks to this space in Maestro desktop
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
