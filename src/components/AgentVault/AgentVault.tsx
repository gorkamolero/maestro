// Agent Vault - A morphing drawer that expands from a compact pill to a full agent control panel
// Inspired by cult-ui FamilyDrawer

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgentMonitorStore } from '@/stores/agent-monitor.store';
import type { AgentSession } from '@/types/agent-events';
import { PillView } from './PillView';
import { ListView } from './ListView';
import { DetailView } from './DetailView';

export type AgentVaultView = 'pill' | 'list' | 'detail';

export function AgentVault() {
  const [view, setView] = useState<AgentVaultView>('pill');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const store = useAgentMonitorStore();

  // Get active/idle sessions (not ended)
  const sessions = Object.values(store.sessions).filter(
    (s): s is AgentSession => s !== undefined && s.status !== 'ended'
  );

  const selectedSession = selectedSessionId ? store.sessions[selectedSessionId] : null;

  // Auto-collapse when no agents
  useEffect(() => {
    if (sessions.length === 0 && view !== 'pill') {
      setView('pill');
    }
  }, [sessions.length, view]);

  const handleSelectAgent = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedSessionId(null);
    setView('list');
  }, []);

  const handleToggle = useCallback(() => {
    if (view === 'pill') {
      setView('list');
    } else {
      setView('pill');
      setSelectedSessionId(null);
    }
  }, [view]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+A to toggle
      if (e.metaKey && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        handleToggle();
      }

      // Escape to go back or collapse
      if (e.key === 'Escape') {
        if (view === 'detail') {
          handleBack();
        } else if (view === 'list') {
          setView('pill');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleToggle, handleBack]);

  // Don't render if no agents ever detected
  if (sessions.length === 0 && Object.keys(store.sessions).length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        layout
        className="bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <AnimatePresence mode="wait">
          {view === 'pill' && (
            <PillView key="pill" sessions={sessions} onExpand={handleToggle} />
          )}

          {view === 'list' && (
            <ListView
              key="list"
              sessions={sessions}
              onCollapse={handleToggle}
              onSelectAgent={handleSelectAgent}
            />
          )}

          {view === 'detail' && selectedSession && (
            <DetailView
              key="detail"
              session={selectedSession}
              onBack={handleBack}
              onCollapse={handleToggle}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
