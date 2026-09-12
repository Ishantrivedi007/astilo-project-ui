import axios from "axios";
import { posterUrl, type MediaItem } from "./tmdb";

/**
 * Anime data via AniList's free, keyless GraphQL API (its own database —
 * not a MyAnimeList scraper, so it doesn't inherit Jikan's flakiness),
 * proxied through our own backend at `/api/media/anime`. No streaming
 * sources are provided — AniList is metadata-only (info, streaming-episode
 * titles/thumbnails from licensed platforms, trailer), which keeps this
 * feature on legally clean ground.
 */

const API_BASE = (import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api");

const client = axios.create({ baseURL: `${API_BASE}/media/anime` });

export const hasAnimeApi = true;

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { data } = await client.post<{ data: T; errors?: { message: string }[] }>("", {
    query,
    variables,
  });
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data;
}

interface AniListTitle {
  romaji: string | null;
  english: string | null;
}

interface AniListMedia {
  id: number;
  title: AniListTitle;
  coverImage: { large: string | null; extraLarge: string | null };
  bannerImage: string | null;
  description: string | null;
  averageScore: number | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  format: string | null;
  status: string | null;
  genres: string[];
  studios: { nodes: { name: string }[] };
  trailer: { id: string; site: string } | null;
  streamingEpisodes: { title: string; thumbnail: string | null; url: string | null; site: string }[];
  recommendations: {
    nodes: { mediaRecommendation: AniListMedia | null }[];
  };
}

const CARD_FIELDS = `
  id
  title { romaji english }
  coverImage { large extraLarge }
  bannerImage
  averageScore
  seasonYear
  format
`;

export const normalizeAnime = (raw: AniListMedia): MediaItem => {
  const image = raw.coverImage?.extraLarge || raw.coverImage?.large || "";
  return {
    id: raw.id,
    title: raw.title.english || raw.title.romaji || "Untitled",
    poster: image,
    backdrop: raw.bannerImage || image,
    overview: raw.description ? raw.description.replace(/<[^>]+>/g, "") : "",
    rating: raw.averageScore ? Math.round(raw.averageScore) / 10 : 0,
    year: raw.seasonYear ? String(raw.seasonYear) : "",
    kind: raw.format === "MOVIE" ? "movie" : "tv",
  };
};

export interface AnimeEndpoint {
  /** AniList media sort key, e.g. TRENDING_DESC, POPULARITY_DESC, SCORE_DESC */
  sort?: string;
  format?: "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL";
  season?: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  seasonYear?: number;
  status?: "RELEASING" | "NOT_YET_RELEASED" | "FINISHED";
}

const ROW_QUERY = `
  query ($sort: [MediaSort], $format: MediaFormat, $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
    Page(page: 1, perPage: 18) {
      media(type: ANIME, sort: $sort, format: $format, season: $season, seasonYear: $seasonYear, status: $status, isAdult: false) {
        ${CARD_FIELDS}
      }
    }
  }
`;

export async function fetchAnimeRow(endpoint: AnimeEndpoint): Promise<MediaItem[]> {
  const data = await gql<{ Page: { media: AniListMedia[] } }>(ROW_QUERY, {
    sort: [endpoint.sort || "TRENDING_DESC"],
    format: endpoint.format,
    season: endpoint.season,
    seasonYear: endpoint.seasonYear,
    status: endpoint.status,
  });
  return (data.Page.media ?? []).filter((m) => m.coverImage?.large).map(normalizeAnime);
}

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 8) {
      media(type: ANIME, search: $search, isAdult: false) {
        ${CARD_FIELDS}
      }
    }
  }
`;

export async function searchAnime(query: string): Promise<MediaItem[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await gql<{ Page: { media: AniListMedia[] } }>(SEARCH_QUERY, { search: q });
  return (data.Page.media ?? []).map(normalizeAnime);
}

export interface AnimeEpisode {
  id: number;
  number: number;
  title: string;
  thumbnail: string;
  aired: string;
  filler: boolean;
  recap: boolean;
}

export interface AnimeDetail extends MediaItem {
  status: string;
  episodesCount: number;
  duration: string;
  genres: string[];
  studios: string[];
  trailerKey: string | null;
  trailerSite: string | null;
  recommendations: MediaItem[];
  episodes: AnimeEpisode[];
}

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${CARD_FIELDS}
      description
      status
      duration
      genres
      studios(isMain: true) { nodes { name } }
      trailer { id site }
      streamingEpisodes { title thumbnail url site }
      recommendations(sort: RATING_DESC, perPage: 12) {
        nodes { mediaRecommendation { ${CARD_FIELDS} } }
      }
    }
  }
`;

export async function fetchAnimeDetail(id: number | string): Promise<AnimeDetail> {
  const data = await gql<{ Media: AniListMedia }>(DETAIL_QUERY, { id: Number(id) });
  const raw = data.Media;
  const base = normalizeAnime(raw);

  const episodes: AnimeEpisode[] = (raw.streamingEpisodes ?? []).map((ep, i) => ({
    id: i + 1,
    number: i + 1,
    title: ep.title || `Episode ${i + 1}`,
    thumbnail: ep.thumbnail || "",
    aired: "",
    filler: false,
    recap: false,
  }));

  return {
    ...base,
    status: raw.status || "",
    episodesCount: raw.episodes || episodes.length,
    duration: raw.duration ? `${raw.duration}m` : "",
    genres: raw.genres ?? [],
    studios: (raw.studios?.nodes ?? []).map((s) => s.name),
    trailerKey: raw.trailer?.site === "youtube" ? raw.trailer.id : null,
    trailerSite: raw.trailer?.site ?? null,
    recommendations: (raw.recommendations?.nodes ?? [])
      .map((n) => n.mediaRecommendation)
      .filter((m): m is AniListMedia => Boolean(m))
      .map(normalizeAnime),
    episodes,
  };
}

// --- watch-page server groups -------------------------------------------
//
// AniList (and this app's backend) only ever provides metadata — there is no
// licensed streaming partner wired up, so real playback URLs don't exist.
// This deterministically "mocks" a server picker (Sub / Dub / other-language
// dub groups, each with a few named servers) purely so the watch page's UI/UX
// — the part that was actually asked for — has something real to render and
// switch between. Swap `buildServerGroups` for a real API call once a
// licensed source is integrated; the shape (`AnimeServerGroup[]`) is the
// contract the UI already consumes.

export interface AnimeServer {
  id: string;
  name: string;
  quality: string;
}

export interface AnimeServerGroup {
  id: string;
  label: string;
  servers: AnimeServer[];
}

const seededRandom = (seed: number) => {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const SERVER_NAMES = ["Vela", "Nimbus", "Aether", "Torii", "Kaze", "Ronin", "Hikari", "Sora"];

export function buildServerGroups(animeId: number, episodeNumber: number): AnimeServerGroup[] {
  const rand = seededRandom(animeId * 97 + episodeNumber * 13);
  let cursor = 0;
  const makeServers = (count: number): AnimeServer[] =>
    Array.from({ length: count }, () => {
      const server = {
        id: `srv-${cursor}`,
        name: SERVER_NAMES[cursor % SERVER_NAMES.length],
        quality: rand() > 0.5 ? "1080p" : "720p",
      };
      cursor += 1;
      return server;
    });

  const groups: AnimeServerGroup[] = [
    { id: "sub", label: "Original (Sub)", servers: makeServers(3) },
    { id: "dub-en", label: "English Dub", servers: makeServers(2 + Math.round(rand())) },
  ];

  if (rand() > 0.5) {
    groups.push({ id: "dub-es", label: "Spanish Dub", servers: makeServers(1 + Math.round(rand())) });
  }
  if (rand() > 0.72) {
    groups.push({ id: "dub-pt", label: "Portuguese Dub", servers: makeServers(1 + Math.round(rand())) });
  }
  if (rand() > 0.85) {
    groups.push({ id: "dub-de", label: "German Dub", servers: makeServers(1) });
  }

  return groups;
}

// --- keyless fallback (used only if the backend/AniList is unreachable) ---

const MOCK_TITLES = [
  "Neo-Osaka Nights",
  "Blade of Spring",
  "Static Bloom",
  "The Cat Returns Home",
  "Paper Sky",
  "Kaiju Diaries",
];

export const buildMockAnimeRow = (rowId: string): MediaItem[] =>
  MOCK_TITLES.map((title, i) => ({
    id: Number(`9${rowId.length}${i}${i}`),
    title,
    poster: posterUrl(null),
    backdrop: "",
    overview: "Mock entry — the anime service is unreachable right now.",
    rating: Math.round((7.0 + ((i * 7) % 25) / 10) * 10) / 10,
    year: `${2015 + (i % 10)}`,
    kind: rowId === "anime-movies" ? "movie" : "tv",
  }));
