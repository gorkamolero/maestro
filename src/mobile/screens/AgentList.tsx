import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { AgentCard } from '../components/AgentCard';
import type { AgentInfo } from '@shared/types';

export function AgentList() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, subscribe, on } = useWebSocket();

  // Initial fetch
  useEffect(() => {
    api.get<{ agents: AgentInfo[] }>('/api/agents')
      .then(({ agents }) => {
        setAgents(agents);
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  // Subscribe to updates
  useEffect(() => {
    if (!isConnected) return;
    
    subscribe('agents');

    const offUpdated = on('agent:updated', (msg) => {
      const updated = msg.payload as AgentInfo;
      setAgents(prev => {
        const idx = prev.findIndex(a => a.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    });

    const offEnded = on('agent:ended', (msg) => {
      const { id } = msg.payload as { id: string };
      setAgents(prev => prev.filter(a => a.id !== id));
    });

    return () => {
      offUpdated();
      offEnded();
    };
  }, [isConnected, subscribe, on]);

  const needsInput = agents.filter(a => a.status === 'needs_input');
  const active = agents.filter(a => a.status === 'active');
  const idle = agents.filter(a => a.status === 'idle');

  return (
    <div className="min-h-screen bg-surface-primary text-content-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-primary/90 backdrop-blur-lg border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title font-semibold">Agents</h1>
          <div className="flex items-center gap-3">
            <ConnectionIndicator connected={isConnected} />
            <Link to="/more" className="p-2 -m-2 active:opacity-60 transition-opacity">
              <SettingsIcon className="w-5 h-5 text-content-tertiary" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {isLoading ? (
          <LoadingState />
        ) : agents.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Needs Input - Top Priority */}
            {needsInput.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-status-warning uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-warning opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-warning" />
                  </span>
                  Needs Input ({needsInput.length})
                </h2>
                <div className="space-y-2">
                  {needsInput.map(agent => (
                    <AgentCard key={agent.id} agent={agent} highlight />
                  ))}
                </div>
              </section>
            )}

            {/* Active */}
            {active.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-3">
                  Active ({active.length})
                </h2>
                <div className="space-y-2">
                  {active.map(agent => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </section>
            )}

            {/* Idle */}
            {idle.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-3">
                  Idle ({idle.length})
                </h2>
                <div className="space-y-2">
                  {idle.map(agent => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <span className="text-small text-content-tertiary">
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-surface-card rounded-card animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-surface-card flex items-center justify-center mb-4">
        <BotIcon className="w-8 h-8 text-content-tertiary" />
      </div>
      <p className="text-content-secondary font-medium">No active agents</p>
      <p className="text-content-tertiary text-small mt-1">
        Start a Claude Code session on your Mac
      </p>
    </div>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      <path d="M12 2v4M8 6h8" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}