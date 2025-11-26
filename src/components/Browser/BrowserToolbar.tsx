import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Home } from 'lucide-react';

interface BrowserToolbarProps {
  url: string;
  onNavigate: (url: string) => void;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
}

export function BrowserToolbar({
  url,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onHome,
  canGoBack = false,
  canGoForward = false,
  isLoading = false,
}: BrowserToolbarProps) {
  const [inputUrl, setInputUrl] = useState(url);

  // Update input when URL prop changes (from back/forward navigation)
  useEffect(() => {
    setInputUrl(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(inputUrl);
  };

  return (
    <div className="h-14 flex items-center gap-2 px-3 border-b border-border/50 bg-black">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="p-1.5 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onForward}
          disabled={!canGoForward}
          className="p-1.5 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onReload}
          className="p-1.5 rounded hover:bg-accent"
          title="Reload"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onHome}
          className="p-1.5 rounded hover:bg-accent"
          title="Home"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* URL bar */}
      <form onSubmit={handleSubmit} className="flex-1">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Enter URL or search..."
          className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </form>
    </div>
  );
}
