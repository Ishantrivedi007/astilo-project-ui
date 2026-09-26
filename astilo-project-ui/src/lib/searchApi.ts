import { apiClient } from "./apiClient";
import type { Product } from "./storeApi";

export interface SearchLibraryEntry {
  id: number;
  title: string;
  authors: string[];
  coverUrl: string | null;
  textUrl: string | null;
}

export interface SearchNimroseTask {
  id: number;
  title: string;
  projectId: number | null;
}

export interface SearchNimroseNote {
  id: number;
  title: string;
  projectId: number | null;
}

export interface SearchNimroseTicket {
  id: number;
  title: string;
  ticketKey: string;
  projectId: number;
}

export interface GlobalSearchResult {
  products: Product[];
  library: SearchLibraryEntry[];
  tasks: SearchNimroseTask[];
  notes: SearchNimroseNote[];
  tickets: SearchNimroseTicket[];
}

export const fetchGlobalSearch = (q: string) =>
  apiClient.get<GlobalSearchResult>("/search", { params: { q } }).then((r) => r.data);
