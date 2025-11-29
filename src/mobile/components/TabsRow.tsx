import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TabInfo } from '@shared/types';
import { useWebSocket } from '../hooks/useWebSocket';

interface TabsRowProps {
  tabs: TabInfo[];
  spaceId: string;
  maxVisible?: number;
}

const iconMap: Record<string, string> = {
  terminal: '⬛',
  browser: '🌐',
  notes: '📝',
  tasks: '✓',
  'app-launcher': '📦',
};

/**
 * TabsRow - Horizontal row of tab icons like desktop
 * Tapping opens a popover with info + "Open on Desktop" button
 */
const tabTypes = [
  { type: 'browser', icon: '🌐', label: 'Browser' },
  { type: 'terminal', icon: '⬛', label: 'Terminal' },
  { type: 'notes', icon: '📝', label: 'Notes' },
  { type: 'tasks', icon: '✓', label: 'Tasks' },
];

export function TabsRow({ tabs, spaceId, maxVisible = 5 }: TabsRowProps) {
  const navigate = useNavigate();
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { send, isConnected } = useWebSocket();

  const visibleTabs = tabs.slice(0, maxVisible);
  const hiddenCount = tabs.length - maxVisible;

  const handleTabTap = (tab: TabInfo) => {
    setActiveTabId(activeTabId === tab.id ? null : tab.id);
    setShowAddMenu(false);
  };

  const handleOpenOnDesktop = (tab: TabInfo) => {
    if (!isConnected) return;
    // Send message to desktop to focus this tab
    send('tab:focus', { spaceId, tabId: tab.id });
    setActiveTabId(null);
  };

  const handleAddTab = (tabType: string) => {
    if (!isConnected) {
      setShowAddMenu(false);
      return;
    }
    send('space:addTab', { spaceId, tabType });
    setShowAddMenu(false);
  };

  const handleAddBrowser = (url: string) => {
    if (!isConnected) {
      setShowAddMenu(false);
      return;
    }
    // Normalize URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `http://${normalizedUrl}`;
    }
    // Open shadow browser - streams to mobile
    send('shadow-browser:open', { url: normalizedUrl, spaceId, quality: 'medium' });
    setShowAddMenu(false);
    // Navigate to remote view to see the stream
    navigate('/remote-view');
  };

  return (
    <div className="flex items-start gap-2 px-4 py-3 border-b border-white/[0.04]">
      {visibleTabs.map((tab) => (
        <div key={tab.id} className="relative">
          <button
            onClick={() => handleTabTap(tab)}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-all active:scale-95"
            style={{
              background: tab.appColor ? `${tab.appColor}20` : 'rgba(255,255,255,0.06)',
              border: activeTabId === tab.id ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
            }}
          >
            {tab.appIcon ? (
              <img src={tab.appIcon} alt={tab.title} className="w-6 h-6 rounded" />
            ) : (
              <span className="text-lg">{tab.emoji || iconMap[tab.type] || '📄'}</span>
            )}
          </button>

          {/* Active indicator dot */}
          {tabs.indexOf(tab) === 0 && (
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
              style={{ background: '#3b82f6' }}
            />
          )}

          {/* Popover when tapped */}
          {activeTabId === tab.id && (
            <TabPopover
              tab={tab}
              onOpenOnDesktop={() => handleOpenOnDesktop(tab)}
              onClose={() => setActiveTabId(null)}
              isConnected={isConnected}
            />
          )}
        </div>
      ))}

      {/* Hidden count */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.04] text-[--text-tertiary]">
          <span className="text-xs font-medium">+{hiddenCount}</span>
        </div>
      )}

      {/* Add button */}
      <div className="relative">
        <button
          onClick={() => {
            setShowAddMenu(!showAddMenu);
            setActiveTabId(null);
          }}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.04] text-[--text-tertiary] transition-all active:scale-95 active:bg-white/[0.08]"
          style={{
            border: showAddMenu ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
          }}
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        {/* Add tab menu */}
        {showAddMenu && (
          <AddTabPopover
            onSelectType={handleAddTab}
            onAddBrowser={handleAddBrowser}
            onClose={() => setShowAddMenu(false)}
            isConnected={isConnected}
          />
        )}
      </div>
    </div>
  );
}

// Simple popover component
function TabPopover({
  tab,
  onOpenOnDesktop,
  onClose,
  isConnected,
}: {
  tab: TabInfo;
  onOpenOnDesktop: () => void;
  onClose: () => void;
  isConnected: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 min-w-[180px] p-3 rounded-xl animate-fade-in"
        style={{
          background: 'rgba(30,30,32,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Tab info */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{tab.emoji || iconMap[tab.type] || '📄'}</span>
            <span className="text-[13px] font-medium text-[--text-primary] truncate">
              {tab.title || tab.type}
            </span>
          </div>
          {tab.url && (
            <p className="text-[11px] text-[--text-tertiary] truncate">{tab.url}</p>
          )}
          <p className="text-[10px] text-[--text-tertiary] uppercase tracking-wider mt-1">
            {tab.type}
          </p>
        </div>

        {/* Open on Desktop button */}
        <button
          onClick={onOpenOnDesktop}
          disabled={!isConnected}
          className="w-full py-2 px-3 rounded-lg text-[12px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          style={{
            background: 'rgba(59,130,246,0.15)',
            color: '#60a5fa',
          }}
        >
          {isConnected ? 'Open on Desktop' : 'Not Connected'}
        </button>
      </div>
    </>
  );
}

// Add tab menu popover
function AddTabPopover({
  onSelectType,
  onAddBrowser,
  onClose,
  isConnected,
}: {
  onSelectType: (type: string) => void;
  onAddBrowser: (url: string) => void;
  onClose: () => void;
  isConnected: boolean;
}) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState('');

  const handleBrowserClick = () => {
    setShowUrlInput(true);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAddBrowser(url.trim());
    }
  };

  if (showUrlInput) {
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div
          className="absolute top-full left-0 mt-2 z-50 min-w-[220px] p-3 rounded-xl animate-fade-in"
          style={{
            background: 'rgba(30,30,32,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div className="text-[10px] text-[--text-tertiary] uppercase tracking-wider px-1 py-1 mb-2">
            Add Browser
          </div>
          <form onSubmit={handleUrlSubmit}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="localhost:3000"
              autoFocus
              className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-[13px] text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-amber-400/50 mb-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="flex-1 py-2 px-3 rounded-lg text-[12px] font-medium bg-white/[0.06] text-[--text-secondary] active:scale-[0.98]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!url.trim() || !isConnected}
                className="flex-1 py-2 px-3 rounded-lg text-[12px] font-medium bg-amber-500 text-black active:scale-[0.98] disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        className="absolute top-full left-0 mt-2 z-50 min-w-[180px] p-3 rounded-xl animate-fade-in"
        style={{
          background: 'rgba(30,30,32,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {!isConnected && (
          <div className="px-3 py-2 mb-2 text-[11px] text-amber-400 bg-amber-500/10 rounded-lg">
            Not connected to desktop
          </div>
        )}

        <div className="text-[10px] text-[--text-tertiary] uppercase tracking-wider px-3 py-1 mb-1">
          Add Tab
        </div>

        {tabTypes.map((item) => (
          <button
            key={item.type}
            onClick={() => item.type === 'browser' ? handleBrowserClick() : onSelectType(item.type)}
            disabled={!isConnected}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all active:scale-[0.98] disabled:opacity-40 hover:bg-white/[0.06]"
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[13px] text-[--text-primary]">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
