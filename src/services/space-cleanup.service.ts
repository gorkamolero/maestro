/**
 * Space Cleanup Service
 *
 * Handles destroying all resources (browser views, terminals, agents)
 * when a space is deactivated (moved to vault).
 */

import { platform } from '@/lib/platform';
import { getWorkspaceStore, type Tab } from '@/stores/workspace.store';
import { removeBrowserState } from '@/stores/browser.store';
import { windowsActions } from '@/stores/windows.store';

/**
 * Close all resources for tabs in a space
 * This destroys browser views, stops agents, and cleans up state
 */
export async function closeSpaceTabs(spaceId: string): Promise<void> {
  const store = getWorkspaceStore();
  const spaceTabs = store.tabs.filter((tab) => tab.spaceId === spaceId);

  const closePromises: Promise<void>[] = [];

  for (const tab of spaceTabs) {
    closePromises.push(closeTabResources(tab));
  }

  // Wait for all cleanup to complete
  await Promise.allSettled(closePromises);

  console.log(`[SpaceCleanup] Closed resources for ${spaceTabs.length} tabs in space ${spaceId}`);
}

/**
 * Close resources for a single tab
 */
async function closeTabResources(tab: Tab): Promise<void> {
  try {
    switch (tab.type) {
      case 'browser':
        await closeBrowserTab(tab);
        break;
      case 'terminal':
        await closeTerminalTab(tab);
        break;
      // tasks, notes, app-launcher don't have external resources
    }

    // Close any windows associated with this tab
    windowsActions.closeWindowsForTab(tab.id);
  } catch (error) {
    console.error(`[SpaceCleanup] Error closing tab ${tab.id} (${tab.type}):`, error);
  }
}

/**
 * Close a browser tab's BrowserView
 */
async function closeBrowserTab(tab: Tab): Promise<void> {
  const label = `browser-${tab.id}`;

  try {
    await platform.closeBrowserView(label);
    // Clean up browser state (URL, history)
    removeBrowserState(tab.id);
    console.log(`[SpaceCleanup] Closed browser view: ${label}`);
  } catch (error) {
    // BrowserView might not exist if tab was never activated
    console.debug(`[SpaceCleanup] Browser view ${label} not found or already closed`);
  }
}

/**
 * Close a terminal tab's PTY process
 * Note: PTY cleanup happens when the XTermWrapper component unmounts,
 * but we can trigger a force cleanup via IPC if needed
 */
async function closeTerminalTab(tab: Tab): Promise<void> {
  // Terminal PTY processes are currently cleaned up when components unmount
  // The component will unmount because the space is being hidden
  //
  // TODO: For more aggressive cleanup, we could:
  // 1. Track PTY ID in the tab's terminalState
  // 2. Call a dedicated IPC to kill PTY by tabId

  console.debug(`[SpaceCleanup] Terminal tab ${tab.id} - PTY will be cleaned up on unmount`);
}

/**
 * Get count of active resources for a space (for UI display)
 */
export function getSpaceResourceCount(spaceId: string): {
  browsers: number;
  terminals: number;
  total: number;
} {
  const store = getWorkspaceStore();
  const spaceTabs = store.tabs.filter((tab) => tab.spaceId === spaceId);

  const browsers = spaceTabs.filter((t) => t.type === 'browser').length;
  const terminals = spaceTabs.filter((t) => t.type === 'terminal').length;

  return {
    browsers,
    terminals,
    total: browsers + terminals,
  };
}
