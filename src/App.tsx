import { useState, useEffect, useRef } from "react";
import { Timeline, TimelineHandle } from "@/components/Timeline/Timeline";
import { TabBar } from "@/components/Tabs/TabBar";
import { TabContent } from "@/components/Tabs/TabContent";
import { Button } from "@/components/ui/button";
import { tracksActions } from "@/stores/tracks.store";
import { usePersistence } from "@/hooks/usePersistence";
import { useSnapshot } from "valtio";
import { tabsStore } from "@/stores/tabs.store";
import { Plus } from "lucide-react";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const timelineRef = useRef<TimelineHandle>(null);
  const { tabs } = useSnapshot(tabsStore);

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
    <div className="h-screen bg-background text-foreground flex flex-col">
      <TabBar />
      <div className="flex-1 flex">
        {tabs.length > 0 && (
          <div className="w-1/2 border-r border-border flex flex-col">
            <TabContent />
          </div>
        )}
        <div className={tabs.length > 0 ? "w-1/2" : "w-full"}>
          <Timeline ref={timelineRef} onAddTrack={handleAddTrack} />
        </div>
      </div>
    </div>
  );
}

export default App;
