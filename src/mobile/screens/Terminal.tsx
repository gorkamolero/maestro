import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useWebSocket } from '../hooks/useWebSocket';
import '@xterm/xterm/css/xterm.css';

export function Terminal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { isConnected, send, subscribe, on } = useWebSocket();
  const [inputSeq, setInputSeq] = useState(0);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new XTerm({
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#3f3f46',
      },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle input
    terminal.onData((data) => {
      const seq = inputSeq + 1;
      setInputSeq(seq);
      send('term:input', { id, data, seq });
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      send('term:resize', {
        id,
        cols: terminal.cols,
        rows: terminal.rows,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [id, inputSeq, send]);

  // Subscribe to terminal output
  useEffect(() => {
    if (!isConnected || !id) return;

    // Attach to terminal (requests backlog)
    subscribe('terminal', id);

    const offFrame = on('term:frame', (msg) => {
      const { id: termId, data } = msg.payload as { id: string; data: string };
      if (termId === id && terminalRef.current) {
        terminalRef.current.write(data);
      }
    });

    const offExit = on('term:exit', (msg) => {
      const { id: termId, code } = msg.payload as { id: string; code: number };
      if (termId === id && terminalRef.current) {
        terminalRef.current.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`);
      }
    });

    return () => {
      offFrame();
      offExit();
      unsubscribe('terminal', id);
    };
  }, [isConnected, id, send, subscribe, on]);

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-white">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-white font-medium">Terminal</h1>
        <div className="flex-1" />
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </header>

      {/* Terminal */}
      <div ref={containerRef} className="flex-1 p-2" />
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
