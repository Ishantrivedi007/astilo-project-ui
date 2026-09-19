import axios from "axios";
import { apiClient } from "./apiClient";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";
const library = axios.create({ baseURL: `${API_BASE}/library`, timeout: 25000 });

export interface GutenbergBook {
  id: number;
  title: string;
  authors: string[];
  subjects: string[];
  bookshelves: string[];
  summary: string | null;
  languages: string[];
  downloadCount: number | null;
  coverUrl: string | null;
  textUrl: string | null;
  hasText: boolean;
}

export interface LibraryEnvelope<T> {
  source: string;
  sourceDataset: string;
  retrievedAt: string;
  data: T;
}

export const searchLibrary = (params: { q?: string; topic?: string; page?: number }) =>
  library.get<LibraryEnvelope<{ count: number; hasNext: boolean; results: GutenbergBook[] }>>("/search", { params }).then((r) => r.data);

export const fetchLibraryCategories = () => library.get<{ categories: string[] }>("/categories").then((r) => r.data.categories);

export const fetchGutenbergBook = (id: number) => library.get<LibraryEnvelope<GutenbergBook>>(`/book/${id}`).then((r) => r.data);

export interface BookChapter {
  heading: string;
  text: string;
}

export const fetchBookContent = (textUrl: string) =>
  library.get<{ chapterCount: number; chapters: BookChapter[] }>("/book-content", { params: { text_url: textUrl } }).then((r) => r.data);

// -- Personal shelf (auth required) --

export type LibraryShelf = "want_to_read" | "reading" | "finished";

export interface LibraryEntry {
  id: number;
  gutenbergId: number;
  title: string;
  authors: string[];
  coverUrl: string | null;
  textUrl: string | null;
  shelf: LibraryShelf;
  lastChapterIndex: number;
  totalChapters: number | null;
  progressPercent: number | null;
  notes: string | null;
  addedAt: string | null;
  updatedAt: string | null;
}

export const fetchMyLibrary = (shelf?: LibraryShelf) =>
  apiClient.get<LibraryEntry[]>("/library/entries", { params: { shelf } }).then((r) => r.data);

export const addToLibrary = (book: { gutenbergId: number; title: string; authors?: string[]; coverUrl?: string | null; textUrl?: string | null; shelf?: LibraryShelf }) =>
  apiClient.post<LibraryEntry>("/library/entries", book).then((r) => r.data);

export const updateLibraryEntry = (id: number, patch: Partial<Pick<LibraryEntry, "shelf" | "lastChapterIndex" | "totalChapters" | "notes">>) =>
  apiClient.put<LibraryEntry>(`/library/entries/${id}`, patch).then((r) => r.data);

export const removeFromLibrary = (id: number) => apiClient.delete(`/library/entries/${id}`).then((r) => r.data);
