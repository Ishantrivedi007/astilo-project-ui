import { apiClient } from "./apiClient";

export type TaskStatus = "inbox" | "planned" | "in_progress" | "waiting" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface NimroseProject {
  id: number;
  name: string;
  color: string | null;
  keyPrefix: string | null;
  createdAt: string | null;
}

export interface NimroseTask {
  id: number;
  projectId: number | null;
  projectName: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  labels: string[];
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NimroseCalendarEvent {
  id: number;
  projectId: number | null;
  projectName: string | null;
  relatedTaskId: number | null;
  relatedTaskTitle: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  category: string | null;
  color: string | null;
  reminderMinutesBefore: number | null;
  recurrence: string | null;
  notes: string | null;
  createdAt: string | null;
}

// -- Projects --

export const fetchNimroseProjects = () =>
  apiClient.get<NimroseProject[]>("/nimrose/projects").then((r) => r.data);

export const createNimroseProject = (name: string, color?: string) =>
  apiClient.post<NimroseProject>("/nimrose/projects", { name, color }).then((r) => r.data);

export const updateNimroseProject = (id: number, patch: Partial<{ name: string; color: string | null; keyPrefix: string }>) =>
  apiClient.put<NimroseProject>(`/nimrose/projects/${id}`, patch).then((r) => r.data);

export const deleteNimroseProject = (id: number) =>
  apiClient.delete(`/nimrose/projects/${id}`).then((r) => r.data);

// -- Tasks --

export const fetchNimroseTasks = (params?: { status?: TaskStatus; projectId?: number }) =>
  apiClient
    .get<NimroseTask[]>("/nimrose/tasks", { params: { status: params?.status, project_id: params?.projectId } })
    .then((r) => r.data);

export const createNimroseTask = (task: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: number | null;
  startDate?: string;
  dueDate?: string;
  labels?: string[];
  estimatedMinutes?: number;
}) => apiClient.post<NimroseTask>("/nimrose/tasks", task).then((r) => r.data);

export const updateNimroseTask = (id: number, patch: Partial<Omit<NimroseTask, "id" | "createdAt" | "updatedAt" | "projectName">>) =>
  apiClient.put<NimroseTask>(`/nimrose/tasks/${id}`, patch).then((r) => r.data);

export const deleteNimroseTask = (id: number) =>
  apiClient.delete(`/nimrose/tasks/${id}`).then((r) => r.data);

// -- Calendar events --

export const fetchNimroseCalendarEvents = (params?: { start?: string; end?: string; projectId?: number }) =>
  apiClient
    .get<NimroseCalendarEvent[]>("/nimrose/calendar-events", {
      params: { start: params?.start, end: params?.end, project_id: params?.projectId },
    })
    .then((r) => r.data);

export const createNimroseCalendarEvent = (event: {
  title: string;
  startAt: string;
  endAt?: string;
  description?: string;
  location?: string;
  category?: string;
  color?: string;
  reminderMinutesBefore?: number;
  recurrence?: string;
  notes?: string;
  projectId?: number | null;
  relatedTaskId?: number | null;
}) => apiClient.post<NimroseCalendarEvent>("/nimrose/calendar-events", event).then((r) => r.data);

export const updateNimroseCalendarEvent = (
  id: number,
  patch: Partial<Omit<NimroseCalendarEvent, "id" | "createdAt" | "projectName" | "relatedTaskTitle">>
) => apiClient.put<NimroseCalendarEvent>(`/nimrose/calendar-events/${id}`, patch).then((r) => r.data);

export const deleteNimroseCalendarEvent = (id: number) =>
  apiClient.delete(`/nimrose/calendar-events/${id}`).then((r) => r.data);

// -- Notes --

export type NoteContentFormat = "markdown" | "html";
export type NoteKind = "note" | "sheet" | "slides" | "code";

export interface NimroseNote {
  id: number;
  title: string;
  content: string | null;
  contentFormat: NoteContentFormat;
  kind: NoteKind;
  language: string | null;
  folder: string | null;
  tags: string[];
  pinned: boolean;
  projectId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const fetchNimroseNotes = (params?: { folder?: string; tag?: string; q?: string; kind?: NoteKind; projectId?: number }) =>
  apiClient
    .get<NimroseNote[]>("/nimrose/notes", {
      params: { folder: params?.folder, tag: params?.tag, q: params?.q, kind: params?.kind, project_id: params?.projectId },
    })
    .then((r) => r.data);

export const fetchNimroseNote = (id: number) =>
  apiClient.get<NimroseNote>(`/nimrose/notes/${id}`).then((r) => r.data);

export const createNimroseNote = (note: {
  title: string;
  content?: string;
  contentFormat?: NoteContentFormat;
  kind?: NoteKind;
  language?: string;
  folder?: string;
  tags?: string[];
  pinned?: boolean;
  projectId?: number;
}) => apiClient.post<NimroseNote>("/nimrose/notes", note).then((r) => r.data);

export const updateNimroseNote = (id: number, patch: Partial<Omit<NimroseNote, "id" | "createdAt" | "updatedAt">>) =>
  apiClient.put<NimroseNote>(`/nimrose/notes/${id}`, patch).then((r) => r.data);

export const deleteNimroseNote = (id: number) =>
  apiClient.delete(`/nimrose/notes/${id}`).then((r) => r.data);

// -- Project members (Team tab) --

export type ProjectMemberRole = "owner" | "editor" | "viewer";

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  role: ProjectMemberRole;
  createdAt: string | null;
}

export const fetchProjectMembers = (projectId: number) =>
  apiClient.get<ProjectMember[]>("/nimrose/project-members", { params: { project_id: projectId } }).then((r) => r.data);

export const addProjectMember = (payload: { projectId: number; email: string; role: ProjectMemberRole }) =>
  apiClient.post<ProjectMember>("/nimrose/project-members", payload).then((r) => r.data);

export const updateProjectMemberRole = (memberId: number, role: ProjectMemberRole) =>
  apiClient.put<ProjectMember>(`/nimrose/project-members/${memberId}`, { role }).then((r) => r.data);

export const removeProjectMember = (memberId: number) =>
  apiClient.delete(`/nimrose/project-members/${memberId}`).then((r) => r.data);

// -- Project activity (Activity tab) --

export interface ProjectActivityEntry {
  id: number;
  projectId: number;
  actorUserId: number | null;
  actorName: string | null;
  action: string;
  detail: string | null;
  createdAt: string | null;
}

export const fetchProjectActivity = (projectId: number, limit = 50) =>
  apiClient
    .get<ProjectActivityEntry[]>("/nimrose/project-activity", { params: { project_id: projectId, limit } })
    .then((r) => r.data);

// -- Context Bubbles --

export interface ContextBubbleSnapshot {
  section: string;
  params: Record<string, string>;
}

export interface ContextBubble {
  id: number;
  name: string;
  icon: string | null;
  snapshot: ContextBubbleSnapshot;
  createdAt: string | null;
  lastRestoredAt: string | null;
}

export const fetchContextBubbles = () =>
  apiClient.get<ContextBubble[]>("/nimrose/context-bubbles").then((r) => r.data);

export const createContextBubble = (payload: { name: string; icon?: string; snapshot: ContextBubbleSnapshot }) =>
  apiClient.post<ContextBubble>("/nimrose/context-bubbles", payload).then((r) => r.data);

export const touchContextBubble = (id: number) =>
  apiClient.put<ContextBubble>(`/nimrose/context-bubbles/${id}`, { restored: true }).then((r) => r.data);

export const deleteContextBubble = (id: number) =>
  apiClient.delete(`/nimrose/context-bubbles/${id}`).then((r) => r.data);
