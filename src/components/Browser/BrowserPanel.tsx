import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { useSnapshot } from 'valtio';
import { useWebview } from './useWebview';
import { BrowserToolbar } from './BrowserToolbar';
import { browserStore, getBrowserState, updateBrowserUrl } from '@/stores/browser.store';
import { normalizeUrl } from './browser.utils';

interface BrowserPanelProps {
  tab: any; // Workspace tab
}

export function BrowserPanel({ tab }: BrowserPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get reactive snapshot of browser state
  const browserSnap = useSnapshot(browserStore);
  const initialUrl = normalizeUrl('https://www.google.com');

  // Initialize browser state for this tab
  getBrowserState(tab.id, initialUrl);

  const currentUrl = browserSnap.browsers[tab.id]?.url || initialUrl;

  const { webviewLabelRef } = useWebview({
    tabId: tab.id,
    initialUrl,
    containerRef,
    setIsLoading,
    setError,
  });

  const handleNavigate = async (url: string) => {
    if (!webviewLabelRef.current) return;

    try {
      setIsLoading(true);

      // Normalize URL first (ensure it has valid scheme)
      const normalizedUrl = normalizeUrl(url);

      await invoke('navigate_webview', {
        label: webviewLabelRef.current,
        url: normalizedUrl,
      });

      // URL will be updated via the navigation event
      setError(null);
    } catch (err) {
      console.error('Navigation error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    handleNavigate(currentUrl);
  };

  const handleGoBack = async () => {
    if (!webviewLabelRef.current) return;
    try {
      const newUrl = await invoke<string>('webview_go_back', { label: webviewLabelRef.current });
      updateBrowserUrl(tab.id, newUrl);
    } catch (err) {
      console.error('Failed to go back:', err);
    }
  };

  const handleGoForward = async () => {
    if (!webviewLabelRef.current) return;
    try {
      const newUrl = await invoke<string>('webview_go_forward', { label: webviewLabelRef.current });
      updateBrowserUrl(tab.id, newUrl);
    } catch (err) {
      console.error('Failed to go forward:', err);
    }
  };

  const handleHome = () => {
    handleNavigate('https://www.google.com');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Toolbar with URL bar */}
      <BrowserToolbar
        url={currentUrl}
        onNavigate={handleNavigate}
        onBack={handleGoBack}
        onForward={handleGoForward}
        onReload={handleRefresh}
        onHome={handleHome}
        canGoBack={true}
        canGoForward={true}
        isLoading={isLoading}
      />

      {/* Browser webview container */}
      <div ref={containerRef} className="flex-1 relative bg-background">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-sm text-muted-foreground">Loading webview...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-6">
            <div className="text-destructive mb-2">⚠️ {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/70 border-t border-border/50">
        <span>Native Tauri child webview • {currentUrl}</span>
      </div>
    </motion.div>
  );
}
