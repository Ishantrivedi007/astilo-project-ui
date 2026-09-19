import { apiClient } from "./apiClient";

export interface MessengerContact {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  lastSeen: string | null;
}

export interface DirectMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string | null;
  body: string;
  createdAt: string | null;
  editedAt: string | null;
  readAt: string | null;
}

export interface MessengerConversation {
  id: number;
  isGroup: boolean;
  name: string;
  participants: { id: number; name: string; avatar: string | null }[];
  lastMessage: DirectMessage | null;
  unreadCount: number;
  lastActivityAt: string;
}

export const fetchContacts = () => apiClient.get<MessengerContact[]>("/messenger/contacts").then((r) => r.data);

export interface PersonalContact {
  id: number;
  contactId: number;
  name: string;
  realName: string;
  email: string;
  avatar: string | null;
  nickname: string | null;
  createdAt: string | null;
}

export const fetchMyContacts = () => apiClient.get<PersonalContact[]>("/messenger/my-contacts").then((r) => r.data);

export const addMyContact = (lookup: string, nickname?: string) =>
  apiClient.post<PersonalContact>("/messenger/my-contacts", { lookup, nickname }).then((r) => r.data);

export const renameMyContact = (id: number, nickname: string | null) =>
  apiClient.put<PersonalContact>(`/messenger/my-contacts/${id}`, { nickname }).then((r) => r.data);

export const removeMyContact = (id: number) => apiClient.delete(`/messenger/my-contacts/${id}`).then((r) => r.data);

export const qrCodeUrl = (data: string, size = 220) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

export const fetchConversations = () => apiClient.get<MessengerConversation[]>("/messenger/conversations").then((r) => r.data);

export const startConversation = (userId: number) =>
  apiClient.post<{ id: number; created: boolean }>("/messenger/conversations", { userId }).then((r) => r.data);

export const fetchDirectMessages = (conversationId: number) =>
  apiClient.get<DirectMessage[]>("/messenger/messages", { params: { conversation_id: conversationId } }).then((r) => r.data);

export const sendDirectMessage = (conversationId: number, body: string) =>
  apiClient.post<DirectMessage>("/messenger/messages", { conversationId, body }).then((r) => r.data);

export const editDirectMessage = (id: number, body: string) =>
  apiClient.put<DirectMessage>(`/messenger/messages/${id}`, { body }).then((r) => r.data);

export const deleteDirectMessage = (id: number) => apiClient.delete(`/messenger/messages/${id}`).then((r) => r.data);
