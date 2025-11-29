import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function RemoteView() {
  const navigate = useNavigate();
  const { isConnected, send, on } = useWebSocket();
  
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<Browser | null>(null);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(true);

  // Listen for browser list response
  useEffect(() => {
    const unsub = on('remote-view:list', (msg) => {
      const { browsers } = msg.payload as { browsers: Browser[] };
      setBrowsers(browsers || []);
      setLoading(false);
    });
    
    return unsub;
  }, [on]);

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

  // Fetch browsers
  const fetchBrowsers = useCallback(() => {
    if (isConnected) {
      setLoading(true);
      send('remote-view:list', {});
    }
  }, [isConnected, send]);

  // Fetch on mount and when connected
  useEffect(() => {
    fetchBrowsers();
  }, [fetchBrowsers]);

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
    <div className="min-h-full bg-surface-primary text-content-primary">
      <header className="sticky top-0 bg-surface-primary/90 backdrop-blur border-b border-border-primary z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold">Remote View</h1>
          <div className="flex-1" />
          <button onClick={fetchBrowsers} disabled={loading} className="p-2">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="p-4">
        {!isConnected ? (
          <div className="text-center py-12 text-content-tertiary">
            Connecting to Maestro...
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-content-tertiary">
            Loading browsers...
          </div>
        ) : browsers.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 mx-auto mb-4 text-content-tertiary" />
            <p className="text-content-secondary">No browser tabs open</p>
            <p className="text-content-tertiary text-sm mt-2">
              Open a browser in Maestro to view it here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {browsers.map((browser) => (
              <button
                key={browser.id}
                onClick={() => handleSelect(browser)}
                className="w-full p-4 bg-surface-secondary hover:bg-surface-tertiary active:bg-surface-tertiary rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-tertiary rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-content-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {browser.title || 'Untitled'}
                    </div>
                    <div className="text-sm text-content-tertiary truncate">
                      {browser.url}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
