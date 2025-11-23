import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
  const currentUrlRef = useRef<string>(initialUrl);

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

        await invoke('create_browser_webview', {
          window: getCurrentWindow(),
          label,
          url: initialUrl || 'about:blank',
          ...position,
        });

        if (mounted) {
          webviewLabelRef.current = label;
          currentUrlRef.current = initialUrl;
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
        invoke('close_browser_webview', { label: webviewLabelRef.current }).catch((err) => {
          console.error('Error closing webview:', err);
        });
      }
    };
  }, [tabId]); // Only recreate if tab.id changes

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
      invoke('update_webview_bounds', {
        window: getCurrentWindow(),
        label: webviewLabelRef.current,
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      }).catch((err) => {
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
  }, []);

  return {
    webviewLabelRef,
    currentUrlRef,
  };
}
