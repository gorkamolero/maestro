import { proxy } from 'valtio';

export type NotificationType =
  | 'agent-done'
  | 'agent-error'
  | 'agent-info'
  | 'agent-needs-input'
  | 'build-failed'
  | 'build-success'
  | 'process-crashed'
  | 'mention';

export interface Notification {
  id: string;
  spaceId: string;
  tabId?: string;
  type: NotificationType;
  title?: string;
  message: string;
  createdAt: string;
}

interface NotificationsState {
  notifications: Notification[];
}

export const notificationsStore = proxy<NotificationsState>({
  notifications: [],
});

export const notificationsActions = {
  add: (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    notificationsStore.notifications.push({
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
  },

  dismiss: (id: string) => {
    const index = notificationsStore.notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      notificationsStore.notifications.splice(index, 1);
    }
  },

  dismissAllForSpace: (spaceId: string) => {
    notificationsStore.notifications = notificationsStore.notifications.filter(
      (n) => n.spaceId !== spaceId
    );
  },

  getForSpace: (spaceId: string) => {
    return notificationsStore.notifications.filter((n) => n.spaceId === spaceId);
  },

  getLatestForSpace: (spaceId: string) => {
    const spaceNotifications = notificationsStore.notifications
      .filter((n) => n.spaceId === spaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return spaceNotifications[0] || null;
  },
};

// Re-export for convenience
export function useNotificationsForSpace(spaceId: string) {
  return notificationsStore.notifications.filter((n) => n.spaceId === spaceId);
}
