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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Agents</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <Link to="/settings" className="p-2 -m-2">
              <SettingsIcon className="w-5 h-5 text-white/60" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {isLoading ? (
          <div className="text-center text-white/50 py-12">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            No active agents
          </div>
        ) : (
          <>
            {/* Needs Input - Top Priority */}
            {needsInput.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-3">
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
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
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
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
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

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}