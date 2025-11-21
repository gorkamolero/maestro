import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BrowserTab as BrowserTabType } from '@/types';
import { normalizeUrl, isNavigableUrl, isSafeUrl } from './browser.utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BrowserTabProps {
  tab: BrowserTabType;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
}

export function BrowserTab({ tab, onUrlChange, onTitleChange }: BrowserTabProps) {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Webview | null>(null);

  useEffect(() => {
    setUrlInput(tab.url);
  }, [tab.url]);

  // Create and manage Tauri webview
  useEffect(() => {
    let webview: Webview | null = null;

    const createWebview = async () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const window = getCurrentWindow();

      try {
        // Create native Tauri webview
        webview = new Webview(window, `browser-${tab.id}`, {
          url: tab.url || 'about:blank',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });

        webviewRef.current = webview;
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to create webview:', error);
        setIsLoading(false);
      }
    };

    createWebview();

    // Cleanup webview on unmount
    return () => {
      if (webview) {
        webview.close().catch(console.error);
      }
    };
  }, [tab.id]);

  // Update webview position when container resizes
  useEffect(() => {
    if (!containerRef.current || !webviewRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current || !webviewRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      webviewRef.current.setPosition({ x: rect.x, y: rect.y }).catch(console.error);
      webviewRef.current.setSize({ width: rect.width, height: rect.height }).catch(console.error);
    };

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const handleNavigate = async (url: string) => {
    const normalizedUrl = normalizeUrl(url);

    if (!isSafeUrl(normalizedUrl)) {
      console.warn('Potentially unsafe URL blocked:', normalizedUrl);
      return;
    }

    setIsLoading(true);
    onUrlChange(normalizedUrl);
    setUrlInput(normalizedUrl);

    // Navigate the webview
    if (webviewRef.current) {
      try {
        await webviewRef.current.navigate(normalizedUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Navigation failed:', error);
        setIsLoading(false);
      }
    }
  };

  const handleUrlSubmit = () => {
    handleNavigate(urlInput);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  const handleRefresh = () => {
    if (webviewRef.current && tab.url) {
      handleNavigate(tab.url);
    }
  };

  const handleGoBack = () => {
    // Note: Tauri webview doesn't expose history navigation directly
    // This would need to be tracked manually or via webview events
    console.warn('Back navigation not yet implemented for native webview');
  };

  const handleGoForward = () => {
    // Note: Tauri webview doesn't expose history navigation directly
    console.warn('Forward navigation not yet implemented for native webview');
  };

  const handleHome = () => {
    handleNavigate('https://www.google.com');
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Navigation bar */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleGoBack}
            disabled={!canGoBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleGoForward}
            disabled={!canGoForward}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRefresh}
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleHome}
          >
            <Home className="w-4 h-4" />
          </Button>
        </div>

        {/* URL bar */}
        <div className="flex-1">
          <Input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL or search..."
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Browser content area - Native Tauri webview will be positioned here */}
      <div ref={containerRef} className="flex-1 relative bg-background">
        {!isNavigableUrl(tab.url) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center p-8"
          >
            <Home className="w-12 h-12 mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium mb-2">New Tab</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a URL or search query in the bar above
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Try:</span>
              <button
                onClick={() => handleNavigate('https://github.com')}
                className="underline hover:text-foreground"
              >
                GitHub
              </button>
              <span>•</span>
              <button
                onClick={() => handleNavigate('https://google.com')}
                className="underline hover:text-foreground"
              >
                Google
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 flex items-center justify-center z-50"
          >
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Info about native webview */}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/70 border-t border-border/50">
        Native Tauri webview - Full browser capabilities with profile isolation
      </div>
    </div>
  );
}
