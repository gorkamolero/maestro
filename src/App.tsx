import { useState, useEffect, useRef } from "react";
import { Timeline, TimelineHandle } from "@/components/Timeline/Timeline";
import { Button } from "@/components/ui/button";
import { tracksActions } from "@/stores/tracks.store";
import { Plus } from "lucide-react";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const timelineRef = useRef<TimelineHandle>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleAddTrack = () => {
    const trackNumber = Math.floor(Math.random() * 1000);
    tracksActions.addTrack(`Track ${trackNumber}`);
    // Center viewport on NOW after adding track
    timelineRef.current?.centerOnNow();
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <h1 className="text-lg font-semibold">Maestro</h1>
        <Button size="sm" onClick={handleAddTrack}>
          <Plus className="w-4 h-4 mr-1" />
          Add Track
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <Timeline ref={timelineRef} />
      </div>
    </div>
  );
}

export default App;
