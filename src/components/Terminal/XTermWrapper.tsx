import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

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

    // Handle terminal input
    const disposable = terminal.onData((data) => {
      // Echo back input for now (until PTY backend is connected)
      // Handle special keys
      if (data === '\r') {
        // Enter key
        terminal.write('\r\n');
      } else if (data === '\u007F') {
        // Backspace
        terminal.write('\b \b');
      } else {
        // Regular character
        terminal.write(data);
      }

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
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
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

  // Public API for parent components
  const writeToTerminal = useCallback((data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  }, []);

  const writeLineToTerminal = useCallback((data: string) => {
    if (terminalRef.current) {
      terminalRef.current.writeln(data);
    }
  }, []);

  const clearTerminal = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.reset();
    }
  }, []);

  // Expose terminal API via ref
  useEffect(() => {
    if (terminalRef.current) {
      // Attach methods to terminal for external access
      (terminalRef.current as any).write = writeToTerminal;
      (terminalRef.current as any).writeln = writeLineToTerminal;
      (terminalRef.current as any).clear = clearTerminal;
    }
  }, [writeToTerminal, writeLineToTerminal, clearTerminal]);

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
