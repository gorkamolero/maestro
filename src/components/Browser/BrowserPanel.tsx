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
    if (!webviewLabelRef.current || !containerRef.current) return;

    try {
      setIsLoading(true);

      // Ensure we have valid dimensions
      let rect = containerRef.current.getBoundingClientRect();
      if (rect.height === 0) {
        console.warn('Container has 0 height, waiting for layout...');
        await new Promise(resolve => setTimeout(resolve, 50));
        rect = containerRef.current.getBoundingClientRect();
      }

      // console.log('Container rect:', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });

      // FIX: Invert Y coordinate for macOS bottom-left origin
      const window = getCurrentWindow();
      const windowSize = await window.innerSize();
      const correctedY = windowSize.height - rect.y - rect.height;

      await invoke('navigate_webview', {
        window,
        label: webviewLabelRef.current,
        url,
        x: rect.x,
        y: correctedY,
        width: rect.width,
        height: rect.height,
      });
      currentUrlRef.current = url;
      setError(null);
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
      <div ref={containerRef} className="flex-1 relative bg-background border-4 border-red-500">
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
