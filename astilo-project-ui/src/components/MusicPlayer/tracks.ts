export interface Track {
  name: string;
  artist: string;
  length: string;
  emoji: string;
  /** Playable audio file in /public — when set, the player streams the real song. */
  audio?: string;
  /** Album art shipped with the song. Falls back to the default cover when absent. */
  cover?: string;
  /** Lyrics bundled with the song, used as the fallback for the lyrics lookup. */
  lyrics?: string;
  /** Time-synced (LRC) lyrics saved to this song's DB record, if the user synced any. */
  syncedLyrics?: string;
  /** Backend Song id — set only for downloaded tracks, used by the Manage tab. */
  songId?: number;
  /** Playlist-track row id — set only when this entry came from a specific playlist. */
  playlistTrackId?: number;
}

export const DEFAULT_COVER = "/nextuiplayer.jpeg";

const COPINES_LYRICS = `Des menottes aux poignets, en bas de chez toi
Tu la connais, elle t'appelle "mon roi"
Copines, copines, copines de la miff
Copines, copines, elles m'ont bien capté

Toi t'es un vrai type sûr, un peu comme moi
Elle sait qu'elle t'aura pas, mais elle y croit
J'suis dans le carré VIP avec mes copines
On fait le show, on fait le show toute la night`;

// The rest of the queue used to be filled out with silent placeholder
// entries (no real audio file behind them). Those are gone — "Copines" is
// the only bundled track because it ships with a real mp3 in /public; every
// other song in the queue now comes from the actual download pipeline
// (Search Song tab), which saves a real file to /public/downloads and a
// matching row in the songs table.
export const tracks: Track[] = [
  {
    name: "Copines",
    artist: "Aya Nakamura",
    length: "3:36",
    emoji: "🔥",
    audio: "/Aya Nakamura - Copines.mp3",
    cover: "/copines-cover.jpg",
    lyrics: COPINES_LYRICS,
  },
];

/** "3:36" -> 216 */
export const lengthToSeconds = (length: string): number => {
  const [m, s] = length.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
};

/** 216 -> "3:36" */
export const secondsToLength = (totalSeconds: number | null | undefined): string => {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};
