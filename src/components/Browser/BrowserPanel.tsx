import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { NavigationBar } from './NavigationBar';
import { BrowserContent } from './BrowserContent';
import { useWebview } from './useWebview';
import { useNavigation } from './useNavigation';

interface BrowserPanelProps {
  tab: any; // Workspace tab
}

export function BrowserPanel({ tab }: BrowserPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialUrl = tab.url || 'about:blank';

  const { webviewRef, currentUrlRef } = useWebview({
    tabId: tab.id,
    initialUrl,
    containerRef,
    setIsLoading,
    setError,
  });

  const { handleNavigate, handleRefresh, handleGoBack, handleGoForward, handleHome } = useNavigation({
    webviewRef,
    currentUrlRef,
    containerRef,
    tabId: tab.id,
    setIsLoading,
    setError,
  });

  const handleRetry = () => {
    handleNavigate(currentUrlRef.current || initialUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Navigation bar */}
      <NavigationBar
        url={currentUrlRef.current || initialUrl}
        isLoading={isLoading}
        canGoBack={false} // TODO: Track history
        canGoForward={false} // TODO: Track history
        onNavigate={handleNavigate}
        onRefresh={handleRefresh}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onHome={handleHome}
      />

      {/* Browser content area */}
      <BrowserContent
        ref={containerRef}
        currentUrl={currentUrlRef.current}
        isLoading={isLoading}
        error={error}
        onNavigate={handleNavigate}
        onRetry={handleRetry}
      />

      {/* Status bar */}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/70 border-t border-border/50 flex items-center justify-between">
        <span>Native Tauri webview</span>
        {currentUrlRef.current && (
          <span className="font-mono truncate max-w-[200px]">{currentUrlRef.current}</span>
        )}
      </div>
    </motion.div>
  );
}
