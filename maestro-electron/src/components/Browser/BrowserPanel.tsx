import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useSnapshot } from 'valtio';
import { useWebview } from './useWebview';
import { BrowserToolbar } from './BrowserToolbar';
import { browserStore, getBrowserState } from '@/stores/browser.store';
import { normalizeUrl } from './browser.utils';
import type { Tab } from '@/stores/workspace.store';

interface BrowserPanelProps {
  tab: Tab;
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

  // All webview logic and handlers are in the hook
  const {
    canGoBack,
    canGoForward,
    handleNavigate,
    handleGoBack,
    handleGoForward,
    handleRefresh,
    handleHome,
  } = useWebview({
    tabId: tab.id,
    initialUrl,
    containerRef,
    setIsLoading,
    setError,
  });

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
        onReload={() => handleRefresh(currentUrl)}
        onHome={handleHome}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
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
