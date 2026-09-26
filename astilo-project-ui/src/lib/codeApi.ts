import { apiClient } from "./apiClient";

// -- Terminal --

export interface TerminalEntry {
  name: string;
  isDir: boolean;
  size: number | null;
}

export interface TerminalListing {
  cwd: string;
  entries: TerminalEntry[];
}

export const listSandboxDir = (path?: string) =>
  apiClient.get<TerminalListing>("/code/terminal", { params: { path } }).then((r) => r.data);

export interface TerminalResult {
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  cwd: string;
  stdout: string;
  stderr: string;
  truncated: boolean;
}

export const runTerminalCommand = (command: string, cwd?: string) =>
  apiClient.post<TerminalResult>("/code/terminal", { command, cwd }).then((r) => r.data);

/** Writes a file into the shared sandbox directory (creating parent
 * folders as needed) — used by the Code Editor's Run button to put the
 * file being edited where a subsequent runTerminalCommand can find it. */
export const writeSandboxFile = (path: string, content: string) =>
  apiClient.put<{ path: string }>("/code/terminal", { path, content }).then((r) => r.data);

// -- Database Explorer --

export interface DbTable {
  schema: string | null;
  name: string;
}

export const fetchDbTables = (connectionString: string) =>
  apiClient.post<{ tables: DbTable[] }>("/code/database/tables", { connectionString }).then((r) => r.data);

export interface DbQueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

export const runDbQuery = (connectionString: string, sql: string) =>
  apiClient.post<DbQueryResult>("/code/database/query", { connectionString, sql }).then((r) => r.data);

export interface DbColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  default: string | null;
}

export const fetchDbColumns = (connectionString: string, table: string, schema?: string | null) =>
  apiClient.post<{ columns: DbColumn[] }>("/code/database/columns", { connectionString, table, schema }).then((r) => r.data);

export interface SavedSqlQuery {
  id: number;
  name: string;
  sql: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const fetchSavedQueries = () => apiClient.get<SavedSqlQuery[]>("/code/database/queries").then((r) => r.data);

export const saveSqlQuery = (input: { name: string; sql: string }) =>
  apiClient.post<SavedSqlQuery>("/code/database/queries", input).then((r) => r.data);

export const updateSqlQuery = (id: number, patch: Partial<{ name: string; sql: string }>) =>
  apiClient.put<SavedSqlQuery>(`/code/database/queries/${id}`, patch).then((r) => r.data);

export const deleteSqlQuery = (id: number) => apiClient.delete(`/code/database/queries/${id}`).then((r) => r.data);

// -- API Studio --

export interface ApiStudioRequestDto {
  id: number;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const fetchApiStudioRequests = () => apiClient.get<ApiStudioRequestDto[]>("/code/api-studio/requests").then((r) => r.data);

export const saveApiStudioRequest = (input: {
  name?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}) => apiClient.post<ApiStudioRequestDto>("/code/api-studio/requests", input).then((r) => r.data);

export const updateApiStudioRequest = (id: number, patch: Partial<ApiStudioRequestDto>) =>
  apiClient.put<ApiStudioRequestDto>(`/code/api-studio/requests/${id}`, patch).then((r) => r.data);

export const deleteApiStudioRequest = (id: number) => apiClient.delete(`/code/api-studio/requests/${id}`).then((r) => r.data);

export interface ApiStudioResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  truncated: boolean;
}

export const sendApiStudioRequest = (input: { method: string; url: string; headers?: Record<string, string>; body?: string }) =>
  apiClient.post<ApiStudioResponse>("/code/api-studio/send", input).then((r) => r.data);

// -- Local "Git" version history (Studio · Code files) --

export interface NoteVersion {
  id: number;
  noteId: number;
  content: string | null;
  createdAt: string | null;
}

export const fetchNoteVersions = (noteId: number) =>
  apiClient.get<NoteVersion[]>("/code/git/versions", { params: { note_id: noteId } }).then((r) => r.data);

export const restoreNoteVersion = (versionId: number) =>
  apiClient.post(`/code/git/versions/${versionId}`, { action: "restore" }).then((r) => r.data);
