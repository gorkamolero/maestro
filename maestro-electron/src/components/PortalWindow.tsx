import { useEffect, useRef, useState, useContext, createContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { platform } from '@/lib/platform';
import { ViewContext } from '@/components/View';

interface PortalWindowProps {
  children: ReactNode;
  onClose?: () => void;
}

interface PortalAnimationContextValue {
  isExiting: boolean;
}

export const PortalAnimationContext = createContext<PortalAnimationContextValue>({
  isExiting: false,
});

export function usePortalAnimation() {
  return useContext(PortalAnimationContext);
}

export function PortalWindow({ children, onClose }: PortalWindowProps) {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const windowRef = useRef<Window | null>(null);
  const mountCountRef = useRef(0);
  const viewContext = useContext(ViewContext);
  const viewBounds = viewContext?.bounds;
  const closeRequestedRef = useRef(false);

  useEffect(() => {
    const currentMount = ++mountCountRef.current;

    // Helper function to set up portal in a window
    const setupPortal = (externalWindow: Window) => {
      try {
        if (!externalWindow.document || !externalWindow.document.body) {
          setTimeout(() => setupPortal(externalWindow), 10);
          return;
        }

        // Mark this window as a portal so stores can skip persistence
        // @ts-expect-error - Adding custom property to window
        externalWindow.__IS_PORTAL_WINDOW__ = true;

        // Copy styles from parent window
        const parentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
        parentStyles.forEach(style => {
          const clonedStyle = style.cloneNode(true);
          externalWindow.document.head.appendChild(clonedStyle);
        });

        // Copy dark mode class from parent
        if (document.documentElement.classList.contains('dark')) {
          externalWindow.document.documentElement.classList.add('dark');
        }

        // Make body and html fully transparent to support rounded corners
        externalWindow.document.body.style.backgroundColor = 'transparent';
        externalWindow.document.documentElement.style.backgroundColor = 'transparent';

        // Enable transparency for rounded corners
        externalWindow.document.body.style.overflow = 'hidden';
        externalWindow.document.body.style.margin = '0';
        externalWindow.document.body.style.padding = '0';
        externalWindow.document.body.style.width = '100%';
        externalWindow.document.body.style.height = '100%';
        externalWindow.document.body.style.overflow = 'hidden';
        externalWindow.document.body.style.pointerEvents = 'auto';

        // Fix for Electron BrowserView mouse events being blocked by draggable regions
        // See: https://github.com/electron/electron/issues/28057
        externalWindow.document.body.style.webkitUserSelect = 'auto';
        externalWindow.document.body.style.webkitAppRegion = 'no-drag';

        // Store the webContents ID on the window so we can reference it later
        // This will be set by the main process after interception
        // @ts-expect-error - Custom property
        externalWindow.__PORTAL_ID__ = null;

        // Render directly into body
        setContainerEl(externalWindow.document.body);
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

  // Handle close with exit animation
  const handleCloseWithAnimation = () => {
    if (closeRequestedRef.current || !onClose) return;
    closeRequestedRef.current = true;

    // Start exit animation
    setIsExiting(true);

    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  // Handle ESC key to close portal
  useEffect(() => {
    if (!windowRef.current || windowRef.current.closed) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try {
          handleCloseWithAnimation();
        } catch (error) {
          console.error('[PortalWindow] Error in handleCloseWithAnimation:', error);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Send View bounds to main process following the Stack Browser pattern
  useEffect(() => {
    if (!viewBounds || !windowRef.current) {
      console.log('[PortalWindow] Not sending bounds - viewBounds:', viewBounds, 'windowRef:', !!windowRef.current);
      return;
    }

    const portalWindow = windowRef.current;

    // Wait for __WEBCONTENTS_ID__ to be set by main process using a Promise
    const waitForWebContentsId = (): Promise<number> => {
      return new Promise((resolve) => {
        const check = () => {
          // @ts-expect-error - Custom property set by main process
          const webContentsId = portalWindow.__WEBCONTENTS_ID__;
          if (webContentsId !== undefined && webContentsId !== null) {
            resolve(webContentsId);
          } else {
            setTimeout(check, 10);
          }
        };
        check();
      });
    };

    // Send bounds once ID is available
    waitForWebContentsId().then((webContentsId) => {
      console.log('[PortalWindow] Sending View bounds to main process:', viewBounds);
      console.log('[PortalWindow] __WEBCONTENTS_ID__:', webContentsId);

      // @ts-expect-error - window.opener exists on child windows
      if (portalWindow.opener && !portalWindow.opener.closed) {
        console.log('[PortalWindow] Sending via window.opener.electron.send');
        // @ts-expect-error - window.electron is added by preload
        portalWindow.opener.electron.send('portal-body-bounds', webContentsId, viewBounds);
        console.log('[PortalWindow] Bounds sent successfully');
      } else {
        console.log('[PortalWindow] No opener or opener closed');
      }
    });
  }, [viewBounds]);

  if (!containerEl) return null;

  return createPortal(
    <PortalAnimationContext.Provider value={{ isExiting }}>
      {children}
    </PortalAnimationContext.Provider>,
    containerEl
  );
}
