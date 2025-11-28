import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { ActivityFeed } from '../components/ActivityFeed';
import { QuickActions } from '../components/QuickActions';
import { StatusBadge } from '@shared/components/StatusBadge';
import type { AgentInfo, AgentActivity } from '@shared/types';

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, subscribe, on } = useWebSocket();

  // Fetch agent and activities
  useEffect(() => {
    if (!id) return;
    
    Promise.all([
      api.get<AgentInfo>(`/api/agents/${id}`),
      api.get<{ activities: AgentActivity[] }>(`/api/agents/${id}/activities?limit=50`),
    ])
      .then(([agentData, { activities: acts }]) => {
        setAgent(agentData);
        setActivities(acts);
        setIsLoading(false);
      })
      .catch(console.error);
  }, [id]);

  // Subscribe to updates
  useEffect(() => {
    if (!isConnected || !id) return;

    subscribe('agent', id);

    const offActivity = on('agent:activity', (msg) => {
      const activity = msg.payload as AgentActivity;
      if (activity.sessionId === id) {
        setActivities(prev => [activity, ...prev].slice(0, 100));
      }
    });

    const offUpdated = on('agent:updated', (msg) => {
      const updated = msg.payload as AgentInfo;
      if (updated.id === id) {
        setAgent(updated);
      }
    });

    return () => {
      offActivity();
      offUpdated();
    };
  }, [isConnected, id, subscribe, on]);

  // Send input to agent terminal
  const sendInput = async (text: string) => {
    if (!id) return;
    await api.post(`/api/agents/${id}/input`, { text });
  };

  if (isLoading || !agent) {
    return (
      <div className="min-h-screen bg-surface-primary text-content-primary flex items-center justify-center">
        <div className="animate-pulse text-content-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary text-content-primary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-primary/90 backdrop-blur-lg border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg active:bg-surface-hover transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-content-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-page-title font-semibold truncate">{agent.projectName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={agent.status} size="sm" />
              <span className="text-small text-content-tertiary">{agent.type === 'claude-code' ? 'Claude Code' : agent.type}</span>
            </div>
          </div>
          {agent.terminalId && (
            <Link
              to={`/terminal/${agent.terminalId}`}
              className="px-3 py-1.5 bg-surface-card border border-white/[0.06] rounded-button text-small font-medium text-content-primary active:bg-surface-hover transition-colors"
            >
              Terminal
            </Link>
          )}
        </div>
      </header>

      {/* Quick Actions */}
      {agent.status === 'needs_input' && (
        <div className="border-b border-white/[0.06] bg-status-warning/5">
          <QuickActions onSend={sendInput} />
        </div>
      )}

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto">
        <ActivityFeed activities={activities} />
      </div>

      {/* Input Bar */}
      <InputBar onSend={sendInput} />
    </div>
  );
}

function InputBar({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-surface-primary/95 backdrop-blur-lg border-t border-white/[0.06] p-3"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Send input..."
          className="flex-1 bg-surface-card border border-white/[0.06] rounded-input px-3 py-2.5 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2.5 bg-accent text-white font-medium text-sm rounded-button disabled:opacity-40 active:bg-accent-hover transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
