import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Monitor, RefreshCw } from 'lucide-react';
import { RemoteViewer } from '../components/remote-view/RemoteViewer';
import { useWebSocket } from '../hooks/useWebSocket';

interface Browser {
  id: string;
  label: string;
  url: string;
  title: string;
  bounds: { width: number; height: number };
}

// Mock data for UI testing
const MOCK_BROWSERS: Browser[] = [
  { id: '1', label: 'GitHub', url: 'https://github.com', title: 'GitHub - Where the world builds software', bounds: { width: 1200, height: 800 } },
  { id: '2', label: 'Google', url: 'https://google.com', title: 'Google Search', bounds: { width: 1200, height: 800 } },
  { id: '3', label: 'Vercel', url: 'https://vercel.com/dashboard', title: 'Dashboard - Vercel', bounds: { width: 1200, height: 800 } },
];

export function RemoteView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected: realIsConnected, send, on } = useWebSocket();

  // Debug mode: ?debug=empty|list|viewer
  const debugMode = searchParams.get('debug');
  const isConnected = debugMode ? true : realIsConnected;

  const [browsers, setBrowsers] = useState<Browser[]>(debugMode === 'list' ? MOCK_BROWSERS : []);
  const [selectedBrowser, setSelectedBrowser] = useState<Browser | null>(
    debugMode === 'viewer' ? MOCK_BROWSERS[0] : null
  );
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(debugMode ? false : true);

  // Listen for browser list response
  useEffect(() => {
    console.log('[RemoteView] Setting up remote-view:list listener');
    const unsub = on('remote-view:list', (msg) => {
      console.log('[RemoteView] Received remote-view:list:', msg);
      const { browsers } = msg.payload as { browsers: Browser[] };
      setBrowsers(browsers || []);
      setLoading(false);
    });

    return unsub;
  }, [on]);

  // When WebSocket connects (receives 'connected' message), fetch browsers
  useEffect(() => {
    const unsub = on('connected', () => {
      console.log('[RemoteView] WebSocket connected, fetching browsers');
      setLoading(true);
      send('remote-view:list', {});
    });

    return unsub;
  }, [on, send]);

  // Fetch browsers when connected
  useEffect(() => {
    if (isConnected) {
      console.log('[RemoteView] Already connected, fetching browsers');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      send('remote-view:list', {});
    }
  }, [isConnected, send]);

  // Listen for view started confirmation
  useEffect(() => {
    const unsub = on('remote-view:started', (msg) => {
      const { bounds } = msg.payload as { bounds: { width: number; height: number } };
      // Update bounds if needed
      if (selectedBrowser) {
        setSelectedBrowser({ ...selectedBrowser, bounds });
      }
    });
    
    return unsub;
  }, [on, selectedBrowser]);

  // Refresh browsers (for manual refresh button)
  const fetchBrowsers = useCallback(() => {
    if (isConnected) {
      setLoading(true);
      send('remote-view:list', {});
    }
  }, [isConnected, send]);

  // Start viewing a browser
  const handleSelect = (browser: Browser) => {
    setSelectedBrowser(browser);
    send('remote-view:start', {
      browserId: browser.id,
      quality
    });
  };

  // If viewing, show the viewer
  if (selectedBrowser) {
    return (
      <div className="h-full bg-black">
        <RemoteViewer
          browserId={selectedBrowser.id}
          bounds={selectedBrowser.bounds}
          quality={quality}
          onQualityChange={setQuality}
          onDisconnect={() => setSelectedBrowser(null)}
        />
      </div>
    );
  }

  // Browser selection UI
  return (
    <div className="h-full bg-surface-primary text-content-primary overflow-y-auto">
      {/* Header - matches app's sticky header pattern */}
      <header className="sticky top-0 z-10 bg-surface-primary/95 backdrop-blur-md border-b border-white/[0.04] px-3 h-9 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:opacity-60">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-[11px] font-medium text-content-secondary uppercase tracking-wider">Remote View</span>
        </div>
        <button
          onClick={fetchBrowsers}
          disabled={loading}
          className="p-1.5 active:opacity-60 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 text-content-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="p-4">
        {!isConnected ? (
          /* Connecting state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-white/[0.06] flex items-center justify-center mb-4">
              <div className="w-6 h-6 border-2 border-content-tertiary border-t-amber-400 rounded-full animate-spin" />
            </div>
            <p className="text-content-secondary font-medium">Connecting to Maestro...</p>
          </div>
        ) : loading ? (
          /* Loading skeleton cards */
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[72px] bg-surface-card border border-white/[0.06] rounded-card animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : browsers.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-white/[0.06] flex items-center justify-center mb-4">
              <Monitor className="w-8 h-8 text-content-tertiary" />
            </div>
            <p className="text-content-secondary font-medium">No browser tabs open</p>
            <p className="text-content-tertiary text-[12px] mt-1 text-center px-8">
              Open a browser in Maestro to view it here
            </p>
          </div>
        ) : (
          /* Browser list */
          <div className="space-y-2">
            {browsers.map((browser, index) => (
              <button
                key={browser.id}
                onClick={() => handleSelect(browser)}
                className="w-full p-3 bg-surface-card border border-white/[0.06] rounded-card text-left transition-all active:scale-[0.98] animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-hover rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {browser.title || 'Untitled'}
                    </div>
                    <div className="text-[12px] text-content-tertiary truncate">
                      {browser.url}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-content-tertiary rotate-180" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
