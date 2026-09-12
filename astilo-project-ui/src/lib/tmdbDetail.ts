import axios from "axios";
import {
  hasTmdb,
  posterUrl,
  backdropUrl,
  normalize,
  type MediaItem,
  type TmdbRaw,
} from "./tmdb";

const TOKEN = import.meta.env.VITE_TMDB_TOKEN?.trim();
const API_KEY = import.meta.env.VITE_TMDB_API_KEY?.trim();

const client = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
  params: !TOKEN && API_KEY ? { api_key: API_KEY } : undefined,
});

export interface CastMember {
  id: number;
  name: string;
  character: string;
  photo: string;
}

export interface MediaDetail extends MediaItem {
  tagline: string;
  runtime: number;
  releaseDate: string;
  genres: string[];
  trailerKey: string | null;
  cast: CastMember[];
  recommendations: MediaItem[];
  voteCount: number;
  status: string;
}

interface RawDetail extends TmdbRaw {
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  status?: string;
  vote_count?: number;
  genres?: { id: number; name: string }[];
  videos?: { results: { key: string; site: string; type: string; official: boolean }[] };
  credits?: { cast: { id: number; name: string; character: string; profile_path: string | null }[] };
  recommendations?: { results: TmdbRaw[] };
  images?: {
    backdrops: { file_path: string; width: number; height: number; aspect_ratio: number }[];
  };
}

/** Prefer a wide, high-res backdrop over the default (often tightly-cropped) one. */
const pickBackdrop = (raw: RawDetail): string => {
  const list = raw.images?.backdrops ?? [];
  const wide = list
    .filter((b) => b.aspect_ratio >= 1.7 && b.width >= 1280)
    .sort((a, b) => b.width - a.width);
  const chosen = wide[0]?.file_path ?? raw.backdrop_path;
  return backdropUrl(chosen, "w1280");
};

const pickTrailer = (raw: RawDetail): string | null => {
  const vids = raw.videos?.results ?? [];
  const yt = vids.filter((v) => v.site === "YouTube");
  const trailer =
    yt.find((v) => v.type === "Trailer" && v.official) ||
    yt.find((v) => v.type === "Trailer") ||
    yt.find((v) => v.type === "Teaser") ||
    yt[0];
  return trailer?.key ?? null;
};

export const youtubeWatchUrl = (key: string) =>
  `https://www.youtube.com/watch?v=${key}`;
export const youtubeEmbedUrl = (key: string) =>
  `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;

export async function fetchDetail(
  kind: "movie" | "tv",
  id: number | string
): Promise<MediaDetail> {
  if (!hasTmdb) return buildMockDetail(kind, id);
  const { data } = await client.get<RawDetail>(`/${kind}/${id}`, {
    params: {
      append_to_response: "videos,credits,recommendations,images",
      include_image_language: "en,null",
    },
  });
  const base = normalize(data, kind);
  return {
    ...base,
    kind,
    backdrop: pickBackdrop(data),
    tagline: data.tagline ?? "",
    runtime: data.runtime || data.episode_run_time?.[0] || 0,
    releaseDate: data.release_date || data.first_air_date || "",
    status: data.status ?? "",
    voteCount: data.vote_count ?? 0,
    genres: (data.genres ?? []).map((g) => g.name),
    trailerKey: pickTrailer(data),
    cast: (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      photo: posterUrl(c.profile_path, "w342"),
    })),
    recommendations: (data.recommendations?.results ?? [])
      .filter((r) => r.poster_path)
      .map((r) => normalize(r, kind))
      .slice(0, 12),
  };
}

// --- keyless fallback ---

const MOCK_GENRES = ["Drama", "Thriller", "Mystery", "Sci-Fi", "Adventure"];
const MOCK_CAST = [
  "Ava Bennett",
  "Marcus Cole",
  "Priya Nair",
  "Diego Alvarez",
  "Lena Fischer",
  "Sam Okafor",
];

export function buildMockDetail(
  kind: "movie" | "tv",
  id: number | string
): MediaDetail {
  const n = Number(String(id).replace(/\D/g, "")) || 7;
  return {
    id: Number(id) || n,
    title: kind === "tv" ? "Signal Lost" : "Neon Tide",
    poster: posterUrl("/v0eQLbzT6sWelfApuYsEkYpzufl.jpg"),
    backdrop: backdropUrl("/dWSnsAGTfc8U27bWsy2RfwZs0Bs.jpg"),
    overview:
      "A drifting radio operator picks up a transmission that should not exist — and following it back to its source unravels everything she believed about the coastline she calls home. Add a TMDB token in .env to load real data.",
    rating: 7.6,
    year: "2023",
    kind,
    tagline: "Some frequencies were never meant to be found.",
    runtime: kind === "tv" ? 48 : 118,
    releaseDate: "2023-09-15",
    status: "Released",
    voteCount: 1284,
    genres: MOCK_GENRES.slice(0, 3 + (n % 2)),
    trailerKey: "aqz-KE-bpKQ",
    cast: MOCK_CAST.map((name, i) => ({
      id: i + 1,
      name,
      character: `Character ${i + 1}`,
      photo: posterUrl("/dWSnsAGTfc8U27bWsy2RfwZs0Bs.jpg"),
    })),
    recommendations: [],
  };
}
