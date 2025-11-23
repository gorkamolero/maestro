import { useState, useEffect } from 'react';
import { Dock } from '@/components/Workspace/Dock';
import { Sidebar } from '@/components/Workspace/Sidebar';
import { WorkspacePanel } from '@/components/Workspace/WorkspacePanel';

function App() {
  const [darkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Arc-style left sidebar */}
      <div className="w-[240px] bg-muted/40 flex flex-col">
        {/* Sidebar with favorites and tabs */}
        <div className="flex-1 overflow-hidden">
          <Sidebar />
        </div>

        {/* Space switcher at bottom-left */}
        <div className="p-2 border-t border-border/50">
          <Dock />
        </div>
      </div>

      {/* Main workspace area */}
      <div className="flex-1">
        <WorkspacePanel />
      </div>
    </div>
  );
}

export default App;
