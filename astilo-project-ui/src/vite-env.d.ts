/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_TMDB_TOKEN: string;
  readonly VITE_TMDB_API_KEY: string;
  readonly VITE_GENIUS_ACCESS_TOKEN: string;
  // Streaming-server base URLs (see lib/streams.ts) — optional; a provider
  // is left out of the switcher entirely if its var isn't set.
  readonly VITE_PROVIDER_VIDSRC?: string;
  readonly VITE_PROVIDER_VIDLINK?: string;
  readonly VITE_PROVIDER_VIDSRC_XYZ?: string;
  readonly VITE_PROVIDER_VIDSRC_ME?: string;
  readonly VITE_PROVIDER_AUTOEMBED?: string;
  readonly VITE_PROVIDER_TWOEMBED?: string;
  readonly VITE_PROVIDER_TWOEMBED_SKIN?: string;
  readonly VITE_PROVIDER_EMBEDSU?: string;
  readonly VITE_PROVIDER_VIDCORE?: string;
  readonly VITE_PROVIDER_YAPGRID?: string;
  readonly VITE_PROVIDER_SUPEREMBED?: string;
  readonly VITE_PROVIDER_SMASHY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
