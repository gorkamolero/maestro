import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { platform } from '@/lib/platform';

interface PortalWindowProps {
  children: ReactNode;
  onClose?: () => void;
}

export function PortalWindow({ children, onClose }: PortalWindowProps) {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const windowRef = useRef<Window | null>(null);
  const mountCountRef = useRef(0);

  useEffect(() => {
    mountCountRef.current++;
    const currentMount = mountCountRef.current;

    // Helper function to set up portal in a window
    const setupPortal = (externalWindow: Window) => {
      try {
        if (!externalWindow.document || !externalWindow.document.body) {
          setTimeout(() => setupPortal(externalWindow), 10);
          return;
        }

        // Check if portal root already exists (from previous StrictMode mount)
        let container = externalWindow.document.getElementById('portal-root');
        if (container) {
          console.log('[PortalWindow] Portal root already exists, reusing it');
          setContainerEl(container);
          return;
        }

        // Set up basic document structure
        externalWindow.document.write('<!DOCTYPE html><html><head></head><body><div id="portal-root"></div></body></html>');
        externalWindow.document.close();

        // Copy styles from parent window
        const parentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
        parentStyles.forEach(style => {
          const clonedStyle = style.cloneNode(true);
          externalWindow.document.head.appendChild(clonedStyle);
        });

        // Make body transparent and pass through mouse events
        externalWindow.document.body.style.backgroundColor = 'transparent';
        externalWindow.document.documentElement.style.backgroundColor = 'transparent';
        externalWindow.document.body.style.pointerEvents = 'none';

        // Allow clicks on the portal root content
        const portalRoot = externalWindow.document.getElementById('portal-root');
        if (portalRoot) {
          (portalRoot as HTMLElement).style.pointerEvents = 'auto';
        }

        container = externalWindow.document.getElementById('portal-root');
        if (container) {
          setContainerEl(container);
        }
      } catch (error) {
        console.error('[PortalWindow] Error setting up portal:', error);
      }
    };

    // Check if we already have a window from a previous mount (React StrictMode)
    if (windowRef.current && !windowRef.current.closed) {
      console.log('[PortalWindow] Reusing existing window from previous mount (StrictMode)');
      setupPortal(windowRef.current);
      return; // Don't create a new window
    }

    // Open a blank window - will be intercepted by -add-new-contents and turned into a BrowserView
    console.log('[PortalWindow] Opening new portal window');
    const externalWindow = window.open('', '');

    if (!externalWindow) {
      console.error('[PortalWindow] Failed to open portal window');
      return;
    }

    windowRef.current = externalWindow;
    setupPortal(externalWindow);

    // Cleanup: close the portal BrowserView when component unmounts
    return () => {
      console.log('[PortalWindow] Cleanup called, currentMount:', currentMount, 'mountCount:', mountCountRef.current);

      // Close the portal immediately - don't wait or check mount count
      platform.closeAllPortals().catch((err) => {
        console.error('[PortalWindow] Error closing portals:', err);
      });
      windowRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ESC key to close portal
  useEffect(() => {
    if (!windowRef.current || windowRef.current.closed || !onClose) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try {
          onClose();
        } catch (error) {
          console.error('[PortalWindow] Error in onClose:', error);
        }
      }
    };

    // Listen on the portal window, not the main window
    try {
      windowRef.current.addEventListener('keydown', handleEscape);
      const portalWindow = windowRef.current;
      return () => {
        try {
          if (portalWindow && !portalWindow.closed) {
            portalWindow.removeEventListener('keydown', handleEscape);
          }
        } catch (error) {
          console.log('[PortalWindow] Error removing event listener:', error);
        }
      };
    } catch (error) {
      console.error('[PortalWindow] Error setting up escape handler:', error);
    }
  }, [onClose]);

  if (!containerEl) return null;

  return createPortal(children, containerEl);
}
