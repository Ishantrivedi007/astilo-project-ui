/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_TMDB_TOKEN: string;
  readonly VITE_TMDB_API_KEY: string;
  readonly VITE_GENIUS_ACCESS_TOKEN: string;
  // Streaming-server base URLs + display names (see lib/streams.ts) —
  // both optional; a server is left out of the switcher entirely if its
  // base URL var isn't set, and falls back to a generic "Server N" label
  // if its name var isn't set.
  readonly VITE_PROVIDER_1?: string;
  readonly VITE_PROVIDER_1_NAME?: string;
  readonly VITE_PROVIDER_2?: string;
  readonly VITE_PROVIDER_2_NAME?: string;
  readonly VITE_PROVIDER_3?: string;
  readonly VITE_PROVIDER_3_NAME?: string;
  readonly VITE_PROVIDER_4?: string;
  readonly VITE_PROVIDER_4_NAME?: string;
  readonly VITE_PROVIDER_5?: string;
  readonly VITE_PROVIDER_5_NAME?: string;
  readonly VITE_PROVIDER_6?: string;
  readonly VITE_PROVIDER_6_NAME?: string;
  readonly VITE_PROVIDER_7?: string;
  readonly VITE_PROVIDER_7_NAME?: string;
  readonly VITE_PROVIDER_8?: string;
  readonly VITE_PROVIDER_8_NAME?: string;
  readonly VITE_PROVIDER_9?: string;
  readonly VITE_PROVIDER_9_NAME?: string;
  readonly VITE_PROVIDER_10?: string;
  readonly VITE_PROVIDER_10_NAME?: string;
  readonly VITE_PROVIDER_11?: string;
  readonly VITE_PROVIDER_11_NAME?: string;
  readonly VITE_PROVIDER_12?: string;
  readonly VITE_PROVIDER_12_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
