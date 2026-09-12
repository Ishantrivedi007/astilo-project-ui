import axios from "axios";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";

export interface DownloadedSong {
  id: number;
  title: string;
  artist: string | null;
  audioUrl: string;
  coverUrl: string | null;
  durationSeconds: number | null;
  youtubeId: string | null;
  sourceUrl: string | null;
  mediaType: "audio" | "video";
  bitrateKbps: number | null;
  qualityLabel: string | null;
  createdAt: string | null;
}

export interface SongSearchHit {
  youtubeId: string;
  title: string;
  channel: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  url: string | null;
}

export interface SongSearchResponse {
  results: SongSearchHit[];
  mp3Bitrates: number[];
  videoQualities: string[];
}

export async function fetchSongs(): Promise<DownloadedSong[]> {
  try {
    const { data } = await axios.get<DownloadedSong[]>(`${API_BASE}/music/songs`, {
      timeout: 9000,
    });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function searchSongs(q: string): Promise<SongSearchResponse> {
  const { data } = await axios.get<SongSearchResponse>(`${API_BASE}/music/search`, {
    params: { q, limit: 8 },
    timeout: 15000,
  });
  return data;
}

export interface DownloadOptions {
  youtubeId?: string;
  query?: string;
  title?: string;
  artist?: string;
  format: "mp3" | "video";
  bitrate?: number;
  quality?: string;
}

export async function downloadSong(options: DownloadOptions): Promise<DownloadedSong> {
  const { data } = await axios.post<DownloadedSong>(`${API_BASE}/music/songs`, options, {
    timeout: 120000,
  });
  return data;
}
