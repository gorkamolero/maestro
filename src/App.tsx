import { useState, useEffect, useRef } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Timeline, TimelineHandle } from "@/components/Timeline/Timeline";
import { Dock } from "@/components/Workspace/Dock";
import { Sidebar } from "@/components/Workspace/Sidebar";
import { WorkspacePanel } from "@/components/Workspace/WorkspacePanel";
import { tracksActions } from "@/stores/tracks.store";
import { usePersistence } from "@/hooks/usePersistence";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const timelineRef = useRef<TimelineHandle>(null);

  // Initialize state persistence
  usePersistence();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleAddTrack = () => {
    const trackNumber = Math.floor(Math.random() * 1000);
    const newTrack = tracksActions.addTrack(`Track ${trackNumber}`);
    // Center viewport on new track with default zoom
    timelineRef.current?.centerOnTrack(newTrack.position);
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col relative">
      {/* Main layout with resizable panels */}
      <PanelGroup direction="vertical" className="flex-1">
        {/* Timeline at top (resizable 20-50%) */}
        <Panel defaultSize={30} minSize={20} maxSize={50}>
          <Timeline ref={timelineRef} onAddTrack={handleAddTrack} />
        </Panel>

        {/* Resize handle */}
        <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />

        {/* Workspace area at bottom */}
        <Panel defaultSize={70} className="flex">
          <PanelGroup direction="horizontal" className="flex-1">
            {/* Sidebar on left (fixed width via min/max) */}
            <Panel defaultSize={15} minSize={10} maxSize={30}>
              <Sidebar />
            </Panel>

            {/* Resize handle */}
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize active:bg-primary" />

            {/* Main workspace content */}
            <Panel defaultSize={85}>
              <WorkspacePanel />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Floating dock at bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <Dock />
        </div>
      </div>
    </div>
  );
}

export default App;
