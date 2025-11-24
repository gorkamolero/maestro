import { workspaceHistory } from './workspace.store';
import { tasksHistory } from './tasks.store';
import { spacesHistory } from './spaces.store';

/**
 * Global undo/redo actions that work across all stores
 */
export const historyActions = {
  /**
   * Undo the most recent change across all stores
   * Tries each history instance until one succeeds
   */
  undo: () => {
    if (workspaceHistory?.history?.index > 0) {
      workspaceHistory.undo();
      return true;
    }
    if (tasksHistory?.history?.index > 0) {
      tasksHistory.undo();
      return true;
    }
    if (spacesHistory?.history?.index > 0) {
      spacesHistory.undo();
      return true;
    }
    return false;
  },

  /**
   * Redo the most recently undone change across all stores
   * Tries each history instance until one succeeds
   */
  redo: () => {
    const wh = workspaceHistory?.history;
    if (wh && wh.index < wh.nodes.length - 1) {
      workspaceHistory.redo();
      return true;
    }
    const th = tasksHistory?.history;
    if (th && th.index < th.nodes.length - 1) {
      tasksHistory.redo();
      return true;
    }
    const sh = spacesHistory?.history;
    if (sh && sh.index < sh.nodes.length - 1) {
      spacesHistory.redo();
      return true;
    }
    return false;
  },

  /**
   * Check if any store can undo
   */
  canUndo: () => {
    return (
      (workspaceHistory?.history?.index ?? 0) > 0 ||
      (tasksHistory?.history?.index ?? 0) > 0 ||
      (spacesHistory?.history?.index ?? 0) > 0
    );
  },

  /**
   * Check if any store can redo
   */
  canRedo: () => {
    const wh = workspaceHistory?.history;
    const th = tasksHistory?.history;
    const sh = spacesHistory?.history;
    return (
      (wh && wh.index < wh.nodes.length - 1) ||
      (th && th.index < th.nodes.length - 1) ||
      (sh && sh.index < sh.nodes.length - 1)
    );
  },
};
