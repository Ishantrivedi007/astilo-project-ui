import { apiClient } from "./apiClient";

export type NotificationModule =
  | "kanban"
  | "research"
  | "calendar"
  | "nimrose"
  | "cosmos"
  | "markets"
  | "library"
  | "store"
  | "vault"
  | "messenger"
  | "office";

export interface AppNotification {
  id: number;
  module: NotificationModule;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string | null;
}

export interface NotificationsResult {
  results: AppNotification[];
  unreadCount: number;
}

export const fetchNotifications = (params?: { module?: string; unreadOnly?: boolean; limit?: number }) =>
  apiClient
    .get<NotificationsResult>("/notifications", {
      params: {
        module: params?.module,
        unread_only: params?.unreadOnly ? 1 : undefined,
        limit: params?.limit,
      },
    })
    .then((r) => r.data);

export const markNotificationRead = (id: number, read = true) =>
  apiClient.put<AppNotification>(`/notifications/${id}`, { read }).then((r) => r.data);

export const markAllNotificationsRead = () =>
  apiClient.put(`/notifications/read-all`, {}).then((r) => r.data);

export const deleteNotification = (id: number) => apiClient.delete(`/notifications/${id}`).then((r) => r.data);

export const clearAllNotifications = () => apiClient.delete(`/notifications/all`).then((r) => r.data);
