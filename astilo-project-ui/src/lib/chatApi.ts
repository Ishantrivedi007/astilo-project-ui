import { apiClient } from "./apiClient";

export interface ChatChannel {
  id: number;
  name: string;
  topic: string | null;
  archived: boolean;
  createdAt: string | null;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  authorName: string;
  isBot: boolean;
  body: string;
  createdAt: string | null;
  editedAt: string | null;
}

export const fetchChatChannels = () => apiClient.get<ChatChannel[]>("/chat/channels").then((r) => r.data);

export const createChatChannel = (name: string, topic?: string) =>
  apiClient.post<ChatChannel>("/chat/channels", { name, topic }).then((r) => r.data);

export const updateChatChannel = (id: number, patch: Partial<{ name: string; topic: string | null; archived: boolean }>) =>
  apiClient.put<ChatChannel>(`/chat/channels/${id}`, patch).then((r) => r.data);

export const deleteChatChannel = (id: number) => apiClient.delete(`/chat/channels/${id}`).then((r) => r.data);

export const fetchChatMessages = (channelId: number, afterId?: number) =>
  apiClient.get<ChatMessage[]>("/chat/messages", { params: { channel_id: channelId, after_id: afterId } }).then((r) => r.data);

export const sendChatMessage = (channelId: number, body: string) =>
  apiClient
    .post<{ message: ChatMessage; botMessage: ChatMessage | null }>("/chat/messages", { channelId, body })
    .then((r) => r.data);

export const editChatMessage = (id: number, body: string) =>
  apiClient.put<ChatMessage>(`/chat/messages/${id}`, { body }).then((r) => r.data);

export const deleteChatMessage = (id: number) => apiClient.delete(`/chat/messages/${id}`).then((r) => r.data);
