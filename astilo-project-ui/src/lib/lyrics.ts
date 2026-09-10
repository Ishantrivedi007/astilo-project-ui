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
