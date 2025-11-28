# Maestro Mobile: Spaces Extension

Extending the mobile web UI with Control Room functionality. Cards, tabs, and contextual navigation.

## UX Philosophy

**Desktop:** Multiple panes visible, drag-drop, spatial layout
**Mobile:** One thing at a time, swipe navigation, contextual actions

We're not porting the desktop UI - we're building a mobile-native way to navigate the same data.

---

## Navigation Architecture

```
┌─────────────────────────────────────────┐
│              Mobile App                  │
├─────────────────────────────────────────┤
│                                          │
│   ┌─────────────────────────────────┐   │
│   │         Content Area            │   │
│   │                                 │   │
│   │   (Agents / Spaces / Settings)  │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                          │
│   ┌─────────────────────────────────┐   │
│   │  [Agents]   [Spaces]   [•••]    │   │  ← Bottom Tab Bar
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Bottom Tab Bar

```typescript
// Navigation structure
const tabs = [
  { id: 'agents', label: 'Agents', icon: BotIcon },
  { id: 'spaces', label: 'Spaces', icon: GridIcon },
  { id: 'more', label: 'More', icon: MoreIcon },  // Settings, Devices, etc.
];
```

---

## Screen Flow

```
Spaces Tab
    │
    ├── Space List (cards grid)
    │       │
    │       └── Space Detail
    │               │
    │               ├── Tab Content (Browser, Terminal, Notes, Agent)
    │               │       │
    │               │       └── Full Screen Terminal
    │               │       └── Full Screen Browser
    │               │
    │               └── Space Actions (bottom sheet)
    │                       ├── New Terminal
    │                       ├── New Browser Tab
    │                       ├── Launch Agent
    │                       └── Space Settings
    │
Agents Tab
    │
    └── (existing agent list, but now shows Space context)
```

---

## Screens

### 1. Space List

Grid of space cards, similar to desktop Control Room but optimized for touch.

```typescript
// src/mobile/screens/SpaceList.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { SpaceCard } from '../components/SpaceCard';
import type { SpaceInfo } from '@shared/types';

export function SpaceList() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { isConnected, subscribe, on } = useWebSocket();

  useEffect(() => {
    api.get<{ spaces: SpaceInfo[] }>('/api/spaces')
      .then(({ spaces }) => {
        setSpaces(spaces);
        setIsLoading(false);
      });
  }, []);

  // Subscribe to space updates
  useEffect(() => {
    if (!isConnected) return;
    subscribe('spaces');

    const off = on('space:updated', (msg) => {
      const updated = msg.payload as SpaceInfo;
      setSpaces(prev => prev.map(s => s.id === updated.id ? updated : s));
    });

    return off;
  }, [isConnected, subscribe, on]);

  // Sort: recently accessed first, then by agent activity
  const sortedSpaces = [...spaces].sort((a, b) => {
    // Spaces with active agents first
    if (a.agentCount > 0 && b.agentCount === 0) return -1;
    if (b.agentCount > 0 && a.agentCount === 0) return 1;
    // Then by last accessed
    return new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Spaces</h1>
          <div className="flex items-center gap-2">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <ConnectionDot connected={isConnected} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <LoadingGrid />
        ) : spaces.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {sortedSpaces.map(space => (
              <SpaceCard key={space.id} space={space} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSpaces.map(space => (
              <SpaceCard key={space.id} space={space} variant="list" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ViewToggle({ mode, onChange }: { mode: 'grid' | 'list'; onChange: (m: 'grid' | 'list') => void }) {
  return (
    <div className="flex bg-white/10 rounded-lg p-0.5">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded ${mode === 'grid' ? 'bg-white/20' : ''}`}
      >
        <GridIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded ${mode === 'list' ? 'bg-white/20' : ''}`}
      >
        <ListIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">🗂️</div>
      <p className="text-white/50">No spaces yet</p>
      <p className="text-white/30 text-sm mt-1">Create spaces in Maestro desktop</p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="aspect-[4/3] bg-white/5 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
```

### 2. Space Card Component

```typescript
// src/mobile/components/SpaceCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { formatRelativeTime } from '@shared/utils/format';
import type { SpaceInfo } from '@shared/types';

interface SpaceCardProps {
  space: SpaceInfo;
  variant: 'grid' | 'list';
}

export function SpaceCard({ space, variant }: SpaceCardProps) {
  const hasActivity = space.agentCount > 0;
  
  if (variant === 'list') {
    return (
      <Link
        to={`/space/${space.id}`}
        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl active:bg-white/10"
      >
        <SpaceIcon space={space} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{space.name}</h3>
          <p className="text-sm text-white/40">
            {space.tabCount} tabs {space.agentCount > 0 && `• ${space.agentCount} agents`}
          </p>
        </div>
        {hasActivity && <ActivityPulse />}
        <ChevronRight className="w-4 h-4 text-white/30" />
      </Link>
    );
  }

  // Grid variant
  return (
    <Link
      to={`/space/${space.id}`}
      className="block aspect-[4/3] relative overflow-hidden rounded-xl bg-white/5 active:bg-white/10"
    >
      {/* Color accent bar */}
      {space.color && (
        <div 
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: space.color }}
        />
      )}
      
      {/* Content */}
      <div className="absolute inset-0 p-3 flex flex-col">
        <div className="flex items-start justify-between">
          <SpaceIcon space={space} size="lg" />
          {hasActivity && <ActivityPulse />}
        </div>
        
        <div className="mt-auto">
          <h3 className="font-medium truncate">{space.name}</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {space.tabCount} tabs
          </p>
        </div>
      </div>

      {/* Agent count badge */}
      {space.agentCount > 0 && (
        <div className="absolute top-2 right-2 bg-amber-500/20 text-amber-400 text-xs font-medium px-1.5 py-0.5 rounded-full">
          {space.agentCount} 🤖
        </div>
      )}
    </Link>
  );
}

function SpaceIcon({ space, size }: { space: SpaceInfo; size: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-base';
  
  return (
    <div 
      className={`${sizeClasses} rounded-lg flex items-center justify-center`}
      style={{ backgroundColor: space.color ? `${space.color}20` : 'rgba(255,255,255,0.1)' }}
    >
      {space.icon || '📁'}
    </div>
  );
}

function ActivityPulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}
```

### 3. Space Detail

Inside a space: horizontal tab bar at top, content below, actions via bottom sheet.

```typescript
// src/mobile/screens/SpaceDetail.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { TabBar } from '../components/TabBar';
import { TabContent } from '../components/TabContent';
import { SpaceActions } from '../components/SpaceActions';
import type { SpaceDetail as SpaceDetailType, TabInfo } from '@shared/types';

export function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<SpaceDetailType | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const { isConnected, subscribe, on } = useWebSocket();

  // Fetch space
  useEffect(() => {
    if (!id) return;
    
    api.get<SpaceDetailType>(`/api/spaces/${id}`)
      .then(data => {
        setSpace(data);
        setActiveTabId(data.tabs[0]?.id || null);
        setIsLoading(false);
      });
  }, [id]);

  // Subscribe to updates
  useEffect(() => {
    if (!isConnected || !id) return;
    subscribe('space', id);

    const off = on('space:tab-updated', (msg) => {
      const { spaceId, tab } = msg.payload as { spaceId: string; tab: TabInfo };
      if (spaceId === id) {
        setSpace(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tabs: prev.tabs.map(t => t.id === tab.id ? tab : t),
          };
        });
      }
    });

    return off;
  }, [isConnected, id, subscribe, on]);

  const activeTab = space?.tabs.find(t => t.id === activeTabId);

  if (isLoading || !space) {
    return <LoadingState />;
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex-none border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{space.name}</h1>
          </div>
          <button
            onClick={() => setShowActions(true)}
            className="p-2 -mr-2"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        {space.tabs.length > 0 && (
          <TabBar
            tabs={space.tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
          />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {space.tabs.length === 0 ? (
          <EmptySpaceState onAddTab={() => setShowActions(true)} />
        ) : activeTab ? (
          <TabContent tab={activeTab} spaceId={space.id} />
        ) : null}
      </main>

      {/* Actions Bottom Sheet */}
      <SpaceActions
        open={showActions}
        onClose={() => setShowActions(false)}
        spaceId={space.id}
        spaceName={space.name}
      />
    </div>
  );
}

function EmptySpaceState({ onAddTab }: { onAddTab: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-4">📭</div>
      <p className="text-white/50 text-center mb-4">This space is empty</p>
      <button
        onClick={onAddTab}
        className="px-4 py-2 bg-white/10 rounded-lg text-sm"
      >
        Add Tab
      </button>
    </div>
  );
}
```

### 4. Tab Bar (Horizontal Scroll)

```typescript
// src/mobile/components/TabBar.tsx
import React, { useRef, useEffect } from 'react';
import type { TabInfo } from '@shared/types';

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabChange }: TabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeTabId]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-none"
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : null}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/50 active:bg-white/10'
            }`}
          >
            <TabIcon type={tab.type} />
            <span className="text-sm truncate max-w-[120px]">
              {tab.title || getDefaultTitle(tab)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TabIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    browser: '🌐',
    terminal: '⬛',
    notes: '📝',
    agent: '🤖',
    app: '📱',
  };
  return <span className="text-xs">{icons[type] || '📄'}</span>;
}

function getDefaultTitle(tab: TabInfo): string {
  switch (tab.type) {
    case 'browser': return tab.url ? new URL(tab.url).hostname : 'New Tab';
    case 'terminal': return 'Terminal';
    case 'notes': return 'Notes';
    case 'agent': return 'Agent';
    default: return 'Tab';
  }
}
```

### 5. Tab Content Router

```typescript
// src/mobile/components/TabContent.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import type { TabInfo } from '@shared/types';

interface TabContentProps {
  tab: TabInfo;
  spaceId: string;
}

export function TabContent({ tab, spaceId }: TabContentProps) {
  switch (tab.type) {
    case 'terminal':
      return <TerminalPreview tabId={tab.id} terminalId={tab.terminalId} />;
    case 'browser':
      return <BrowserPreview url={tab.url} />;
    case 'notes':
      return <NotesPreview content={tab.content} />;
    case 'agent':
      return <AgentPreview agentId={tab.agentId} />;
    default:
      return <GenericPreview tab={tab} />;
  }
}

// Terminal: Show preview, tap to go fullscreen
function TerminalPreview({ tabId, terminalId }: { tabId: string; terminalId?: string }) {
  if (!terminalId) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Terminal not connected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mini preview would go here - could show last few lines */}
      <div className="flex-1 bg-[#0a0a0a] p-4">
        <p className="text-white/30 font-mono text-sm">Terminal session active</p>
      </div>
      
      <Link
        to={`/terminal/${terminalId}`}
        className="flex-none p-4 bg-white/5 border-t border-white/10 text-center"
      >
        <span className="text-blue-400 font-medium">Open Terminal Fullscreen →</span>
      </Link>
    </div>
  );
}

// Browser: Show URL and screenshot/preview
function BrowserPreview({ url }: { url?: string }) {
  if (!url) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        No URL loaded
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="flex-none px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white/60 truncate">
          {url}
        </div>
      </div>
      
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🌐</div>
          <p className="text-white/50 text-sm mb-4">
            Browser tabs can't be viewed on mobile
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-white/10 rounded-lg text-sm"
          >
            Open in Safari →
          </a>
        </div>
      </div>
    </div>
  );
}

// Notes: Show content preview
function NotesPreview({ content }: { content?: string }) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {content ? (
        <div className="prose prose-invert prose-sm max-w-none">
          {/* Render markdown or plain text */}
          <p className="text-white/80 whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        <p className="text-white/40">Empty note</p>
      )}
    </div>
  );
}

// Agent: Link to agent detail
function AgentPreview({ agentId }: { agentId?: string }) {
  if (!agentId) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        No agent linked
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <Link
        to={`/agent/${agentId}`}
        className="text-center"
      >
        <div className="text-4xl mb-4">🤖</div>
        <span className="text-blue-400 font-medium">View Agent →</span>
      </Link>
    </div>
  );
}

function GenericPreview({ tab }: { tab: TabInfo }) {
  return (
    <div className="h-full flex items-center justify-center text-white/40">
      <div className="text-center">
        <div className="text-4xl mb-4">📄</div>
        <p>{tab.type} tab</p>
      </div>
    </div>
  );
}
```

### 6. Space Actions (Bottom Sheet)

```typescript
// src/mobile/components/SpaceActions.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { BottomSheet } from './BottomSheet';

interface SpaceActionsProps {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

export function SpaceActions({ open, onClose, spaceId, spaceName }: SpaceActionsProps) {
  const navigate = useNavigate();

  const handleNewTerminal = async () => {
    try {
      const { terminalId } = await api.post<{ terminalId: string }>(
        `/api/spaces/${spaceId}/terminals`,
        {}
      );
      onClose();
      navigate(`/terminal/${terminalId}`);
    } catch (err) {
      console.error('Failed to create terminal:', err);
    }
  };

  const handleLaunchAgent = async () => {
    // Could open a modal to configure agent, or just launch with defaults
    try {
      const { sessionId, terminalId } = await api.post<{ sessionId: string; terminalId: string }>(
        '/api/agents/launch',
        { spaceId, mode: 'mobile' }
      );
      onClose();
      navigate(`/terminal/${terminalId}`);
    } catch (err) {
      console.error('Failed to launch agent:', err);
    }
  };

  const actions = [
    {
      icon: '⬛',
      label: 'New Terminal',
      description: 'Open a terminal in this space',
      action: handleNewTerminal,
    },
    {
      icon: '🤖',
      label: 'Launch Agent',
      description: 'Start Claude Code in this space',
      action: handleLaunchAgent,
    },
    {
      icon: '🌐',
      label: 'New Browser Tab',
      description: 'Opens on desktop',
      action: () => {
        api.post(`/api/spaces/${spaceId}/tabs`, { type: 'browser' });
        onClose();
      },
    },
    {
      icon: '📝',
      label: 'New Note',
      description: 'Create a note in this space',
      action: () => {
        api.post(`/api/spaces/${spaceId}/tabs`, { type: 'notes' });
        onClose();
      },
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={spaceName}>
      <div className="space-y-1">
        {actions.map(action => (
          <button
            key={action.label}
            onClick={action.action}
            className="w-full flex items-center gap-4 p-4 rounded-xl active:bg-white/10 text-left"
          >
            <span className="text-2xl">{action.icon}</span>
            <div>
              <div className="font-medium">{action.label}</div>
              <div className="text-sm text-white/40">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
```

### 7. Bottom Sheet Component

```typescript
// src/mobile/components/BottomSheet.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[#1a1a1a] rounded-t-2xl max-h-[85vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            
            {/* Title */}
            {title && (
              <div className="px-4 pb-3 border-b border-white/10">
                <h2 className="font-semibold text-lg">{title}</h2>
              </div>
            )}
            
            {/* Content */}
            <div className="p-4 overflow-y-auto">
              {children}
            </div>
            
            {/* Safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### 8. Bottom Tab Bar (App-wide)

```typescript
// src/mobile/components/BottomTabBar.tsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Agents', icon: BotIcon },
  { path: '/spaces', label: 'Spaces', icon: GridIcon },
  { path: '/more', label: 'More', icon: MoreIcon },
];

export function BottomTabBar() {
  const location = useLocation();
  
  // Hide on detail screens
  const hideOn = ['/terminal/', '/agent/', '/space/'];
  const shouldHide = hideOn.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-black/90 backdrop-blur border-t border-white/10">
      <div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-6 py-2 ${
                isActive ? 'text-white' : 'text-white/40'
              }`
            }
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-xs">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Icons
function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      <path d="M12 2v4M8 6h8" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}
```

---

## Updated App Router

```typescript
// src/mobile/App.tsx (updated)
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { BottomTabBar } from './components/BottomTabBar';

// Screens
import { Login } from './screens/Login';
import { AgentList } from './screens/AgentList';
import { AgentDetail } from './screens/AgentDetail';
import { SpaceList } from './screens/SpaceList';
import { SpaceDetail } from './screens/SpaceDetail';
import { Terminal } from './screens/Terminal';
import { Settings } from './screens/Settings';
import { More } from './screens/More';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <Routes>
        {/* Tab routes */}
        <Route path="/" element={<AgentList />} />
        <Route path="/spaces" element={<SpaceList />} />
        <Route path="/more" element={<More />} />
        
        {/* Detail routes */}
        <Route path="/agent/:id" element={<AgentDetail />} />
        <Route path="/space/:id" element={<SpaceDetail />} />
        <Route path="/terminal/:id" element={<Terminal />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomTabBar />
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## API Additions

Add these endpoints to the remote server:

```typescript
// POST /api/spaces/:id/terminals - Create terminal in space
spacesRouter.post('/:id/terminals', async (c) => {
  const spaceId = c.req.param('id');
  // Create terminal, associate with space
  // Return { terminalId }
});

// POST /api/spaces/:id/tabs - Create tab in space
spacesRouter.post('/:id/tabs', async (c) => {
  const spaceId = c.req.param('id');
  const { type, url, content } = await c.req.json();
  // Create tab via IPC to desktop
  // Return { tabId }
});
```

---

## Swipe Navigation (Optional Enhancement)

For swipe between tabs within a space:

```typescript
// src/mobile/hooks/useSwipeNavigation.ts
import { useRef, useEffect } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeNavigation(options: SwipeOptions) {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = options;
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX.current;
      const deltaY = e.changedTouches[0].clientY - startY.current;

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);
}

// Usage in SpaceDetail:
const tabIndex = space.tabs.findIndex(t => t.id === activeTabId);

useSwipeNavigation({
  onSwipeLeft: () => {
    if (tabIndex < space.tabs.length - 1) {
      setActiveTabId(space.tabs[tabIndex + 1].id);
    }
  },
  onSwipeRight: () => {
    if (tabIndex > 0) {
      setActiveTabId(space.tabs[tabIndex - 1].id);
    }
  },
});
```

---

## What Works on Mobile vs Desktop

| Feature | Mobile | Desktop |
|---------|--------|---------|
| View space cards | ✅ Grid/list | ✅ Grid |
| View tabs in space | ✅ Horizontal scroll | ✅ Sidebar |
| Switch tabs | ✅ Tap | ✅ Click |
| View terminal | ✅ Fullscreen | ✅ In pane |
| View browser content | ❌ Link to Safari | ✅ Embedded |
| View notes | ✅ Read-only | ✅ Editable |
| Create terminal | ✅ | ✅ |
| Launch agent | ✅ | ✅ |
| Create browser tab | ⚠️ Opens on desktop | ✅ |
| Drag/drop tabs | ❌ | ✅ |
| Split panes | ❌ | ✅ |
| Resize panes | ❌ | ✅ |

---

## Implementation Order

1. **Bottom tab bar** - App-wide navigation
2. **Space list** - Grid/list of cards
3. **Space detail** - Header + tab bar + content
4. **Tab content** - Router for different types
5. **Bottom sheet** - Actions menu
6. **API endpoints** - Create tabs/terminals
7. **Swipe navigation** - Optional polish

---

## Summary

Cards work great on mobile as a 2-column grid. Tapping opens the space.

Inside a space, tabs become a horizontal scroll bar (like browser tabs on mobile Safari). Tap to switch, content renders below.

Panes don't translate - you see one tab at a time. Terminal and agent views go fullscreen.

Browser tabs show a preview with "Open in Safari" link since we can't embed WebViews.

Actions (new terminal, launch agent) live in a bottom sheet, which is the mobile-native equivalent of a context menu.

The key insight: **Mobile is read + quick actions. Desktop is the full workspace.** This spec gives you meaningful control without fighting the platform.
