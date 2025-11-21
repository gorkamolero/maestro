import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Home, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isNavigableUrl } from './browser.utils';

interface BrowserContentProps {
  currentUrl: string;
  isLoading: boolean;
  error: string | null;
  onNavigate: (url: string) => void;
  onRetry: () => void;
}

export const BrowserContent = forwardRef<HTMLDivElement, BrowserContentProps>(
  ({ currentUrl, isLoading, error, onNavigate, onRetry }, ref) => {
    return (
      <div ref={ref} className="flex-1 relative bg-background">
        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Failed to load</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={onRetry}>Try Again</Button>
          </motion.div>
        )}

        {/* Empty state */}
        {!error && !isNavigableUrl(currentUrl) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center p-8"
          >
            <Home className="w-12 h-12 mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium mb-2">New Tab</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a URL or search query in the bar above
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Try:</span>
              <button
                onClick={() => onNavigate('https://github.com')}
                className="underline hover:text-foreground"
              >
                GitHub
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigate('https://google.com')}
                className="underline hover:text-foreground"
              >
                Google
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading overlay */}
        {isLoading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);

BrowserContent.displayName = 'BrowserContent';
