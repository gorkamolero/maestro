import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useWebview } from './useWebview';

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

  // TODO: Re-implement navigation
  const handleNavigate = () => console.log('Navigate not yet implemented');
  const handleRefresh = () => console.log('Refresh not yet implemented');
  const handleGoBack = () => console.log('Back not yet implemented');
  const handleGoForward = () => console.log('Forward not yet implemented');
  const handleHome = () => console.log('Home not yet implemented');

  const handleRetry = () => {
    handleNavigate(currentUrlRef.current || initialUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
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
