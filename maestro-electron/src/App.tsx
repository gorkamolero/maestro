import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Dock } from '@/components/Workspace/Dock';
import { Sidebar } from '@/components/Workspace/Sidebar';
import { WorkspacePanel } from '@/components/Workspace/WorkspacePanel';
import { AddFavoriteModal } from '@/components/Launcher';
import { workspaceStore } from '@/stores/workspace.store';
import { ResizablePanel } from '@/components/ui/resizable-panel';

function App() {
  const [darkMode] = useState(true);
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
        className="bg-muted/40"
      >
        <div className="h-full flex flex-col">
          {/* Sidebar with favorites and tabs */}
          <div className="flex-1 overflow-hidden">
            <Sidebar />
          </div>

          {/* Space switcher at bottom-left */}
          <div className="p-2 border-t border-border/50">
            <Dock />
          </div>
        </div>
      </ResizablePanel>

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col">
        <WorkspacePanel />
      </div>

      {/* Modals */}
      {activeSpaceId && <AddFavoriteModal workspaceId={activeSpaceId} />}
    </div>
  );
}

export default App;
