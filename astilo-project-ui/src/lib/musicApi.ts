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
  lyrics: string | null;
  syncedLyrics: string | null;
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

export interface PreviewStream {
  youtubeId: string;
  streamUrl: string;
  durationSeconds: number;
}

export async function fetchPreviewStream(youtubeId: string): Promise<PreviewStream> {
  const { data } = await axios.get<PreviewStream>(`${API_BASE}/music/preview`, {
    params: { youtubeId },
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

/** Kicks off a download on the backend and returns immediately with a job id —
 * the actual download runs on a background thread. Poll `/music/downloads`
 * (see fetchDownloadJobs) for progress. */
export async function startDownload(options: DownloadOptions): Promise<{ jobId: string }> {
  const { data } = await axios.post<{ jobId: string }>(`${API_BASE}/music/songs`, options, {
    timeout: 15000,
  });
  return data;
}

export type DownloadJobStatus = "starting" | "downloading" | "processing" | "done" | "error";

export interface DownloadJob {
  id: string;
  status: DownloadJobStatus;
  progress: number;
  title: string | null;
  artist: string | null;
  format: "mp3" | "video" | null;
  error: string | null;
  songId: number | null;
  speedBytesPerSec: number | null;
  etaSeconds: number | null;
  startedAt: number;
}

/** e.g. 1536000 -> "1.5 MB/s" */
export function formatDownloadSpeed(bytesPerSec: number | null | undefined): string | null {
  if (!bytesPerSec || bytesPerSec <= 0) return null;
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export async function fetchDownloadJobs(): Promise<DownloadJob[]> {
  try {
    const { data } = await axios.get<DownloadJob[]>(`${API_BASE}/music/downloads`, {
      timeout: 9000,
    });
    return data ?? [];
  } catch {
    return [];
  }
}

export interface SongUpdateInput {
  title?: string;
  artist?: string;
  lyrics?: string;
  syncedLyrics?: string;
}

export async function updateSong(id: number, input: SongUpdateInput): Promise<DownloadedSong> {
  const { data } = await axios.put<DownloadedSong>(`${API_BASE}/music/songs/${id}`, input, {
    timeout: 9000,
  });
  return data;
}

export async function deleteSong(id: number): Promise<void> {
  await axios.delete(`${API_BASE}/music/songs/${id}`, { timeout: 9000 });
}
