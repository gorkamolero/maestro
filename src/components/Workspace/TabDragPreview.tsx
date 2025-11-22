import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { Star } from 'lucide-react';
import { Tab } from '@/stores/workspace.store';
import { TabDropZone } from '@/types';

interface TabDragPreviewProps {
  tab: Tab | null;
  zone: TabDropZone;
  position: { x: number; y: number };
}

export function TabDragPreview({ tab, zone, position }: TabDragPreviewProps) {
  if (!tab) return null;

  // Render different appearance based on zone
  const preview = zone === 'favorites' ? (
    // Favorite appearance (compact, icon-only like Arc favorites)
    <motion.div
      className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/20 shadow-2xl"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.95 }}
    >
      <span className="text-2xl">
        {tab.type === 'terminal' ? '>' : tab.type === 'browser' ? '🌐' : '📝'}
      </span>
    </motion.div>
  ) : (
    // Tab appearance (horizontal with title)
    <motion.div
      className="min-w-[200px] max-w-[250px] flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.95 }}
    >
      {tab.status === 'running' && (
        <div className="w-2 h-2 rounded-full bg-green-400" />
      )}
      <span className="text-sm truncate flex-1">{tab.title}</span>
      {tab.isFavorite && (
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      )}
    </motion.div>
  );

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: position.x - 50, // Offset to center on cursor
        top: position.y - 20,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {preview}
    </div>,
    document.body
  );
}
