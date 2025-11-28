import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, X, Copy, Check, RefreshCw } from 'lucide-react';
import { useRemoteServer } from '@/hooks/useRemoteServer';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const EXPANDED_WIDTH = 260;

export function MobileSyncButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { pairing, connection, startPairing, stopPairing } = useRemoteServer();

  // Start pairing when expanded
  const handleExpand = useCallback(async () => {
    if (!isExpanded) {
      setIsExpanded(true);
      await startPairing(false);
    }
  }, [isExpanded, startPairing]);

  // Stop pairing when collapsed
  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    stopPairing();
    setCopied(false);
  }, [stopPairing]);

  // Countdown timer
  useEffect(() => {
    if (!pairing?.expiresAt) {
      setTimeLeft(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const updateTimeLeft = () => {
      const expires = new Date(pairing.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        handleCollapse();
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [pairing?.expiresAt, handleCollapse]);

  // Copy PIN to clipboard
  const copyPin = useCallback(async () => {
    if (!pairing?.pin) return;
    await navigator.clipboard.writeText(pairing.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pairing]); // eslint-disable-line react-hooks/preserve-manual-memoization

  // Refresh PIN
  const refreshPin = useCallback(async () => {
    await stopPairing();
    await startPairing(false);
  }, [stopPairing, startPairing]);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Trigger Button - matches Vault style */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleExpand}
            className={cn(
              'relative p-1.5 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              isExpanded && 'text-foreground bg-accent'
            )}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Pair Mobile</p>
        </TooltipContent>
      </Tooltip>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={handleCollapse}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  type: 'spring',
                  damping: 25,
                  stiffness: 400,
                }
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: -10,
                transition: { duration: 0.15 }
              }}
              className={cn(
                'absolute top-full right-0 mt-2 z-50',
                'rounded-lg overflow-hidden',
                'bg-popover border border-border',
                'shadow-lg'
              )}
              style={{ width: EXPANDED_WIDTH }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Pair Mobile</h3>
                  </div>
                </div>
                <button
                  onClick={handleCollapse}
                  className="p-1 rounded hover:bg-accent transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* PIN Display */}
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Enter this PIN on your phone
                </p>

                {pairing?.pin ? (
                  <>
                    <div
                      onClick={copyPin}
                      className={cn(
                        'px-4 py-3 rounded-md cursor-pointer transition-all',
                        'bg-muted/50 border border-border',
                        'hover:bg-muted hover:border-primary/20',
                        'active:scale-[0.98]'
                      )}
                    >
                      <div className="text-3xl font-mono font-bold text-foreground tracking-[0.3em] text-center">
                        {pairing.pin}
                      </div>
                    </div>

                    <div className="flex items-center justify-center mt-2">
                      <button
                        onClick={copyPin}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded',
                          'text-xs transition-colors',
                          copied
                            ? 'text-green-500'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    Generating PIN...
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-2 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="text-muted-foreground">
                    {timeLeft !== null && (
                      <span>
                        Expires in <span className="font-mono">{formatTime(timeLeft)}</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={refreshPin}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>

                {/* Connection URL */}
                {connection?.urls[0] && (
                  <div className="mt-2 p-1.5 rounded bg-muted/50 border border-border">
                    <p className="text-[10px] text-muted-foreground">Visit on phone:</p>
                    <p className="text-[11px] text-foreground font-mono truncate">
                      {connection.urls[0]}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
