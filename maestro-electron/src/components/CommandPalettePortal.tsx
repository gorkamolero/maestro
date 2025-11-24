import { useState, useEffect } from 'react';
import { View } from '@/components/View';
import { PortalWindow } from '@/components/PortalWindow';
import { CommandPalette } from '@/components/CommandPalette';

interface CommandPalettePortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalettePortal({ isOpen, onClose }: CommandPalettePortalProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  console.log('[CommandPalettePortal] Rendering, isOpen:', isOpen, 'isExiting:', isExiting);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      // Start exit animation
      setIsExiting(true);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  console.log('[CommandPalettePortal] Rendering backdrop and content Views');

  return (
    <div>
      {/* Backdrop - full screen BrowserView, created first so it's behind */}
      <View backdrop style={{
        width: '100%',
        height: '100%',
      }}>
        <PortalWindow onClose={onClose}>
          <div
            className={`w-full h-full bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
              isExiting ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={onClose}
          />
        </PortalWindow>
      </View>

      {/* Content - centered BrowserView, created second so it's on top */}
      <View style={{
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{ width: 640, height: 480 }}>
          <PortalWindow onClose={onClose}>
            <CommandPalette onClose={onClose} isExiting={isExiting} />
          </PortalWindow>
        </View>
      </View>
    </div>
  );
}
