import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Dock } from '@/components/Workspace/Dock';
import { Sidebar } from '@/components/Workspace/Sidebar';
import { WorkspacePanel } from '@/components/Workspace/WorkspacePanel';
import { AddFavoriteModal } from '@/components/Launcher';
import { CommandPalettePortal } from '@/components/CommandPalettePortal';
import { workspaceStore } from '@/stores/workspace.store';
import { ResizablePanel } from '@/components/ui/resizable-panel';

function App() {
  const [darkMode] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeSpaceId, layout } = useSnapshot(workspaceStore);

  useEffect(() => {
    console.log('[App] activeSpaceId changed:', activeSpaceId);
  }, [activeSpaceId]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      console.log('[App] Keydown event:', e.key, 'metaKey:', e.metaKey, 'ctrlKey:', e.ctrlKey);
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        console.log('[App] Opening command palette');
        e.preventDefault();
        setCommandPaletteOpen((open) => {
          console.log('[App] Command palette state:', open, '-> ', !open);
          return !open;
        });
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSidebarResize = (width: number) => {
    workspaceStore.layout.sidebarWidth = width;
  };

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Arc-style left sidebar - now resizable */}
      <ResizablePanel
        defaultWidth={layout.sidebarWidth}
        minWidth={180}
        maxWidth={400}
        onResize={handleSidebarResize}
        className="bg-muted/20"
      >
        <div className="h-full flex flex-col pt-4">
          {/* Sidebar with favorites and tabs */}
          <div className="flex-1 overflow-hidden">
            <Sidebar onCommandPalette={() => setCommandPaletteOpen(true)} />
          </div>

          {/* Space switcher at bottom-left */}
          <div className="p-2 border-t border-border/50">
            <Dock />
          </div>
        </div>
      </ResizablePanel>

      {/* Main workspace area */}
      <div className="flex-1 pt-4 bg-muted/20">
        <div className="h-full flex flex-col rounded-lg overflow-hidden bg-background">
          <WorkspacePanel />
        </div>
      </div>

      {/* Modals */}
      {activeSpaceId && <AddFavoriteModal workspaceId={activeSpaceId} />}

      {/* Command Palette */}
      <CommandPalettePortal isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}

export default App;
