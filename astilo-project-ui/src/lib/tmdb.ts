import axios from "axios";

const API_BASE = (import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api");

/**
 * TMDB is proxied through our own backend (`/api/media/tmdb/...`) so the
 * API key/token never reaches the browser. The backend returns 503 when it
 * has no TMDB credentials configured, in which case callers fall back to
 * mock data.
 */
export const hasTmdb = true;

const client = axios.create({
  baseURL: `${API_BASE}/media/tmdb`,
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
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
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

export interface SearchPage {
  items: MediaItem[];
  page: number;
  totalPages: number;
}

/** Full search-results page (used by the dedicated search page, with pagination). */
export async function searchMediaPage(
  query: string,
  page = 1
): Promise<SearchPage> {
  const q = query.trim();
  if (!q || !hasTmdb) return { items: [], page: 1, totalPages: 0 };
  const { data } = await client.get<{
    results: (TmdbRaw & { media_type: string })[];
    page: number;
    total_pages: number;
  }>("/search/multi", { params: { query: q, include_adult: false, page } });
  return {
    items: (data.results ?? [])
      .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
      .map((r) => normalize(r as TmdbRaw)),
    page: data.page ?? 1,
    totalPages: data.total_pages ?? 1,
  };
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

/** Same as `fetchRow` but paginated, for "view more" category pages. */
export async function fetchRowPage(
  endpoint: TmdbEndpoint,
  page = 1
): Promise<SearchPage> {
  if (!hasTmdb) return { items: [], page: 1, totalPages: 0 };
  const { data } = await client.get<{
    results: TmdbRaw[];
    page: number;
    total_pages: number;
  }>(endpoint.path, { params: { ...endpoint.params, page } });
  return {
    items: (data.results ?? [])
      .filter((r) => r.poster_path)
      .map((r) => normalize(r, endpoint.kind)),
    page: data.page ?? 1,
    totalPages: data.total_pages ?? 1,
  };
}

export interface Genre {
  id: number;
  name: string;
}

export async function fetchGenres(kind: "movie" | "tv"): Promise<Genre[]> {
  if (!hasTmdb) return [];
  try {
    const { data } = await client.get<{ genres: Genre[] }>(`/genre/${kind}/list`);
    return data.genres ?? [];
  } catch {
    return [];
  }
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export async function fetchWatchProviders(
  kind: "movie" | "tv",
  region = "US"
): Promise<WatchProvider[]> {
  if (!hasTmdb) return [];
  try {
    const { data } = await client.get<{ results: WatchProvider[] }>(
      `/watch/providers/${kind}`,
      { params: { watch_region: region } }
    );
    return (data.results ?? []).slice(0, 30);
  } catch {
    return [];
  }
}

export interface DiscoverFilters {
  kind: "movie" | "tv";
  query?: string;
  genreId?: number;
  year?: number;
  language?: string; // ISO 639-1, e.g. "en"
  country?: string; // ISO 3166-1, e.g. "US" — origin country
  watchProviderId?: number;
  region?: string; // watch_region, defaults to "US"
  certification?: string; // e.g. "PG-13" (movie) or "TV-MA" (tv), US ratings board
  page?: number;
  sortBy?: string;
}

/** US content-rating options for the filter bar, grouped by kind — used as an
 * instant fallback before `fetchCertifications` resolves (or if it fails). */
export const MOVIE_CERTIFICATIONS = ["G", "PG", "PG-13", "R", "NC-17"];
export const TV_CERTIFICATIONS = ["TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"];

/** The real, currently-valid US certification list for a kind — some regions/
 * kinds have none, in which case the caller should hide the rating filter
 * rather than offer a dropdown that can never match anything. */
export async function fetchCertifications(
  kind: "movie" | "tv",
  region = "US"
): Promise<string[]> {
  if (!hasTmdb) return [];
  try {
    const { data } = await client.get<{
      certifications?: Record<string, { certification: string }[]>;
    }>(`/certification/${kind}/list`);
    const list = data.certifications?.[region] ?? [];
    return list.map((c) => c.certification).filter((c) => c && c !== "NR");
  } catch {
    return [];
  }
}

/** Does this raw TMDB search result's watch providers include the given provider in `region`? */
async function hasWatchProvider(
  kind: "movie" | "tv",
  id: number,
  providerId: number,
  region: string
): Promise<boolean> {
  try {
    const { data } = await client.get<{
      results?: Record<string, { flatrate?: { provider_id: number }[]; ads?: { provider_id: number }[]; free?: { provider_id: number }[]; rent?: { provider_id: number }[]; buy?: { provider_id: number }[] }>;
    }>(`/${kind}/${id}/watch/providers`);
    const forRegion = data.results?.[region];
    if (!forRegion) return false;
    return (["flatrate", "ads", "free", "rent", "buy"] as const).some((k) =>
      forRegion[k]?.some((p) => p.provider_id === providerId)
    );
  } catch {
    return false;
  }
}

/** Movie search results don't carry `origin_country` (TV ones do) — the movie
 * *details* endpoint does, so fall back to a per-item lookup for movies. */
async function movieOriginCountries(id: number): Promise<string[]> {
  try {
    const { data } = await client.get<{ origin_country?: string[] }>(`/movie/${id}`);
    return data.origin_country ?? [];
  } catch {
    return [];
  }
}

/** US certification (content rating) for a movie, e.g. "PG-13" — not present
 * on list/search responses, only on the release-dates sub-resource. */
async function movieCertification(id: number): Promise<string> {
  try {
    const { data } = await client.get<{
      results?: { iso_3166_1: string; release_dates: { certification: string }[] }[];
    }>(`/movie/${id}/release_dates`);
    const us = data.results?.find((r) => r.iso_3166_1 === "US");
    return us?.release_dates.find((r) => r.certification)?.certification ?? "";
  } catch {
    return "";
  }
}

/** US TV content rating, e.g. "TV-MA" — TMDB has no discover/search filter
 * for this at all, so every TV certification filter goes through here. */
async function tvCertification(id: number): Promise<string> {
  try {
    const { data } = await client.get<{ results?: { iso_3166_1: string; rating: string }[] }>(
      `/tv/${id}/content_ratings`
    );
    return data.results?.find((r) => r.iso_3166_1 === "US")?.rating ?? "";
  } catch {
    return "";
  }
}

export async function filterByCertification<T extends { id: number }>(
  kind: "movie" | "tv",
  items: T[],
  certification: string
): Promise<T[]> {
  const ratings = await Promise.all(
    items.map((r) => (kind === "tv" ? tvCertification(r.id) : movieCertification(r.id)))
  );
  return items.filter((_, i) => ratings[i] === certification);
}

/**
 * TMDB's `/search` endpoint doesn't accept `/discover`-style filter params
 * (genre, year, language, watch provider…), so when there's a title query we
 * fetch the plain search results and apply the same filters client-side
 * against the fields the search response does carry (genre_ids,
 * original_language, release/first-air date, origin_country for TV). Country
 * for movies, watch provider, and content rating are each checked with a
 * small bounded per-page lookup since TMDB has no single endpoint that
 * covers them.
 */
async function searchMediaFiltered(filters: DiscoverFilters): Promise<SearchPage> {
  const {
    kind,
    query,
    genreId,
    year,
    language,
    country,
    watchProviderId,
    certification,
    region = "US",
    page = 1,
  } = filters;

  const { data } = await client.get<{
    results: (TmdbRaw & { media_type: string })[];
    page: number;
    total_pages: number;
  }>("/search/multi", { params: { query: query!.trim(), include_adult: false, page } });

  let results = (data.results ?? []).filter(
    (r) => r.media_type === kind && r.poster_path
  );

  if (genreId) results = results.filter((r) => r.genre_ids?.includes(genreId));
  if (year) {
    results = results.filter((r) => {
      const date = r.release_date || r.first_air_date || "";
      return date.startsWith(String(year));
    });
  }
  if (language) results = results.filter((r) => r.original_language === language);
  if (country) {
    if (kind === "tv") {
      results = results.filter((r) => r.origin_country?.includes(country));
    } else {
      const countries = await Promise.all(results.map((r) => movieOriginCountries(r.id)));
      results = results.filter((_, i) => countries[i].includes(country));
    }
  }

  if (watchProviderId) {
    const flags = await Promise.all(
      results.map((r) => hasWatchProvider(kind, r.id, watchProviderId, region))
    );
    results = results.filter((_, i) => flags[i]);
  }

  if (certification) {
    results = await filterByCertification(kind, results, certification);
  }

  return {
    items: results.map((r) => normalize(r as TmdbRaw, kind)),
    page: data.page ?? 1,
    totalPages: data.total_pages ?? 1,
  };
}

/** Discover/search movies or TV with combinable filters (genre, year, language, country, streaming platform). */
export async function discoverMedia(filters: DiscoverFilters): Promise<SearchPage> {
  if (!hasTmdb) return { items: [], page: 1, totalPages: 0 };
  const {
    kind,
    query,
    genreId,
    year,
    language,
    country,
    watchProviderId,
    certification,
    region = "US",
    page = 1,
    sortBy = "popularity.desc",
  } = filters;

  if (query?.trim()) return searchMediaFiltered(filters);

  const params: Record<string, string | number> = { page, sort_by: sortBy };
  if (genreId) params.with_genres = genreId;
  if (year) params[kind === "tv" ? "first_air_date_year" : "primary_release_year"] = year;
  if (language) params.with_original_language = language;
  if (country) params.with_origin_country = country;
  if (watchProviderId) {
    params.with_watch_providers = watchProviderId;
    params.watch_region = region;
  }
  // /discover/movie supports certification server-side; /discover/tv has no
  // equivalent param at all, so TV certification always needs a per-item
  // lookup after the fact (below).
  if (certification && kind === "movie") {
    params.certification_country = "US";
    params.certification = certification;
  }

  const { data } = await client.get<{
    results: TmdbRaw[];
    page: number;
    total_pages: number;
  }>(`/discover/${kind}`, { params });

  let results = (data.results ?? []).filter((r) => r.poster_path);
  if (certification && kind === "tv") {
    results = await filterByCertification(kind, results, certification);
  }

  return {
    items: results.map((r) => normalize(r, kind)),
    page: data.page ?? 1,
    totalPages: data.total_pages ?? 1,
  };
}
