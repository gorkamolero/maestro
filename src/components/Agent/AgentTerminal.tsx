import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

interface AgentTerminalProps {
  sessionId: string;
  className?: string;
  onReady?: () => void;
}

/**
 * AgentTerminal renders raw PTY output using xterm.js
 *
 * Per spec: "For real-time terminal rendering in Maestro's Control Room,
 * wrap Claude Code with node-pty and xterm.js"
 */
export function AgentTerminal({ sessionId, className, onReady }: AgentTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle resize
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      fitAddonRef.current.fit();
      const { cols, rows } = terminalRef.current;
      window.agent.ptyResize(sessionId, cols, rows);
    }
  }, [sessionId]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"JetBrains Mono Variable", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#0d0d0d',
        foreground: '#e4e4e4',
        cursor: '#e4e4e4',
        cursorAccent: '#0d0d0d',
        selectionBackground: '#3b3b3b',
        black: '#0d0d0d',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#e4e4e4',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 5000,
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in container
    terminal.open(containerRef.current);

    // Try to use WebGL for better performance
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
    } catch (e) {
      console.warn('[AgentTerminal] WebGL not available, using canvas renderer');
    }

    // Fit to container
    fitAddon.fit();

    // Store refs
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Subscribe to PTY data
    const unsubscribe = window.agent.onPtyData((data) => {
      if (data.sessionId === sessionId) {
        terminal.write(data.data);
      }
    });

    // Handle terminal input - send to PTY
    const disposable = terminal.onData((data) => {
      window.agent.ptyWrite(sessionId, data);
    });

    // Send initial size to PTY
    const { cols, rows } = terminal;
    window.agent.ptyResize(sessionId, cols, rows);

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup function
    cleanupRef.current = () => {
      unsubscribe();
      disposable.dispose();
      resizeObserver.disconnect();
      terminal.dispose();
    };

    onReady?.();

    return () => {
      cleanupRef.current?.();
    };
  }, [sessionId, handleResize, onReady]);

  // Handle external resize events
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0d0d0d',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}

/**
 * Hook to use agent terminal in PTY mode
 */
export function useAgentTerminal(sessionId: string) {
  const startPtySession = useCallback(
    async (workDir: string, prompt: string, permissionMode: 'acceptEdits' | 'askUser' | 'planOnly') => {
      return window.agent.start({
        sessionId,
        workDir,
        prompt,
        permissionMode,
        mode: 'pty',
      });
    },
    [sessionId]
  );

  const stopSession = useCallback(() => {
    return window.agent.stop(sessionId);
  }, [sessionId]);

  const write = useCallback(
    (data: string) => {
      window.agent.ptyWrite(sessionId, data);
    },
    [sessionId]
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      window.agent.ptyResize(sessionId, cols, rows);
    },
    [sessionId]
  );

  return {
    startPtySession,
    stopSession,
    write,
    resize,
  };
}
