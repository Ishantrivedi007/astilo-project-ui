import { API_BASE_URL, apiClient, getAuthToken } from "./apiClient";

export interface BrowserSpace {
  id: number;
  name: string;
  position: number;
  projectId: number | null;
  createdAt: string | null;
}

export interface BrowserTab {
  id: number;
  spaceId: number;
  url: string;
  title: string | null;
  position: number;
  createdAt: string | null;
}

export interface Bookmark {
  id: number;
  spaceId: number | null;
  spaceName: string | null;
  url: string;
  title: string | null;
  readLater: boolean;
  createdAt: string | null;
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string | null;
  visitedAt: string | null;
}

// -- Spaces --

export const fetchBrowserSpaces = (params?: { projectId?: number }) =>
  apiClient
    .get<BrowserSpace[]>("/nimrose/browser-spaces", { params: { project_id: params?.projectId } })
    .then((r) => r.data);

export const createBrowserSpace = (name: string) =>
  apiClient.post<BrowserSpace>("/nimrose/browser-spaces", { name }).then((r) => r.data);

export const deleteBrowserSpace = (id: number) =>
  apiClient.delete(`/nimrose/browser-spaces/${id}`).then((r) => r.data);

// -- Tabs --

export const fetchBrowserTabs = (spaceId: number) =>
  apiClient.get<BrowserTab[]>(`/nimrose/browser-tabs/${spaceId}`).then((r) => r.data);

export const createBrowserTab = (spaceId: number, url: string, title?: string) =>
  apiClient.post<BrowserTab>(`/nimrose/browser-tabs/${spaceId}`, { url, title }).then((r) => r.data);

export const updateBrowserTab = (spaceId: number, tabId: number, patch: { url?: string; title?: string }) =>
  apiClient.put<BrowserTab>(`/nimrose/browser-tabs/${spaceId}/${tabId}`, patch).then((r) => r.data);

export const deleteBrowserTab = (spaceId: number, tabId: number) =>
  apiClient.delete(`/nimrose/browser-tabs/${spaceId}/${tabId}`).then((r) => r.data);

// -- Bookmarks --

export const fetchBookmarks = (params?: { spaceId?: number; readLater?: boolean }) =>
  apiClient
    .get<Bookmark[]>("/nimrose/bookmarks", { params: { space_id: params?.spaceId, read_later: params?.readLater } })
    .then((r) => r.data);

export const createBookmark = (bookmark: { url: string; title?: string; spaceId?: number; readLater?: boolean }) =>
  apiClient.post<Bookmark>("/nimrose/bookmarks", bookmark).then((r) => r.data);

export const updateBookmark = (id: number, patch: { title?: string; readLater?: boolean; spaceId?: number | null }) =>
  apiClient.put<Bookmark>(`/nimrose/bookmarks/${id}`, patch).then((r) => r.data);

export const deleteBookmark = (id: number) =>
  apiClient.delete(`/nimrose/bookmarks/${id}`).then((r) => r.data);

// -- History --

export const fetchHistory = (params?: { limit?: number; q?: string }) =>
  apiClient.get<HistoryEntry[]>("/nimrose/history", { params }).then((r) => r.data);

export const recordHistoryVisit = (url: string, title?: string) =>
  apiClient.post<HistoryEntry>("/nimrose/history", { url, title }).then((r) => r.data);

export const clearHistory = () => apiClient.delete("/nimrose/history").then((r) => r.data);

/** Routes a page through the backend's best-effort proxy so sites that
 * block iframe embedding can still be viewed — see nimrose_browser_
 * controller.py's NimroseBrowserProxyController for what this can and
 * can't handle. Falls back to the direct URL if not signed in, though the
 * proxy endpoint itself always requires a token. */
export const proxiedUrl = (url: string): string => {
  const token = getAuthToken();
  if (!token) return url;
  const params = new URLSearchParams({ url, token });
  return `${API_BASE_URL}/nimrose/browser-proxy?${params.toString()}`;
};
