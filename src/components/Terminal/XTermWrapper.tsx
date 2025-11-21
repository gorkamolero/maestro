import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { termiusDark, dracula, nord } from './themes';
import type { TerminalState } from './terminal.utils';
import { restoreTerminalState, saveTerminalState } from './terminal.utils';

export type TerminalTheme = 'termius-dark' | 'dracula' | 'nord';

interface XTermWrapperProps {
  segmentId: string;
  initialState?: TerminalState;
  theme?: TerminalTheme;
  onData?: (data: string) => void;
  onStateChange?: (state: TerminalState) => void;
  className?: string;
}

const THEMES = {
  'termius-dark': termiusDark,
  dracula: dracula,
  nord: nord,
};

export function XTermWrapper({
  segmentId,
  initialState,
  theme = 'termius-dark',
  onData,
  onStateChange,
  className = '',
}: XTermWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      theme: THEMES[theme],
      fontFamily: 'JetBrains Mono, Fira Code, Cascadia Code, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      scrollback: 10000,
      convertEol: true,
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    // Load WebGL addon (with fallback to canvas renderer)
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon failed to load, falling back to canvas renderer', e);
    }

    // Open terminal in container
    terminal.open(containerRef.current);

    // Fit terminal to container
    fitAddon.fit();

    // Store refs
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    isInitializedRef.current = true;

    // Restore saved state if available
    if (initialState) {
      restoreTerminalState(terminal, initialState);
    } else {
      // Welcome message for new terminals
      terminal.writeln('\x1b[1;36m╭──────────────────────────────────────────╮\x1b[0m');
      terminal.writeln(
        '\x1b[1;36m│\x1b[0m  \x1b[1mMaestro Terminal\x1b[0m                      \x1b[1;36m│\x1b[0m'
      );
      terminal.writeln('\x1b[1;36m╰──────────────────────────────────────────╯\x1b[0m');
      terminal.writeln('');
    }

    // Create PTY terminal session
    invoke('create_terminal', { segmentId })
      .then(() => {
        console.log('Terminal PTY session created for segment:', segmentId);
        // Now spawn the shell
        return invoke('create_shell', { segmentId });
      })
      .then(() => {
        console.log('Shell spawned successfully');
      })
      .catch((err) => {
        console.error('Failed to create terminal session:', err);
        terminal.writeln('\x1b[1;31mFailed to create terminal session\x1b[0m');
      });

    // Poll for terminal output using requestAnimationFrame
    let isReading = true;

    const readFromPty = async () => {
      if (!isReading) return;

      try {
        const data = await invoke<string | null>('terminal_read', { segmentId });
        if (data) {
          terminal.write(data);
        }
      } catch (err) {
        console.error('Failed to read from terminal:', err);
      }

      if (isReading) {
        window.requestAnimationFrame(readFromPty);
      }
    };

    // Start polling
    window.requestAnimationFrame(readFromPty);

    // Stop polling on cleanup
    const stopReading = () => {
      isReading = false;
    };

    // Store cleanup function
    (terminal as any)._stopReading = stopReading;

    // Handle terminal input - send to PTY
    const disposable = terminal.onData((data) => {
      console.log('Terminal input:', data);

      invoke('terminal_write', { segmentId, data })
        .catch((err) => {
          console.error('Failed to write to terminal:', err);
        });

      if (onData) {
        onData(data);
      }
    });

    // Auto-save state periodically
    const saveInterval = setInterval(() => {
      if (onStateChange && terminalRef.current) {
        const state = saveTerminalState(terminalRef.current, theme);
        onStateChange(state);
      }
    }, 5000); // Save every 5 seconds

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
          // Notify PTY of size change
          const rows = terminalRef.current.rows;
          const cols = terminalRef.current.cols;
          invoke('terminal_resize', { segmentId, rows, cols }).catch(console.error);
        } catch (e) {
          // Ignore fit errors during rapid resizing
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      disposable.dispose();
      clearInterval(saveInterval);
      resizeObserver.disconnect();

      // Stop polling
      if ((terminal as any)._stopReading) {
        (terminal as any)._stopReading();
      }

      // Close PTY session
      invoke('close_terminal', { segmentId }).catch(console.error);

      terminal.dispose();
      isInitializedRef.current = false;
    };
  }, [segmentId]); // Only re-initialize if segmentId changes

  // Update theme when it changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = THEMES[theme];
    }
  }, [theme]);

  // Public API for parent components (not used, terminal already has these methods)

  return (
    <div
      ref={containerRef}
      className={`terminal-container h-full w-full ${className}`}
      style={{
        padding: '8px',
      }}
    />
  );
}
