import axios from "axios";

/**
 * Lyrics lookup with graceful fallback:
 *   1. Genius   — only if VITE_GENIUS_ACCESS_TOKEN is set (via a CORS proxy,
 *                 since api.genius.com sends no CORS headers)
 *   2. lrclib.net — keyless, CORS-enabled, very reliable
 *   3. lyrics.ovh — keyless backup
 *   4. caller-supplied fallback text
 *
 * The Genius token is read from the environment only — never hard-code it.
 */

const GENIUS_TOKEN = import.meta.env.VITE_GENIUS_ACCESS_TOKEN?.trim();
const PROXY = "https://api.allorigins.win/raw?url=";

const stripLrc = (text: string) =>
  text
    .replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function fromGenius(artist: string, title: string): Promise<string | null> {
  if (!GENIUS_TOKEN) return null;
  try {
    const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(
      `${artist} ${title}`
    )}&access_token=${GENIUS_TOKEN}`;
    const { data } = await axios.get(PROXY + encodeURIComponent(searchUrl), {
      timeout: 9000,
    });
    const songUrl: string | undefined = data?.response?.hits?.[0]?.result?.url;
    if (!songUrl) return null;

    const { data: html } = await axios.get<string>(
      PROXY + encodeURIComponent(songUrl),
      { timeout: 9000, responseType: "text" }
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const blocks = doc.querySelectorAll('[data-lyrics-container="true"]');
    if (!blocks.length) return null;
    const text = Array.from(blocks)
      .map((b) => {
        b.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        return b.textContent ?? "";
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

async function fromLrclib(artist: string, title: string): Promise<string | null> {
  try {
    const { data } = await axios.get("https://lrclib.net/api/get", {
      params: { artist_name: artist, track_name: title },
      timeout: 8000,
    });
    const text = data?.plainLyrics || stripLrc(data?.syncedLyrics ?? "");
    return text?.trim() || null;
  } catch {
    return null;
  }
}

async function fromLyricsOvh(
  artist: string,
  title: string
): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(
        title
      )}`,
      { timeout: 8000 }
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
  return (
    (await fromGenius(artist, title)) ??
    (await fromLrclib(artist, title)) ??
    (await fromLyricsOvh(artist, title)) ??
    fallback
  );
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

async function syncedFromLrclib(
  artist: string,
  title: string
): Promise<LyricsResult | null> {
  try {
    const { data } = await axios.get("https://lrclib.net/api/get", {
      params: { artist_name: artist, track_name: title },
      timeout: 8000,
    });
    const parsed = data?.syncedLyrics ? parseLrc(data.syncedLyrics) : [];
    const synced = parsed.length ? parsed : null;
    const plain = (
      data?.plainLyrics ||
      (synced ? synced.map((l) => l.text).join("\n") : "")
    ).trim();
    if (!synced && !plain) return null;
    return { synced, plain };
  } catch {
    return null;
  }
}

export async function fetchLyricsSynced(
  artist: string,
  title: string,
  fallback: string
): Promise<LyricsResult> {
  const viaLrclib = await syncedFromLrclib(artist, title);
  if (viaLrclib) return viaLrclib;

  const ovh = await fromLyricsOvh(artist, title);
  if (ovh) return { synced: null, plain: ovh };

  return { synced: null, plain: fallback };
}
