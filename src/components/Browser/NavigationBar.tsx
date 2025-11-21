import { useState, KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NavigationBarProps {
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onHome: () => void;
}

export function NavigationBar({
  url,
  isLoading,
  canGoBack,
  canGoForward,
  onNavigate,
  onRefresh,
  onGoBack,
  onGoForward,
  onHome,
}: NavigationBarProps) {
  const [urlInput, setUrlInput] = useState(url);

  const handleUrlSubmit = () => {
    onNavigate(urlInput);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Go forward"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onHome}
          title="Home"
        >
          <Home className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1">
        <Input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL or search..."
          className="h-8 text-sm"
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
