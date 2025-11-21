import { useState } from 'react';
import { X, Plus, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserTab } from '@/types';
import { truncateTitle, getFaviconUrl } from './browser.utils';
import { Button } from '@/components/ui/button';

interface TabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
}

export function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onTabAdd }: TabBarProps) {
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1 bg-muted/30 border-b border-border px-2 py-1 overflow-x-auto">
      <AnimatePresence mode="popLayout">
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0"
          >
            <div
              className={`
                group relative flex items-center gap-2 px-3 py-1.5 rounded-md
                cursor-pointer transition-colors min-w-[120px] max-w-[200px]
                ${
                  activeTabId === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'bg-transparent text-muted-foreground hover:bg-background/50'
                }
              `}
              onClick={() => onTabSelect(tab.id)}
              onMouseEnter={() => setHoveredTabId(tab.id)}
              onMouseLeave={() => setHoveredTabId(null)}
            >
              {/* Favicon or default icon */}
              <div className="flex-shrink-0 w-4 h-4">
                {tab.favicon ? (
                  <img
                    src={getFaviconUrl(tab.url)}
                    alt=""
                    className="w-full h-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </div>

              {/* Tab title */}
              <span className="flex-1 text-xs truncate">{truncateTitle(tab.title || 'New Tab')}</span>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: hoveredTabId === tab.id || activeTabId === tab.id ? 1 : 0,
                  scale: hoveredTabId === tab.id || activeTabId === tab.id ? 1 : 0.8,
                }}
                className="flex-shrink-0 p-0.5 hover:bg-muted-foreground/20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X className="w-3 h-3" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add tab button */}
      <Button
        variant="ghost"
        size="sm"
        className="flex-shrink-0 h-7 w-7 p-0"
        onClick={onTabAdd}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
