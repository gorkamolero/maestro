// Agent Vault - A morphing drawer that expands from a compact pill to a full agent control panel
// Inspired by cult-ui FamilyDrawer

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgentMonitorStore } from '@/stores/agent-monitor.store';
import { useAgentVaultStore, agentVaultActions } from '@/stores/agent-vault.store';
import { windowsActions } from '@/stores/windows.store';
import { workspaceActions } from '@/stores/workspace.store';
import type { AgentSession } from '@/types/agent-events';
import { PillView } from './PillView';
import { ListView } from './ListView';
import { DetailView } from './DetailView';

export type AgentVaultView = 'pill' | 'list' | 'detail';

export function AgentVault() {
  const vaultStore = useAgentVaultStore();
  const monitorStore = useAgentMonitorStore();

  // Get active/idle sessions (not ended)
  const sessions = Object.values(monitorStore.sessions).filter(
    (s): s is AgentSession => s !== undefined && s.status !== 'ended'
  );

  const selectedSession = vaultStore.selectedSessionId
    ? monitorStore.sessions[vaultStore.selectedSessionId]
    : null;

  // Debug
  console.log('[AgentVault] view:', vaultStore.view, 'selectedId:', vaultStore.selectedSessionId, 'session:', selectedSession?.id);

  const handleSelectAgent = useCallback((sessionId: string) => {
    agentVaultActions.selectAgent(sessionId);
  }, []);

  const handleBack = useCallback(() => {
    agentVaultActions.back();
  }, []);

  const handleToggle = useCallback(() => {
    if (vaultStore.view === 'pill') {
      agentVaultActions.setView('list');
    } else {
      agentVaultActions.collapse();
    }
  }, [vaultStore.view]);

  // Jump to terminal handler - opens the terminal window for the agent
  const handleJumpToTerminal = useCallback((tabId: string, spaceId: string) => {
    // Switch to the space
    workspaceActions.setActiveSpace(spaceId);

    // Open the terminal window
    windowsActions.openWindow(tabId, 'floating');

    // Collapse the vault after jumping
    agentVaultActions.collapse();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+A to toggle
      if (e.metaKey && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        handleToggle();
      }

      // Cmd+J to jump to terminal (when viewing a session with terminal link)
      if (e.metaKey && e.key === 'j') {
        if (vaultStore.view === 'detail' && selectedSession?.terminalTabId && selectedSession?.spaceId) {
          e.preventDefault();
          handleJumpToTerminal(selectedSession.terminalTabId, selectedSession.spaceId);
        }
      }

      // Escape to go back or collapse
      if (e.key === 'Escape') {
        if (vaultStore.view === 'detail') {
          handleBack();
        } else if (vaultStore.view === 'list') {
          agentVaultActions.collapse();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vaultStore.view, handleToggle, handleBack, handleJumpToTerminal, selectedSession]);

  // Don't render if no agents ever detected
  if (sessions.length === 0 && Object.keys(monitorStore.sessions).length === 0) {
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
          {vaultStore.view === 'pill' && (
            <PillView key="pill" sessions={sessions} onExpand={handleToggle} />
          )}

          {vaultStore.view === 'list' && (
            <ListView
              key="list"
              sessions={sessions}
              onCollapse={handleToggle}
              onSelectAgent={handleSelectAgent}
              onJumpToTerminal={handleJumpToTerminal}
            />
          )}

          {vaultStore.view === 'detail' && selectedSession && (
            <DetailView
              key="detail"
              session={selectedSession}
              onBack={handleBack}
              onCollapse={handleToggle}
              onJumpToTerminal={handleJumpToTerminal}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
