/**
 * Streaming-server base URLs and display names are read entirely from Vite
 * env vars (VITE_PROVIDER_N / VITE_PROVIDER_N_NAME) rather than hardcoded
 * here, so no server's identity lives in source control at all — only in
 * the local, git-ignored `.env` (see `.env.example` for the var names to
 * fill in). A server whose base URL isn't configured is simply left out of
 * `STREAM_PROVIDERS` instead of rendering a broken player.
 */

export interface StreamLangOptions {
  audio?: string;
  sub?: string;
  /** force a secondary multi-audio mirror on servers that support it */
  hindiDub?: boolean;
}

export interface StreamProvider {
  id: string;
  name: string;
  /** server can force a dubbed audio track via a query param */
  supportsAudioLang?: boolean;
  /** server can force a subtitle track via a query param */
  supportsSubLang?: boolean;
  /** server can be nudged toward its secondary multi-audio mirror */
  supportsHindiDub?: boolean;
  movie: (id: string | number, lang: StreamLangOptions) => string;
  tv: (
    id: string | number,
    season: number,
    episode: number,
    lang: StreamLangOptions
  ) => string;
}

interface StreamProviderDef extends StreamProvider {
  /** base URL from VITE_PROVIDER_<n> — undefined if not configured */
  base: string | undefined;
}

const env = import.meta.env;

const name = (n: number, fallback: string) =>
  (env as Record<string, string | undefined>)[`VITE_PROVIDER_${n}_NAME`] || fallback;

const DEFS: StreamProviderDef[] = [
  {
    id: "server1",
    name: name(1, "Server 1"),
    base: env.VITE_PROVIDER_1,
    supportsSubLang: true,
    movie: (id, { sub = "en" }) => `${env.VITE_PROVIDER_1}/embed/movie/${id}?sub=${sub}`,
    tv: (id, s, e, { sub = "en" }) =>
      `${env.VITE_PROVIDER_1}/embed/tv/${id}/${s}/${e}?sub=${sub}`,
  },
  {
    id: "server2",
    name: name(2, "Server 2"),
    base: env.VITE_PROVIDER_2,
    supportsAudioLang: true,
    supportsSubLang: true,
    movie: (id, { audio = "en", sub = "en" }) =>
      `${env.VITE_PROVIDER_2}/movie/${id}?audio_lang=${audio}&sub_lang=${sub}`,
    tv: (id, s, e, { audio = "en", sub = "en" }) =>
      `${env.VITE_PROVIDER_2}/tv/${id}/${s}/${e}?audio_lang=${audio}&sub_lang=${sub}`,
  },
  {
    id: "server3",
    name: name(3, "Server 3"),
    base: env.VITE_PROVIDER_3,
    movie: (id) => `${env.VITE_PROVIDER_3}/embed/movie/${id}`,
    tv: (id, s, e) =>
      `${env.VITE_PROVIDER_3}/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "server4",
    name: name(4, "Server 4"),
    base: env.VITE_PROVIDER_4,
    movie: (id) => `${env.VITE_PROVIDER_4}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_4}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server5",
    name: name(5, "Server 5"),
    base: env.VITE_PROVIDER_5,
    movie: (id) => `${env.VITE_PROVIDER_5}/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_5}/tv/${id}/${s}/${e}`,
  },
  {
    id: "server6",
    name: name(6, "Server 6"),
    base: env.VITE_PROVIDER_6,
    movie: (id) => `${env.VITE_PROVIDER_6}/embed/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_6}/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "server7",
    name: name(7, "Server 7"),
    base: env.VITE_PROVIDER_7,
    movie: (id) => `${env.VITE_PROVIDER_7}/embed/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_7}/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "server8",
    name: name(8, "Server 8"),
    base: env.VITE_PROVIDER_8,
    movie: (id) => `${env.VITE_PROVIDER_8}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_8}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server9",
    name: name(9, "Server 9"),
    base: env.VITE_PROVIDER_9,
    supportsHindiDub: true,
    movie: (id) => `${env.VITE_PROVIDER_9}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_9}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server10",
    name: name(10, "Server 10"),
    base: env.VITE_PROVIDER_10,
    movie: (id) => `${env.VITE_PROVIDER_10}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_10}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server11",
    name: name(11, "Server 11"),
    base: env.VITE_PROVIDER_11,
    supportsHindiDub: true,
    movie: (id, { hindiDub }) =>
      `${env.VITE_PROVIDER_11}/?video_id=${id}&tmdb=1${hindiDub ? "&preferred_server=12" : ""}`,
    tv: (id, s, e, { hindiDub }) =>
      `${env.VITE_PROVIDER_11}/?video_id=${id}&tmdb=1&s=${s}&e=${e}${
        hindiDub ? "&preferred_server=12" : ""
      }`,
  },
  {
    id: "server12",
    name: name(12, "Server 12"),
    base: env.VITE_PROVIDER_12,
    movie: (id) => `${env.VITE_PROVIDER_12}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_12}/embed/tv/${id}/${s}/${e}`,
  },
  // More mirrors of the same TMDb-id embed path shape as servers 1/3/4 above.
  {
    id: "server13",
    name: name(13, "Server 13"),
    base: env.VITE_PROVIDER_13,
    movie: (id) => `${env.VITE_PROVIDER_13}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_13}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server14",
    name: name(14, "Server 14"),
    base: env.VITE_PROVIDER_14,
    movie: (id) => `${env.VITE_PROVIDER_14}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_14}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server15",
    name: name(15, "Server 15"),
    base: env.VITE_PROVIDER_15,
    movie: (id) => `${env.VITE_PROVIDER_15}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_15}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server16",
    name: name(16, "Server 16"),
    base: env.VITE_PROVIDER_16,
    movie: (id) => `${env.VITE_PROVIDER_16}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_16}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server17",
    name: name(17, "Server 17"),
    base: env.VITE_PROVIDER_17,
    movie: (id) => `${env.VITE_PROVIDER_17}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_17}/embed/tv/${id}/${s}/${e}`,
  },
  // Mirrors using movie/{id} + direct tv/{id}?s=&e= episode routing, with
  // an optional subLang query param for the default subtitle track.
  {
    id: "server18",
    name: name(18, "Server 18"),
    base: env.VITE_PROVIDER_18,
    supportsSubLang: true,
    movie: (id) => `${env.VITE_PROVIDER_18}/movie/${id}`,
    tv: (id, s, e, { sub }) =>
      `${env.VITE_PROVIDER_18}/tv/${id}?s=${s}&e=${e}${sub ? `&subLang=${sub}` : ""}`,
  },
  {
    id: "server19",
    name: name(19, "Server 19"),
    base: env.VITE_PROVIDER_19,
    supportsSubLang: true,
    movie: (id) => `${env.VITE_PROVIDER_19}/movie/${id}`,
    tv: (id, s, e, { sub }) =>
      `${env.VITE_PROVIDER_19}/tv/${id}?s=${s}&e=${e}${sub ? `&subLang=${sub}` : ""}`,
  },
  {
    id: "server20",
    name: name(20, "Server 20"),
    base: env.VITE_PROVIDER_20,
    supportsSubLang: true,
    movie: (id) => `${env.VITE_PROVIDER_20}/movie/${id}`,
    tv: (id, s, e, { sub }) =>
      `${env.VITE_PROVIDER_20}/tv/${id}?s=${s}&e=${e}${sub ? `&subLang=${sub}` : ""}`,
  },
  // Regional-focused mirror, same TMDb-id embed path shape as servers 2/9
  // above.
  {
    id: "server21",
    name: name(21, "Server 21"),
    base: env.VITE_PROVIDER_21,
    movie: (id) => `${env.VITE_PROVIDER_21}/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_21}/${id}/${s}/${e}`,
  },
  // More mirrors of the same embed path shape as servers 13-17 above.
  {
    id: "server22",
    name: name(22, "Server 22"),
    base: env.VITE_PROVIDER_22,
    movie: (id) => `${env.VITE_PROVIDER_22}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_22}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server23",
    name: name(23, "Server 23"),
    base: env.VITE_PROVIDER_23,
    movie: (id) => `${env.VITE_PROVIDER_23}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_23}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server24",
    name: name(24, "Server 24"),
    base: env.VITE_PROVIDER_24,
    movie: (id) => `${env.VITE_PROVIDER_24}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_24}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server25",
    name: name(25, "Server 25"),
    base: env.VITE_PROVIDER_25,
    movie: (id) => `${env.VITE_PROVIDER_25}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_25}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server26",
    name: name(26, "Server 26"),
    base: env.VITE_PROVIDER_26,
    movie: (id) => `${env.VITE_PROVIDER_26}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_26}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server27",
    name: name(27, "Server 27"),
    base: env.VITE_PROVIDER_27,
    movie: (id) => `${env.VITE_PROVIDER_27}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_27}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server28",
    name: name(28, "Server 28"),
    base: env.VITE_PROVIDER_28,
    movie: (id) => `${env.VITE_PROVIDER_28}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_28}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server29",
    name: name(29, "Server 29"),
    base: env.VITE_PROVIDER_29,
    movie: (id) => `${env.VITE_PROVIDER_29}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_29}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server30",
    name: name(30, "Server 30"),
    base: env.VITE_PROVIDER_30,
    movie: (id) => `${env.VITE_PROVIDER_30}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_30}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server31",
    name: name(31, "Server 31"),
    base: env.VITE_PROVIDER_31,
    movie: (id) => `${env.VITE_PROVIDER_31}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_31}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "server32",
    name: name(32, "Server 32"),
    base: env.VITE_PROVIDER_32,
    movie: (id) => `${env.VITE_PROVIDER_32}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_32}/embed/tv/${id}/${s}/${e}`,
  },
];

export const STREAM_PROVIDERS: StreamProvider[] = DEFS.filter((p) => p.base);

export const DEFAULT_STREAM_PROVIDER = STREAM_PROVIDERS[0]?.id ?? "";

export const STREAM_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "it", label: "Italian" },
  { code: "ar", label: "Arabic" },
];

export function getStreamUrl(
  providerId: string,
  kind: "movie" | "tv",
  tmdbId: string | number,
  season = 1,
  episode = 1,
  lang: StreamLangOptions = {}
): string {
  const provider =
    STREAM_PROVIDERS.find((p) => p.id === providerId) ?? STREAM_PROVIDERS[0];
  if (!provider) return "";
  return kind === "tv"
    ? provider.tv(tmdbId, season, episode, lang)
    : provider.movie(tmdbId, lang);
}
