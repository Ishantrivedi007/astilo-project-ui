import axios from "axios";

const TOKEN = import.meta.env.VITE_TMDB_TOKEN?.trim();
const API_KEY = import.meta.env.VITE_TMDB_API_KEY?.trim();

/** Is a TMDB credential configured? If not, the UI falls back to mock data. */
export const hasTmdb = Boolean(TOKEN || API_KEY);

const client = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
  params: !TOKEN && API_KEY ? { api_key: API_KEY } : undefined,
});

const IMG = "https://image.tmdb.org/t/p";

export const posterUrl = (path: string | null, size: "w342" | "w500" = "w342") =>
  path ? `${IMG}/${size}${path}` : "";

export const backdropUrl = (path: string | null, size: "w780" | "w1280" = "w1280") =>
  path ? `${IMG}/${size}${path}` : "";

/** Raw TMDB list item (movie or tv). */
export interface TmdbRaw {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: "movie" | "tv";
}

export interface MediaItem {
  id: number;
  title: string;
  poster: string;
  backdrop: string;
  overview: string;
  rating: number;
  year: string;
  kind: "movie" | "tv";
}

export const normalize = (
  raw: TmdbRaw,
  fallbackKind: "movie" | "tv" = "movie"
): MediaItem => {
  const date = raw.release_date || raw.first_air_date || "";
  return {
    id: raw.id,
    title: raw.title || raw.name || "Untitled",
    poster: posterUrl(raw.poster_path),
    backdrop: backdropUrl(raw.backdrop_path),
    overview: raw.overview,
    rating: Math.round(raw.vote_average * 10) / 10,
    year: date ? date.slice(0, 4) : "",
    kind: raw.media_type ?? (raw.name && !raw.title ? "tv" : fallbackKind),
  };
};

export interface TmdbEndpoint {
  path: string;
  params?: Record<string, string | number>;
  kind?: "movie" | "tv";
}

export async function searchMedia(query: string): Promise<MediaItem[]> {
  const q = query.trim();
  if (!q || !hasTmdb) return [];
  const { data } = await client.get<{ results: (TmdbRaw & { media_type: string })[] }>(
    "/search/multi",
    { params: { query: q, include_adult: false } }
  );
  return (data.results ?? [])
    .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
    .map((r) => normalize(r as TmdbRaw))
    .slice(0, 8);
}

export async function fetchRow(endpoint: TmdbEndpoint): Promise<MediaItem[]> {
  const { data } = await client.get<{ results: TmdbRaw[] }>(endpoint.path, {
    params: endpoint.params,
  });
  return (data.results ?? [])
    .filter((r) => r.poster_path)
    .map((r) => normalize(r, endpoint.kind))
    .slice(0, 18);
}
