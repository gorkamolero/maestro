import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalWindowProps {
  children: ReactNode;
  onClose?: () => void;
}

export function PortalWindow({ children, onClose }: PortalWindowProps) {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const windowRef = useRef<Window | null>(null);

  useEffect(() => {
    // Open a blank window - will be intercepted by -add-new-contents and turned into a BrowserView
    const externalWindow = window.open('', '');

    if (!externalWindow) {
      console.error('[PortalWindow] Failed to open portal window');
      return;
    }

    windowRef.current = externalWindow;

    // Wait for the window to be ready, then set up the portal root
    const setupPortal = () => {
      try {
        if (!externalWindow.document || !externalWindow.document.body) {
          setTimeout(setupPortal, 10);
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

        // Make body transparent
        externalWindow.document.body.style.backgroundColor = 'transparent';
        externalWindow.document.documentElement.style.backgroundColor = 'transparent';

        const container = externalWindow.document.getElementById('portal-root');
        if (container) {
          setContainerEl(container);
        }
      } catch (error) {
        console.error('[PortalWindow] Error setting up portal:', error);
      }
    };

    setupPortal();

    // Handle window close
    const handleUnload = () => {
      onClose?.();
    };
    externalWindow.addEventListener('beforeunload', handleUnload);

    return () => {
      externalWindow.removeEventListener('beforeunload', handleUnload);
      if (windowRef.current && !windowRef.current.closed) {
        windowRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!containerEl) return null;

  return createPortal(children, containerEl);
}
