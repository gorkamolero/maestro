import { useEffect, useRef, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { platform } from '@/lib/platform';
import { updateBrowserNavigation, browserStore } from '@/stores/browser.store';
import { normalizeUrl } from './browser.utils';

// Calculate webview position from container
export function getWebviewPosition(element: HTMLElement) {
  // Use getBoundingClientRect for viewport-relative position
  const rect = element.getBoundingClientRect();

  // On macOS, Tauri's LogicalPosition includes the window title bar (~28px)
  // JavaScript's viewport coordinates start below the title bar
  // So we need to add the title bar height to the Y coordinate
  const MACOS_TITLE_BAR_HEIGHT = 28;
  const adjustedY = rect.y + MACOS_TITLE_BAR_HEIGHT;

  // Use clientWidth/clientHeight which excludes scrollbars
  const contentWidth = element.clientWidth;
  const contentHeight = element.clientHeight;

  return {
    x: rect.x,
    y: adjustedY,
    width: contentWidth,
    height: contentHeight,
  };
}

interface UseWebviewOptions {
  tabId: string;
  initialUrl: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useWebview({ tabId, initialUrl, containerRef, setIsLoading, setError }: UseWebviewOptions) {
  const webviewLabelRef = useRef<string | null>(null);

  // Get navigation state from valtio store
  const browserSnap = useSnapshot(browserStore);
  const browser = browserSnap.browsers[tabId];
  const navigationCanGoBack = browser ? browser.history.activeIndex > 0 : false;
  const navigationCanGoForward = browser ? browser.history.activeIndex < browser.history.entries.length - 1 : false;

  // Navigate to URL
  const handleNavigate = useCallback(async (url: string) => {
    if (!webviewLabelRef.current) return;

    try {
      setIsLoading(true);
      const normalizedUrl = normalizeUrl(url);
      await platform.navigateBrowser(webviewLabelRef.current, normalizedUrl);
      // State will be updated via browser-navigation-updated event
      setError(null);
    } catch (err) {
      console.error('Navigation error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError]);

  // Go back
  const handleGoBack = useCallback(async () => {
    if (!webviewLabelRef.current) return;
    try {
      await platform.browserGoBack(webviewLabelRef.current);
      // State will be updated via browser-navigation-updated event
    } catch (err) {
      console.error('Failed to go back:', err);
    }
  }, []);

  // Go forward
  const handleGoForward = useCallback(async () => {
    if (!webviewLabelRef.current) return;
    try {
      await platform.browserGoForward(webviewLabelRef.current);
      // State will be updated via browser-navigation-updated event
    } catch (err) {
      console.error('Failed to go forward:', err);
    }
  }, []);

  // Refresh
  const handleRefresh = useCallback((url: string) => {
    handleNavigate(url);
  }, [handleNavigate]);

  // Go home
  const handleHome = useCallback(() => {
    handleNavigate('https://www.google.com');
  }, [handleNavigate]);

  // Create webview ONCE per tab.id
  useEffect(() => {
    let mounted = true;

    const createWebview = async () => {
      if (!containerRef.current || !mounted) return;

      // Wait for the container to have proper dimensions (flex-1 containers need layout time)
      let rect = containerRef.current.getBoundingClientRect();
      let attempts = 0;
      while (rect.height === 0 && attempts < 50 && mounted) {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (!containerRef.current) return;
        rect = containerRef.current.getBoundingClientRect();
        attempts++;
      }

      if (rect.height === 0) {
        console.error('Container still has 0 height after waiting');
        if (mounted) {
          setIsLoading(false);
          setError('Container has no height - layout issue');
        }
        return;
      }

      const label = `browser-${tabId}`;

      try {
        setError(null);
        setIsLoading(true);

        const position = getWebviewPosition(containerRef.current);

        await platform.createBrowserView({
          label,
          url: initialUrl || 'about:blank',
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
        });

        if (mounted) {
          webviewLabelRef.current = label;
          setIsLoading(false);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to create webview:', error);
        if (mounted) {
          setIsLoading(false);
          const errorMsg = error instanceof Error
            ? error.message
            : String(error);
          setError(`Failed to create browser view: ${errorMsg}`);
        }
      }
    };

    createWebview();

    // Cleanup webview on unmount
    return () => {
      mounted = false;
      if (webviewLabelRef.current) {
        platform.closeBrowserView(webviewLabelRef.current).catch((err) => {
          console.error('Error closing webview:', err);
        });
      }
    };
  }, [tabId, initialUrl, containerRef, setIsLoading, setError]);

  // Listen to navigation events to sync URL and history from actual webview
  useEffect(() => {
    let unlistenPromise: Promise<() => void>;

    const setupListener = async () => {
      unlistenPromise = platform.listen<{
        label: string;
        url: string;
        history: {
          entries: Array<{ url: string; title: string }>;
          activeIndex: number;
        };
      }>('browser-navigation-updated', (payload) => {
        console.log('[FRONTEND] Received navigation update:', payload);

        if (!payload || !payload.label || !payload.url || !payload.history) {
          console.log('[FRONTEND] Missing payload data, ignoring');
          return;
        }

        // Only handle events for this webview
        if (payload.label !== webviewLabelRef.current) {
          console.log('[FRONTEND] Label mismatch, ignoring:', payload.label, 'vs', webviewLabelRef.current);
          return;
        }

        console.log('[FRONTEND] Updating browser navigation for tab:', tabId);
        // Update browser store with URL and full navigation history
        updateBrowserNavigation(tabId, payload.url, payload.history);
      });
    };

    setupListener();

    return () => {
      if (unlistenPromise) {
        unlistenPromise.then(unlisten => unlisten());
      }
    };
  }, [tabId]);

  // Resize handling - call set_position/set_size on existing webviews
  useEffect(() => {
    if (!containerRef.current) return;

    let rafId: number | null = null;
    let lastUpdate = 0;
    const throttleMs = 100; // Update every 100ms max

    const updatePosition = () => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) {
        rafId = requestAnimationFrame(updatePosition);
        return;
      }
      lastUpdate = now;

      if (!containerRef.current || !webviewLabelRef.current) return;
      const position = getWebviewPosition(containerRef.current);

      // Call set_position and set_size on the existing webview
      platform.updateBrowserBounds(
        webviewLabelRef.current,
        position.x,
        position.y,
        position.width,
        position.height
      ).catch((err) => {
        console.error('Failed to update webview bounds:', err);
      });
    };

    const debouncedUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', debouncedUpdate, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    webviewLabelRef,
    canGoBack: navigationCanGoBack,
    canGoForward: navigationCanGoForward,
    handleNavigate,
    handleGoBack,
    handleGoForward,
    handleRefresh,
    handleHome,
  };
}
