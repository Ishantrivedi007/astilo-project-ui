/**
 * Streaming-server base URLs are read from Vite env vars (VITE_PROVIDER_*)
 * rather than hardcoded here, so they live only in the local, git-ignored
 * `.env` — see `.env.example` for the full list of var names to fill in.
 * A provider whose base URL isn't configured is simply left out of
 * `STREAM_PROVIDERS` instead of rendering a broken player.
 */

export interface StreamLangOptions {
  audio?: string;
  sub?: string;
  /** force the Hindi/Asian multi-audio mirror on providers that support it (e.g. SuperEmbed's preferred_server) */
  hindiDub?: boolean;
}

export interface StreamProvider {
  id: string;
  name: string;
  /** provider can force a dubbed audio track via a query param */
  supportsAudioLang?: boolean;
  /** provider can force a subtitle track via a query param */
  supportsSubLang?: boolean;
  /** provider can be nudged toward its Hindi/Asian multi-audio mirror */
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
  /** base URL (e.g. "https://vidsrc.to") from VITE_PROVIDER_<id> — undefined if not configured */
  base: string | undefined;
}

const env = import.meta.env;

const DEFS: StreamProviderDef[] = [
  {
    id: "vidsrc",
    name: "VidSrc.to",
    base: env.VITE_PROVIDER_VIDSRC,
    supportsSubLang: true,
    movie: (id, { sub = "en" }) => `${env.VITE_PROVIDER_VIDSRC}/embed/movie/${id}?sub=${sub}`,
    tv: (id, s, e, { sub = "en" }) =>
      `${env.VITE_PROVIDER_VIDSRC}/embed/tv/${id}/${s}/${e}?sub=${sub}`,
  },
  {
    id: "vidlink",
    name: "VidLink.pro",
    base: env.VITE_PROVIDER_VIDLINK,
    supportsAudioLang: true,
    supportsSubLang: true,
    movie: (id, { audio = "en", sub = "en" }) =>
      `${env.VITE_PROVIDER_VIDLINK}/movie/${id}?audio_lang=${audio}&sub_lang=${sub}`,
    tv: (id, s, e, { audio = "en", sub = "en" }) =>
      `${env.VITE_PROVIDER_VIDLINK}/tv/${id}/${s}/${e}?audio_lang=${audio}&sub_lang=${sub}`,
  },
  {
    id: "vidsrc_xyz",
    name: "VidSrc.xyz",
    base: env.VITE_PROVIDER_VIDSRC_XYZ,
    movie: (id) => `${env.VITE_PROVIDER_VIDSRC_XYZ}/embed/movie/${id}`,
    tv: (id, s, e) =>
      `${env.VITE_PROVIDER_VIDSRC_XYZ}/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "vidsrc_me",
    name: "VidSrc.me",
    base: env.VITE_PROVIDER_VIDSRC_ME,
    movie: (id) => `${env.VITE_PROVIDER_VIDSRC_ME}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_VIDSRC_ME}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "autoembed",
    name: "AutoEmbed",
    base: env.VITE_PROVIDER_AUTOEMBED,
    movie: (id) => `${env.VITE_PROVIDER_AUTOEMBED}/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_AUTOEMBED}/tv/${id}/${s}/${e}`,
  },
  {
    id: "twoembed",
    name: "2Embed.cc",
    base: env.VITE_PROVIDER_TWOEMBED,
    movie: (id) => `${env.VITE_PROVIDER_TWOEMBED}/embed/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_TWOEMBED}/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "twoembed_skin",
    name: "2Embed.skin",
    base: env.VITE_PROVIDER_TWOEMBED_SKIN,
    movie: (id) => `${env.VITE_PROVIDER_TWOEMBED_SKIN}/embed/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_TWOEMBED_SKIN}/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "embedsu",
    name: "Embed.su",
    base: env.VITE_PROVIDER_EMBEDSU,
    movie: (id) => `${env.VITE_PROVIDER_EMBEDSU}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_EMBEDSU}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidcore",
    name: "VidCore",
    base: env.VITE_PROVIDER_VIDCORE,
    supportsHindiDub: true,
    movie: (id) => `${env.VITE_PROVIDER_VIDCORE}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_VIDCORE}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "yapgrid",
    name: "YapGrid",
    base: env.VITE_PROVIDER_YAPGRID,
    movie: (id) => `${env.VITE_PROVIDER_YAPGRID}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_YAPGRID}/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "superembed",
    name: "SuperEmbed",
    base: env.VITE_PROVIDER_SUPEREMBED,
    supportsHindiDub: true,
    movie: (id, { hindiDub }) =>
      `${env.VITE_PROVIDER_SUPEREMBED}/?video_id=${id}&tmdb=1${hindiDub ? "&preferred_server=12" : ""}`,
    tv: (id, s, e, { hindiDub }) =>
      `${env.VITE_PROVIDER_SUPEREMBED}/?video_id=${id}&tmdb=1&s=${s}&e=${e}${
        hindiDub ? "&preferred_server=12" : ""
      }`,
  },
  {
    id: "smashy",
    name: "SmashyStream",
    base: env.VITE_PROVIDER_SMASHY,
    movie: (id) => `${env.VITE_PROVIDER_SMASHY}/embed/movie/${id}`,
    tv: (id, s, e) => `${env.VITE_PROVIDER_SMASHY}/embed/tv/${id}/${s}/${e}`,
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
