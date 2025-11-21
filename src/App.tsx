import { useState, useEffect } from "react";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-8">
        <h1 className="text-4xl font-bold">Maestro</h1>
        <p className="text-muted-foreground">Phase 1: Ready to build</p>
      </div>
    </div>
  );
}

export default App;
