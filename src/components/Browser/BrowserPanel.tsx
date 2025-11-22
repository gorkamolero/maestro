import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useWebview } from './useWebview';
import { BrowserToolbar } from './BrowserToolbar';

interface BrowserPanelProps {
  tab: any; // Workspace tab
}

export function BrowserPanel({ tab }: BrowserPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialUrl = tab.url || 'about:blank';

  const { webviewLabelRef, currentUrlRef } = useWebview({
    tabId: tab.id,
    initialUrl,
    containerRef,
    setIsLoading,
    setError,
  });

  const handleNavigate = async (url: string) => {
    if (!webviewLabelRef.current || !containerRef.current) {
      console.error('Cannot navigate: missing webview label or container ref');
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    console.log('Navigating to:', url, 'with rect:', rect);

    try {
      setIsLoading(true);
      await invoke('navigate_webview', {
        window: getCurrentWindow(),
        label: webviewLabelRef.current,
        url,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
      currentUrlRef.current = url;
      setError(null);
      console.log('Navigation successful');
    } catch (err) {
      console.error('Navigation error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    handleNavigate(currentUrlRef.current || initialUrl);
  };

  const handleGoBack = () => {
    console.warn('Back navigation not yet implemented - requires history tracking');
  };

  const handleGoForward = () => {
    console.warn('Forward navigation not yet implemented - requires history tracking');
  };

  const handleHome = () => {
    handleNavigate('https://www.google.com');
  };

  const handleRetry = () => {
    handleNavigate(currentUrlRef.current || initialUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Toolbar with URL bar */}
      <BrowserToolbar
        url={currentUrlRef.current || initialUrl}
        onNavigate={handleNavigate}
        onBack={handleGoBack}
        onForward={handleGoForward}
        onReload={handleRefresh}
        onHome={handleHome}
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
        <span>Native Tauri child webview • {currentUrlRef.current}</span>
      </div>
    </motion.div>
  );
}
