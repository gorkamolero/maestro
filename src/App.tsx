import { useState, useEffect, useRef } from "react";
import { Timeline, TimelineHandle } from "@/components/Timeline/Timeline";
import { Button } from "@/components/ui/button";
import { tracksActions } from "@/stores/tracks.store";
import { usePersistence } from "@/hooks/usePersistence";
import { Plus } from "lucide-react";

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
    <div className="h-screen bg-background text-foreground">
      <Timeline ref={timelineRef} onAddTrack={handleAddTrack} />
    </div>
  );
}

export default App;
