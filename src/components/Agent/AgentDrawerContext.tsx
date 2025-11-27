import { createContext, useContext } from 'react';

/**
 * Context for passing tab info to AgentDrawer views
 */
export interface AgentDrawerContextValue {
  tabId: string;
  spaceId: string;
  defaultWorkDir?: string;
  onMaximize?: () => void;
}

export const AgentDrawerContext = createContext<AgentDrawerContextValue | null>(null);

/**
 * Hook to access AgentDrawer context in child views
 * @throws Error if used outside AgentDrawer
 */
export function useAgentDrawerContext(): AgentDrawerContextValue {
  const ctx = useContext(AgentDrawerContext);
  if (!ctx) throw new Error('useAgentDrawerContext must be used within AgentDrawer');
  return ctx;
}
