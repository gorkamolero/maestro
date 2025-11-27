import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSnapshot } from 'valtio';
import { Globe, Search, WifiOff, RotateCw } from 'lucide-react';
import { useWebview } from './useWebview';
import { BrowserToolbar } from './BrowserToolbar';
import { browserStore, getBrowserState } from '@/stores/browser.store';
import { useSpacesStore } from '@/stores/spaces.store';
import { getProfileById } from '@/stores/profile.store';
import { platform } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import type { Tab } from '@/stores/workspace.store';

interface BrowserPanelProps {
  tab: Tab;
  isActive: boolean;
}

// New Tab Page component
function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNavigate(inputValue.trim());
    }
  };

  const quickLinks = [
    { name: 'Google', url: 'https://google.com', icon: '🔍' },
    { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
    { name: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
    { name: 'Twitter', url: 'https://twitter.com', icon: '🐦' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-8 h-8 text-primary" />
        </div>

        {/* Search/URL input */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search or enter URL..."
              className="w-full pl-14 pr-6 py-4 bg-muted/50 border border-border rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              autoFocus
            />
          </div>
        </form>

        {/* Quick links */}
        <div className="flex gap-3 flex-wrap justify-center">
          {quickLinks.map((link) => (
            <button
              key={link.url}
              onClick={() => onNavigate(link.url)}
              className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors"
            >
              <span>{link.icon}</span>
              <span>{link.name}</span>
            </button>
          ))}
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground text-center">
          Type a URL or search term and press Enter
        </p>
      </div>
    </div>
  );
}

export function BrowserPanel({ tab, isActive }: BrowserPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the space this tab belongs to, then get its profile for session isolation
  const { spaces } = useSpacesStore();
  const space = spaces.find((s) => s.id === tab.spaceId);
  const profile = space?.profileId ? getProfileById(space.profileId) : null;

  // Get reactive snapshot of browser state
  const browserSnap = useSnapshot(browserStore);

  // Determine initial URL: use tab title if it's a URL, or check existing browser state, or use empty
  const getInitialUrl = () => {
    // First check if browser state already exists (set from command palette)
    const existingState = browserSnap.browsers[tab.id];
    if (existingState?.url && existingState.url !== 'about:blank') {
      return existingState.url;
    }

    // Then check if tab title looks like a URL
    if (tab.title && (tab.title.startsWith('http://') || tab.title.startsWith('https://'))) {
      return tab.title;
    }

    // Otherwise use empty string (no default URL)
    return '';
  };

  const initialUrl = getInitialUrl();

  // Initialize browser state for this tab only if it doesn't exist
  if (!browserSnap.browsers[tab.id]) {
    getBrowserState(tab.id, initialUrl);
  }

  const currentUrl = browserSnap.browsers[tab.id]?.url || initialUrl;

  // Show new tab page when URL is empty or about:blank
  const showNewTabPage = !currentUrl || currentUrl === 'about:blank';

  // Hide all browser views when showing the new tab page
  useEffect(() => {
    if (showNewTabPage && isActive) {
      platform.hideAllBrowserViews().catch(console.error);
    }
  }, [showNewTabPage, isActive]);

  // All webview logic and handlers are in the hook
  const {
    canGoBack,
    canGoForward,
    handleNavigate,
    handleGoBack,
    handleGoForward,
    handleRefresh,
    handleHome,
  } = useWebview({
    tabId: tab.id,
    initialUrl,
    containerRef,
    setIsLoading,
    setError,
    isActive,
    partition: profile?.sessionPartition,
  });

  // Show new tab page instead of webview when no URL
  if (showNewTabPage) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col bg-background pt-4 pr-4"
      >
        <NewTabPage onNavigate={handleNavigate} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background pt-4 pr-4"
    >
      {/* Toolbar with URL bar */}
      <BrowserToolbar
        url={currentUrl}
        onNavigate={handleNavigate}
        onBack={handleGoBack}
        onForward={handleGoForward}
        onReload={() => handleRefresh(currentUrl)}
        onHome={handleHome}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        isLoading={isLoading}
      />

      {/* Browser webview container */}
      <div ref={containerRef} className="flex-1 relative bg-background">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
              {/* Icon container with glassmorphism */}
              <div className="mx-auto mb-6 w-20 h-20 rounded-2xl glass-crystal border border-border/50 flex items-center justify-center">
                <WifiOff className="w-10 h-10 text-muted-foreground" />
              </div>

              {/* Error heading */}
              <h2 className="text-xl font-semibold mb-2 text-foreground">Unable to load page</h2>

              {/* Error message */}
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{error}</p>

              {/* Retry button */}
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
                size="lg"
                className="gap-2"
              >
                <RotateCw className="w-4 h-4" />
                Try Again
              </Button>

              {/* Helpful tips */}
              <div className="mt-8 text-xs text-muted-foreground">
                <p className="mb-2 font-medium">Possible solutions:</p>
                <ul className="space-y-1 text-left mx-auto inline-block">
                  <li>• Check your internet connection</li>
                  <li>• Verify the URL is correct</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/70 border-t border-border/50 select-none">
        <span>{currentUrl}</span>
      </div>
    </motion.div>
  );
}
