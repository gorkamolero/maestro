import { useState, useEffect } from 'react';
import { View } from '@/components/View';
import { PortalWindow, usePortalAnimation } from '@/components/PortalWindow';
import { CommandPalette } from '@/components/CommandPalette';

interface CommandPalettePortalProps {
  isOpen: boolean;
  onClose: () => void;
}

function BackdropContent({ onClose }: { onClose: () => void }) {
  const { isExiting } = usePortalAnimation();

  return (
    <div
      className={`w-full h-full bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={onClose}
    />
  );
}

function CommandPaletteContent({ onClose }: { onClose: () => void }) {
  const { isExiting } = usePortalAnimation();

  return <CommandPalette onClose={onClose} isExiting={isExiting} />;
}

export function CommandPalettePortal({ isOpen, onClose }: CommandPalettePortalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else if (shouldRender) {
      // Keep rendering for animation duration, then unmount
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 250); // Slightly longer than animation to ensure it completes
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div>
      {/* Backdrop - full screen BrowserView, created first so it's behind */}
      <View backdrop style={{
        width: '100%',
        height: '100%',
      }}>
        <PortalWindow onClose={onClose}>
          <BackdropContent onClose={onClose} />
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
            <CommandPaletteContent onClose={onClose} />
          </PortalWindow>
        </View>
      </View>
    </div>
  );
}
