import axios from "axios";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";

export interface LyricsHit {
  id: number;
  geniusSongId: string;
  artist: string | null;
  title: string | null;
  geniusUrl: string | null;
  thumbnailUrl: string | null;
  lyricsText: string | null;
  source: string;
  fetchedAt: string | null;
  hitCount: number;
}

export async function fetchTopLyrics(): Promise<LyricsHit[]> {
  try {
    const { data } = await axios.get<LyricsHit[]>(`${API_BASE}/media/genius-search`, {
      params: { action: "top" },
      timeout: 9000,
    });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function searchLyrics(q: string): Promise<LyricsHit[]> {
  const { data } = await axios.get<LyricsHit[]>(`${API_BASE}/media/genius-search`, {
    params: { q },
    timeout: 15000,
  });
  return data ?? [];
}
