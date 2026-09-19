import { API_BASE_URL, apiClient, getAuthToken } from "./apiClient";

export type TicketType = "feature" | "bug" | "task" | "improvement" | "research" | "design" | "documentation";
export type TicketPriority = "low" | "medium" | "high" | "critical";
// A project's board columns are user-defined (see NimroseBoardColumn), so a
// ticket's status is whatever slug that project currently has — not a
// fixed set of literals.
export type TicketStatus = string;
export type TicketLinkRelation = "blocks" | "blocked_by" | "depends_on" | "related_to" | "duplicate" | "parent" | "child";
export type SprintStatus = "planned" | "active" | "completed";

export interface BoardColumn {
  id: number;
  projectId: number;
  name: string;
  slug: string;
  position: number;
  isDone: boolean;
}

export interface NimroseSprint {
  id: number;
  projectId: number;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  createdAt: string | null;
}

export interface TicketLink {
  id: number;
  relation: TicketLinkRelation;
  linkedTicketId: number;
  linkedTicketKey: string | null;
  linkedTicketTitle: string | null;
  linkedTicketStatus: TicketStatus | null;
}

export interface NimroseTicket {
  id: number;
  projectId: number;
  projectName: string | null;
  sprintId: number | null;
  sprintName: string | null;
  key: string;
  title: string;
  description: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  dueDate: string | null;
  storyPoints: number | null;
  estimateMinutes: number | null;
  commentCount: number;
  attachmentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  links?: TicketLink[];
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: number;
  ticketId: number;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  isImage: boolean;
  uploadedBy: string | null;
  url: string;
  createdAt: string | null;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  authorName: string | null;
  body: string;
  createdAt: string | null;
}

export interface TicketActivityEntry {
  id: number;
  ticketId: number;
  actorName: string | null;
  action: string;
  detail: string | null;
  createdAt: string | null;
}

// -- Sprints --

export const fetchSprints = (projectId?: number) =>
  apiClient.get<NimroseSprint[]>("/nimrose/sprints", { params: { project_id: projectId } }).then((r) => r.data);

export const createSprint = (sprint: { projectId: number; name: string; goal?: string; startDate?: string; endDate?: string; status?: SprintStatus }) =>
  apiClient.post<NimroseSprint>("/nimrose/sprints", sprint).then((r) => r.data);

export const updateSprint = (id: number, patch: Partial<Pick<NimroseSprint, "name" | "goal" | "startDate" | "endDate" | "status">>) =>
  apiClient.put<NimroseSprint>(`/nimrose/sprints/${id}`, patch).then((r) => r.data);

export const deleteSprint = (id: number) => apiClient.delete(`/nimrose/sprints/${id}`).then((r) => r.data);

// -- Tickets --

export interface TicketFilters {
  projectId?: number;
  sprintId?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  assignee?: string;
  label?: string;
  q?: string;
}

export const fetchTickets = (filters: TicketFilters = {}) =>
  apiClient
    .get<NimroseTicket[]>("/nimrose/tickets", {
      params: {
        project_id: filters.projectId,
        sprint_id: filters.sprintId,
        status: filters.status,
        priority: filters.priority,
        type: filters.type,
        assignee: filters.assignee,
        label: filters.label,
        q: filters.q,
      },
    })
    .then((r) => r.data);

export const fetchTicket = (id: number) =>
  apiClient.get<NimroseTicket>(`/nimrose/tickets/${id}`).then((r) => r.data);

export const createTicket = (ticket: {
  projectId: number;
  title: string;
  description?: string;
  type?: TicketType;
  priority?: TicketPriority;
  status?: TicketStatus;
  sprintId?: number | null;
  assignee?: string;
  labels?: string[];
  dueDate?: string;
  storyPoints?: number;
  estimateMinutes?: number;
}) => apiClient.post<NimroseTicket>("/nimrose/tickets", ticket).then((r) => r.data);

export const updateTicket = (
  id: number,
  patch: Partial<{
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    type: TicketType;
    assignee: string | null;
    sprintId: number | null;
    labels: string[];
    dueDate: string;
    storyPoints: number;
    estimateMinutes: number;
  }>
) => apiClient.put<NimroseTicket>(`/nimrose/tickets/${id}`, patch).then((r) => r.data);

export const deleteTicket = (id: number) => apiClient.delete(`/nimrose/tickets/${id}`).then((r) => r.data);

// -- Comments --

export const fetchTicketComments = (ticketId: number) =>
  apiClient.get<TicketComment[]>(`/nimrose/ticket-comments/${ticketId}`).then((r) => r.data);

export const addTicketComment = (ticketId: number, body: string) =>
  apiClient.post<TicketComment>(`/nimrose/ticket-comments/${ticketId}`, { body }).then((r) => r.data);

// -- Links --

export const addTicketLink = (ticketId: number, relation: TicketLinkRelation, linkedTicketId: number) =>
  apiClient.post<TicketLink>(`/nimrose/ticket-links/${ticketId}`, { relation, linkedTicketId }).then((r) => r.data);

export const removeTicketLink = (ticketId: number, linkId: number) =>
  apiClient.delete(`/nimrose/ticket-links/${ticketId}/${linkId}`).then((r) => r.data);

// -- Activity --

export const fetchTicketActivity = (ticketId: number) =>
  apiClient.get<TicketActivityEntry[]>(`/nimrose/ticket-activity/${ticketId}`).then((r) => r.data);

// -- Board columns (per-project, user-defined workflow steps) --

export const fetchBoardColumns = (projectId: number) =>
  apiClient.get<BoardColumn[]>(`/nimrose/board-columns`, { params: { project_id: projectId } }).then((r) => r.data);

export const createBoardColumn = (projectId: number, name: string) =>
  apiClient.post<BoardColumn>(`/nimrose/board-columns/${projectId}`, { name }).then((r) => r.data);

export const updateBoardColumn = (projectId: number, columnId: number, patch: { name?: string; position?: number; isDone?: boolean }) =>
  apiClient.put<BoardColumn>(`/nimrose/board-columns/${projectId}/${columnId}`, patch).then((r) => r.data);

export const deleteBoardColumn = (projectId: number, columnId: number) =>
  apiClient.delete(`/nimrose/board-columns/${projectId}/${columnId}`).then((r) => r.data);

// -- Attachments --

export const fetchTicketAttachments = (ticketId: number) =>
  apiClient.get<TicketAttachment[]>(`/nimrose/ticket-attachments/${ticketId}`).then((r) => r.data);

export const uploadTicketAttachment = (ticketId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post<TicketAttachment>(`/nimrose/ticket-attachments/${ticketId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteTicketAttachment = (ticketId: number, attachmentId: number) =>
  apiClient.delete(`/nimrose/ticket-attachments/${ticketId}/${attachmentId}`).then((r) => r.data);

/** An attachment's raw file URL, e.g. for an <img src> or download link,
 * which can't carry an Authorization header — the token goes as a query
 * param instead, same pattern as the Browser proxy. */
export const attachmentFileUrl = (attachment: TicketAttachment): string => {
  const token = getAuthToken();
  const base = `${API_BASE_URL}${attachment.url}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};
