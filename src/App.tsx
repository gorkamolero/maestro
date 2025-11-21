import { useState, useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Timeline, TimelineHandle } from "@/components/Timeline/Timeline";
import { Dock } from "@/components/Workspace/Dock";
import { Sidebar } from "@/components/Workspace/Sidebar";
import { WorkspacePanel } from "@/components/Workspace/WorkspacePanel";
import { FloatingControls } from "@/components/Workspace/FloatingControls";
import { spacesActions } from "@/stores/spaces.store";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";
import { usePersistence } from "@/hooks/usePersistence";
import { LayoutGrid, LayoutList, Columns2, ChevronDown, Terminal, Globe, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const timelineRef = useRef<TimelineHandle>(null);
  const { viewMode } = useSnapshot(workspaceStore);

  // Initialize state persistence
  usePersistence();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleAddSpace = () => {
    const spaceNumber = Math.floor(Math.random() * 1000);
    const newSpace = spacesActions.addSpace(`Space ${spaceNumber}`);
    // Center viewport on new space with default zoom
    timelineRef.current?.centerOnSpace(newSpace.position);
  };

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Arc-style left sidebar */}
      <div className="w-[240px] bg-muted/40 flex flex-col">
        {/* Sidebar with favorites and tabs */}
        <div className="flex-1 overflow-hidden">
          <Sidebar />
        </div>

        {/* Space switcher at bottom-left (Arc Spaces) */}
        <div className="p-2 border-t border-border/50">
          <Dock />
        </div>
      </div>

      {/* Main content area with Timeline + Workspace */}
      <div className="flex-1 flex flex-col p-2 gap-2 relative">
        {/* Floating controls */}
        <FloatingControls />

        {/* Timeline area with rounded corners and inset */}
        <div className="flex-1 rounded-xl overflow-hidden bg-background border border-border/50 shadow-lg">
          {viewMode === 'timeline' && (
            <Timeline ref={timelineRef} onAddSpace={handleAddSpace} />
          )}

          {viewMode === 'workspace' && (
            <WorkspacePanel />
          )}

          {viewMode === 'split' && (
            <PanelGroup direction="vertical">
              {/* Timeline at top */}
              <Panel defaultSize={35} minSize={20} maxSize={50}>
                <Timeline ref={timelineRef} onAddSpace={handleAddSpace} />
              </Panel>

              {/* Resize handle */}
              <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />

              {/* Workspace content at bottom */}
              <Panel defaultSize={65}>
                <WorkspacePanel />
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
