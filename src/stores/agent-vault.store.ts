// Agent Vault Store
// Controls the vault's open state and selected agent

import { proxy, useSnapshot } from 'valtio';

interface AgentVaultState {
  isOpen: boolean;
  view: 'pill' | 'list' | 'detail';
  selectedSessionId: string | null;
}

export const agentVaultStore = proxy<AgentVaultState>({
  isOpen: false,
  view: 'pill',
  selectedSessionId: null,
});

export function useAgentVaultStore() {
  return useSnapshot(agentVaultStore);
}

export const agentVaultActions = {
  openToAgent(sessionId: string) {
    console.log('[AgentVault] Opening to agent:', sessionId);
    agentVaultStore.isOpen = true;
    agentVaultStore.view = 'detail';
    agentVaultStore.selectedSessionId = sessionId;
  },

  openList() {
    agentVaultStore.isOpen = true;
    agentVaultStore.view = 'list';
    agentVaultStore.selectedSessionId = null;
  },

  collapse() {
    agentVaultStore.view = 'pill';
    agentVaultStore.selectedSessionId = null;
  },

  setView(view: AgentVaultState['view']) {
    agentVaultStore.view = view;
  },

  selectAgent(sessionId: string) {
    agentVaultStore.view = 'detail';
    agentVaultStore.selectedSessionId = sessionId;
  },

  back() {
    agentVaultStore.view = 'list';
    agentVaultStore.selectedSessionId = null;
  },
};
