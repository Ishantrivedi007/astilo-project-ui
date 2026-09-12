import axios from "axios";

/**
 * Lyrics lookup, proxied through our own backend (`/api/media/lyrics`).
 * The backend tries lrclib.net then lyrics.ovh server-side and returns
 * whichever plain-text result it finds; the browser makes no third-party
 * calls itself.
 */

const API_BASE = (import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api");

async function fromBackend(artist: string, title: string): Promise<string | null> {
  try {
    const { data } = await axios.get<{ lyrics: string | null }>(
      `${API_BASE}/media/lyrics`,
      { params: { artist, title }, timeout: 9000 }
    );
    return data?.lyrics?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchLyrics(
  artist: string,
  title: string,
  fallback: string
): Promise<string> {
  return (await fromBackend(artist, title)) ?? fallback;
}

/* ---- time-synced lyrics (karaoke) ----------------------------------- */

export interface LrcLine {
  /** seconds from the start of the track */
  time: number;
  text: string;
}

export interface LyricsResult {
  /** parsed LRC lines when the source ships timings, else null */
  synced: LrcLine[] | null;
  /** always-present plain text for the fallback view */
  plain: string;
}

const LRC_LINE = /^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)(.*)$/;
const LRC_STAMP = /\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g;

function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(LRC_LINE);
    if (!m) continue;
    const text = m[2].trim();
    for (const stamp of m[1].match(LRC_STAMP) ?? []) {
      const parts = /\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/.exec(stamp);
      if (!parts) continue;
      lines.push({
        time: Number(parts[1]) * 60 + Number(parts[2]),
        text,
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLyricsSynced(
  artist: string,
  title: string,
  fallback: string
): Promise<LyricsResult> {
  try {
    const { data } = await axios.get<{ lyrics: string | null; synced: string | null }>(
      `${API_BASE}/media/lyrics`,
      { params: { artist, title }, timeout: 9000 }
    );
    const parsed = data?.synced ? parseLrc(data.synced) : [];
    const synced = parsed.length ? parsed : null;
    const plain = (data?.lyrics || (synced ? synced.map((l) => l.text).join("\n") : "")).trim();
    if (!synced && !plain) return { synced: null, plain: fallback };
    return { synced, plain: plain || fallback };
  } catch {
    return { synced: null, plain: fallback };
  }
}
