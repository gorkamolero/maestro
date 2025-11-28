import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { spacesHistory } from '@/stores/spaces.store';
import { workspaceHistory, workspaceActions } from '@/stores/workspace.store';
import { browserHistory } from '@/stores/browser.store';

export function SpaceSync() {
  const { spaces } = useSnapshot(spacesHistory);
  const { tabs } = useSnapshot(workspaceHistory);
  const browserState = useSnapshot(browserHistory);
  
  // Sync spaces to main process
  useEffect(() => {
    const payload = spaces.map(s => ({
      id: s.id,
      name: s.name,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      icon: s.icon,
      lastActiveAt: s.lastActiveAt,
      connectedRepo: s.connectedRepo,
      tabs: tabs.filter(t => t.spaceId === s.id).map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        url: t.type === 'browser' ? browserState.browsers[t.id]?.url : undefined,
        terminalId: t.terminalState ? t.id : undefined,
        content: t.type === 'notes' ? 'Notes content not synced yet' : undefined,
        agentId: t.type === 'agent' ? 'agent-id-placeholder' : undefined, // We need to link agent tabs to sessions eventually
      })),
    }));
    
    window.electron.send('spaces:update', payload);
  }, [spaces, tabs, browserState]);

  // Listen for remote commands
  useEffect(() => {
    const removeCreateTab = window.electron.on('spaces:create-tab', (data) => {
      const { spaceId, type } = data as { spaceId: string; type: string; url?: string };
      // Map string type to TabType
      if (type === 'browser' || type === 'terminal' || type === 'notes' || type === 'agent') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workspaceActions.openTab(spaceId, type as any, type === 'browser' ? 'New Tab' : type, {
          // For browser, we might want to set initial URL, but openTab creates generic tab.
          // We might need to navigate after creation if URL provided.
        });
        // TODO: If browser and URL, handle navigation
      }
    });

    const removeCreateTerminal = window.electron.on('spaces:create-terminal', (data) => {
      const { spaceId } = data as { spaceId: string };
      workspaceActions.openTab(spaceId, 'terminal', 'Terminal');
    });

    return () => {
      removeCreateTab();
      removeCreateTerminal();
    };
  }, []);
  
  return null;
}
