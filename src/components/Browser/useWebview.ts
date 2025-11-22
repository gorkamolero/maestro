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
      console.log('createWebview called for tabId:', tabId);
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

      // Log container element details for debugging positioning
      const computedStyle = window.getComputedStyle(containerRef.current);

      // Check if there are any parent elements with padding/margin that might affect positioning
      let parent = containerRef.current.parentElement;
      const parentOffsets = [];
      while (parent && parent.tagName !== 'BODY') {
        const parentStyle = window.getComputedStyle(parent);
        parentOffsets.push({
          tag: parent.tagName,
          class: parent.className,
          padding: parentStyle.padding,
          margin: parentStyle.margin,
          border: parentStyle.border
        });
        parent = parent.parentElement;
        if (parentOffsets.length > 10) break; // Increase limit to see more parents
      }

      console.log('Container element:', JSON.stringify({
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: computedStyle.display,
        position: computedStyle.position,
        devicePixelRatio: window.devicePixelRatio,
        parentOffsets
      }, null, 2));

      try {
        setError(null);
        setIsLoading(true);

        // Create native Tauri child webview via Rust command
        // FIX: macOS uses bottom-left origin, browsers use top-left origin
        // Invert Y coordinate: correctedY = windowHeight - browserY - elementHeight
        const window = getCurrentWindow();
        const windowSize = await window.innerSize();
        const correctedY = windowSize.height - rect.y - rect.height;

        await invoke('create_browser_webview', {
          window,
          label,
          url: initialUrl || 'about:blank',
          x: rect.x,
          y: correctedY,
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

      // FIX: Invert Y coordinate for macOS bottom-left origin
      getCurrentWindow().innerSize().then((windowSize) => {
        const correctedY = windowSize.height - rect.y - rect.height;
        invoke('update_webview_position', {
          label: webviewLabelRef.current,
          x: rect.x,
          y: correctedY,
        }).catch(console.error);
      });

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
