import { useEffect, useRef, useState } from 'react';
import { BrowserTab as BrowserTabType } from '@/types';
import { NavigationBar } from './NavigationBar';
import { BrowserContent } from './BrowserContent';
import { useWebview } from './useWebview';
import { useNavigation } from './useNavigation';

interface BrowserTabProps {
  tab: BrowserTabType;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
}

export function BrowserTab({ tab, onUrlChange, onTitleChange }: BrowserTabProps) {
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { webviewRef, currentUrlRef, isLoading, setIsLoading, error, setError } = useWebview({
    tabId: tab.id,
    initialUrl: tab.url,
    containerRef,
  });

  const { handleNavigate, handleRefresh, handleGoBack, handleGoForward, handleHome } = useNavigation({
    webviewRef,
    currentUrlRef,
    containerRef,
    tabId: tab.id,
    setIsLoading,
    setError,
    onUrlChange,
  });

  useEffect(() => {
    onUrlChange(tab.url);
  }, [tab.url, onUrlChange]);

  const handleRetry = () => {
    handleNavigate(currentUrlRef.current || tab.url);
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Navigation bar */}
      <NavigationBar
        url={tab.url}
        isLoading={isLoading}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
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
    </div>
  );
}
