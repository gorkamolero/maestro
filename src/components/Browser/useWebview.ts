import { useEffect, useRef, useState } from 'react';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';

interface UseWebviewOptions {
  tabId: string;
  initialUrl: string;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useWebview({ tabId, initialUrl, containerRef }: UseWebviewOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webviewRef = useRef<Webview | null>(null);
  const currentUrlRef = useRef<string>(initialUrl);

  // Create webview ONCE per tab.id
  useEffect(() => {
    let webview: Webview | null = null;
    let mounted = true;
    let unlistenCreated: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const createWebview = async () => {
      if (!containerRef.current || !mounted) return;

      const rect = containerRef.current.getBoundingClientRect();
      const window = getCurrentWindow();

      try {
        setError(null);
        setIsLoading(true);

        // Create native Tauri webview
        const label = `browser-${tabId}`;
        webview = new Webview(window, label, {
          url: initialUrl || 'about:blank',
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          transparent: false,
          devtools: true,
        });

        // Wait for webview to be created
        await new Promise<void>((resolve, reject) => {
          if (!webview) {
            reject(new Error('Webview is null'));
            return;
          }

          webview.once('tauri://created', () => {
            if (mounted) {
              webviewRef.current = webview;
              currentUrlRef.current = initialUrl;
              setIsLoading(false);
              setError(null);
              resolve();
            }
          }).then((unlisten) => {
            unlistenCreated = unlisten;
          });

          webview.once('tauri://error', (event) => {
            console.error('Failed to create webview:', event);
            if (mounted) {
              setIsLoading(false);
              setError('Failed to create browser view. Please try again.');
            }
            reject(event);
          }).then((unlisten) => {
            unlistenError = unlisten;
          });
        });
      } catch (error) {
        console.error('Failed to create webview:', error);
        if (mounted) {
          setIsLoading(false);
          setError(error instanceof Error ? error.message : 'Failed to create browser view');
        }
      }
    };

    createWebview();

    // Cleanup webview on unmount
    return () => {
      mounted = false;
      if (unlistenCreated) unlistenCreated();
      if (unlistenError) unlistenError();
      if (webview) {
        webview.close().catch((err) => {
          console.error('Error closing webview:', err);
        });
      }
    };
  }, [tabId]); // Only recreate if tab.id changes

  // Update webview position when container resizes
  useEffect(() => {
    if (!containerRef.current || !webviewRef.current) return;

    let rafId: number | null = null;
    let lastUpdate = 0;
    const throttleMs = 16; // ~60fps

    const updatePosition = () => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) {
        rafId = requestAnimationFrame(updatePosition);
        return;
      }
      lastUpdate = now;

      if (!containerRef.current || !webviewRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      webviewRef.current
        .setPosition(new LogicalPosition(Math.round(rect.x), Math.round(rect.y)))
        .catch(console.error);
      webviewRef.current
        .setSize(new LogicalSize(Math.round(rect.width), Math.round(rect.height)))
        .catch(console.error);
    };

    const debouncedUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('scroll', debouncedUpdate, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', debouncedUpdate);
    };
  }, []);

  return {
    webviewRef,
    currentUrlRef,
    isLoading,
    setIsLoading,
    error,
    setError,
  };
}
