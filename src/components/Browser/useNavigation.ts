import { MutableRefObject, RefObject } from 'react';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { normalizeUrl, isSafeUrl } from './browser.utils';

interface UseNavigationOptions {
  webviewRef: MutableRefObject<Webview | null>;
  currentUrlRef: MutableRefObject<string>;
  containerRef: RefObject<HTMLDivElement | null>;
  tabId: string;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  onUrlChange?: (url: string) => void;
}

export function useNavigation({
  webviewRef,
  currentUrlRef,
  containerRef,
  tabId,
  setIsLoading,
  setError,
  onUrlChange,
}: UseNavigationOptions) {
  const handleNavigate = async (url: string) => {
    const normalizedUrl = normalizeUrl(url);

    if (!isSafeUrl(normalizedUrl)) {
      console.warn('Potentially unsafe URL blocked:', normalizedUrl);
      setError('URL not allowed for security reasons');
      return;
    }

    // If already at this URL, just refresh
    if (currentUrlRef.current === normalizedUrl && webviewRef.current) {
      setIsLoading(true);
      try {
        // Hide and show to force refresh
        await webviewRef.current.hide();
        await webviewRef.current.show();
        setIsLoading(false);
      } catch (error) {
        console.error('Refresh failed:', error);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    if (onUrlChange) {
      onUrlChange(normalizedUrl);
    }

    // Close existing webview
    if (webviewRef.current) {
      try {
        await webviewRef.current.close();
        webviewRef.current = null;
      } catch (error) {
        console.error('Error closing webview:', error);
      }
    }

    // Create new webview with new URL
    if (!containerRef.current) {
      setIsLoading(false);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const window = getCurrentWindow();

    try {
      const newLabel = `browser-${tabId}-${Date.now()}`;
      const newWebview = new Webview(window, newLabel, {
        url: normalizedUrl,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        transparent: false,
        devtools: true,
      });

      await new Promise<void>((resolve, reject) => {
        newWebview.once('tauri://created', () => {
          webviewRef.current = newWebview;
          currentUrlRef.current = normalizedUrl;
          setIsLoading(false);
          setError(null);
          resolve();
        });

        newWebview.once('tauri://error', (event) => {
          console.error('Navigation failed:', event);
          setIsLoading(false);
          setError('Failed to load page');
          reject(event);
        });
      });
    } catch (error) {
      console.error('Navigation failed:', error);
      setIsLoading(false);
      setError('Failed to load page. Please try again.');
    }
  };

  const handleRefresh = () => {
    if (currentUrlRef.current) {
      handleNavigate(currentUrlRef.current);
    }
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

  return {
    handleNavigate,
    handleRefresh,
    handleGoBack,
    handleGoForward,
    handleHome,
  };
}
