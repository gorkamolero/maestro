import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

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

      const rect = containerRef.current.getBoundingClientRect();
      const label = `browser-${tabId}`;

      try {
        setError(null);
        setIsLoading(true);

        // Create native Tauri child webview via Rust command
        await invoke('create_browser_webview', {
          window: getCurrentWindow(),
          label,
          url: initialUrl || 'about:blank',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
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

  // Update webview position when container resizes
  useEffect(() => {
    if (!containerRef.current || !webviewLabelRef.current) return;

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

      if (!containerRef.current || !webviewLabelRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      invoke('update_webview_position', {
        label: webviewLabelRef.current,
        x: rect.x,
        y: rect.y,
      }).catch(console.error);

      invoke('update_webview_size', {
        label: webviewLabelRef.current,
        width: rect.width,
        height: rect.height,
      }).catch(console.error);
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
    webviewLabelRef,
    currentUrlRef,
  };
}
