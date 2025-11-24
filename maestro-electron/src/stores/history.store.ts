import { workspaceHistory } from './workspace.store';
import { tasksHistory } from './tasks.store';
import { spacesHistory } from './spaces.store';

// Store all history instances
const histories = [workspaceHistory, tasksHistory, spacesHistory];

/**
 * Global undo/redo actions that work across all stores
 */
export const historyActions = {
  /**
   * Undo the most recent change across all stores
   * Tries each history instance until one succeeds
   */
  undo: () => {
    for (const history of histories) {
      // Check if we can undo using the history nodes
      if (history.history.index > 0) {
        history.undo();
        return true;
      }
    }
    return false;
  },

  /**
   * Redo the most recently undone change across all stores
   * Tries each history instance until one succeeds
   */
  redo: () => {
    for (const history of histories) {
      // Check if we can redo using the history nodes
      if (history.history.index < history.history.nodes.length - 1) {
        history.redo();
        return true;
      }
    }
    return false;
  },

  /**
   * Check if any store can undo
   */
  canUndo: () => {
    return histories.some((history) => history.history.index > 0);
  },

  /**
   * Check if any store can redo
   */
  canRedo: () => {
    return histories.some((history) => history.history.index < history.history.nodes.length - 1);
  },
};
