import React from 'react';
import { Link } from 'react-router-dom';
import type { TabInfo } from '@shared/types';

interface TabContentProps {
  tab: TabInfo;
  spaceId?: string; // Optional if unused but kept for interface consistency
}

export function TabContent({ tab }: TabContentProps) {
  switch (tab.type) {
    case 'terminal':
      return <TerminalPreview terminalId={tab.terminalId} />;
    case 'browser':
      return <BrowserPreview url={tab.url} />;
    case 'notes':
      return <NotesPreview content={tab.content} />;
    case 'agent':
      return <AgentPreview agentId={tab.agentId} />;
    default:
      return <GenericPreview tab={tab} />;
  }
}

// Terminal: Show preview, tap to go fullscreen
function TerminalPreview({ terminalId }: { terminalId?: string }) {
  if (!terminalId) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Terminal not connected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mini preview would go here - could show last few lines */}
      <div className="flex-1 bg-[#0a0a0a] p-4">
        <p className="text-white/30 font-mono text-sm">Terminal session active</p>
      </div>
      
      <Link
        to={`/terminal/${terminalId}`}
        className="flex-none p-4 bg-white/5 border-t border-white/10 text-center"
      >
        <span className="text-blue-400 font-medium">Open Terminal Fullscreen →</span>
      </Link>
    </div>
  );
}

// Browser: Show URL and screenshot/preview
function BrowserPreview({ url }: { url?: string }) {
  if (!url) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        No URL loaded
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="flex-none px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white/60 truncate">
          {url}
        </div>
      </div>
      
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🌐</div>
          <p className="text-white/50 text-sm mb-4">
            Browser tabs can't be viewed on mobile
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-white/10 rounded-lg text-sm"
          >
            Open in Safari →
          </a>
        </div>
      </div>
    </div>
  );
}

// Notes: Show content preview
function NotesPreview({ content }: { content?: string }) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {content ? (
        <div className="prose prose-invert prose-sm max-w-none">
          {/* Render markdown or plain text */}
          <p className="text-white/80 whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        <p className="text-white/40">Empty note</p>
      )}
    </div>
  );
}

// Agent: Link to agent detail
function AgentPreview({ agentId }: { agentId?: string }) {
  if (!agentId) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        No agent linked
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <Link
        to={`/agent/${agentId}`}
        className="text-center"
      >
        <div className="text-4xl mb-4">🤖</div>
        <span className="text-blue-400 font-medium">View Agent →</span>
      </Link>
    </div>
  );
}

function GenericPreview({ tab }: { tab: TabInfo }) {
  return (
    <div className="h-full flex items-center justify-center text-white/40">
      <div className="text-center">
        <div className="text-4xl mb-4">📄</div>
        <p>{tab.type} tab</p>
      </div>
    </div>
  );
}
