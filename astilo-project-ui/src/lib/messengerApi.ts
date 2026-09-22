import { API_BASE_URL, apiClient, getAuthToken } from "./apiClient";

export interface MessengerContact {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  lastSeen: string | null;
}

export interface MessageAttachment {
  fileName: string;
  contentType: string;
  sizeBytes: number | null;
  url: string;
}

export interface SharedContact {
  userId: number;
  name: string;
  email: string;
  avatar: string | null;
}

export type MessageKind = "text" | "image" | "file" | "contact" | "sticker";

export interface DirectMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string | null;
  body: string;
  kind: MessageKind;
  attachment: MessageAttachment | null;
  contact: SharedContact | null;
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
  apiClient.post<DirectMessage>("/messenger/messages", { conversationId, body, kind: "text" }).then((r) => r.data);

export interface UploadedAttachment {
  storedName: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  isImage: boolean;
}

export const uploadMessageAttachment = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post<UploadedAttachment>("/messenger/attachments", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};

export const sendAttachmentMessage = (conversationId: number, upload: UploadedAttachment, caption = "") =>
  apiClient
    .post<DirectMessage>("/messenger/messages", {
      conversationId,
      body: caption,
      kind: upload.isImage ? "image" : "file",
      attachmentStoredName: upload.storedName,
      attachmentFileName: upload.fileName,
      attachmentContentType: upload.contentType,
      attachmentSizeBytes: upload.sizeBytes,
    })
    .then((r) => r.data);

export const sendStickerMessage = (conversationId: number, emoji: string) =>
  apiClient.post<DirectMessage>("/messenger/messages", { conversationId, body: emoji, kind: "sticker" }).then((r) => r.data);

export const sendContactMessage = (conversationId: number, contact: SharedContact) =>
  apiClient.post<DirectMessage>("/messenger/messages", { conversationId, body: "", kind: "contact", contact }).then((r) => r.data);

/** An attachment's raw file URL for an <img src> or download link, which
 * can't carry an Authorization header — the token goes as a query param
 * instead, same pattern as the Nimrose ticket-attachment file URLs. */
export const attachmentFileUrl = (attachment: MessageAttachment): string => {
  const token = getAuthToken();
  const base = `${API_BASE_URL}${attachment.url}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

export const editDirectMessage = (id: number, body: string) =>
  apiClient.put<DirectMessage>(`/messenger/messages/${id}`, { body }).then((r) => r.data);

export const deleteDirectMessage = (id: number) => apiClient.delete(`/messenger/messages/${id}`).then((r) => r.data);
