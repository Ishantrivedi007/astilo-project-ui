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
  { name: "La Vie En Rose", artist: "Louis Armstrong", length: "3:27", emoji: "🌹" },
  { name: "Iris", artist: "Goo Goo Dolls", length: "4:49", emoji: "👁️" },
  { name: "Hello", artist: "Adele", length: "4:55", emoji: "📞" },
  { name: "Conversations in the Dark", artist: "John Legend", length: "3:59", emoji: "🌙" },
  { name: "It Might Be You", artist: "Stephen Bishop", length: "3:52", emoji: "✨" },
  { name: "Someone Like You", artist: "Adele", length: "4:45", emoji: "💧" },
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
