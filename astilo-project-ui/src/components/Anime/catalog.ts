import type { TmdbEndpoint } from "../../lib/tmdb";
import { buildMockRow } from "../Movies/catalog";

export interface AnimeRowDef {
  id: string;
  label: string;
  emoji: string;
  endpoint: TmdbEndpoint;
}

// Anime on TMDB = Japanese-language animation (genre 16). Same data source
// and streaming servers as Movies/TV — no separate metadata API.
export const ANIME_ROWS: AnimeRowDef[] = [
  {
    id: "anime-trending",
    label: "Trending anime",
    emoji: "🔥",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: { with_genres: 16, with_original_language: "ja", sort_by: "popularity.desc" },
    },
  },
  {
    id: "anime-top",
    label: "All-time top rated",
    emoji: "🏆",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: {
        with_genres: 16,
        with_original_language: "ja",
        sort_by: "vote_average.desc",
        "vote_count.gte": 200,
      },
    },
  },
  {
    id: "anime-airing",
    label: "Airing now",
    emoji: "📡",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: {
        with_genres: 16,
        with_original_language: "ja",
        sort_by: "first_air_date.desc",
        "air_date.lte": new Date().toISOString().slice(0, 10),
      },
    },
  },
  {
    id: "anime-movies",
    label: "Anime movies",
    emoji: "🎬",
    endpoint: {
      path: "/discover/movie",
      kind: "movie",
      params: {
        with_genres: 16,
        with_original_language: "ja",
        sort_by: "popularity.desc",
        "vote_count.gte": 100,
      },
    },
  },
  {
    id: "anime-hidden",
    label: "Upcoming",
    emoji: "💎",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: {
        with_genres: 16,
        with_original_language: "ja",
        sort_by: "popularity.desc",
        "first_air_date.gte": new Date().toISOString().slice(0, 10),
      },
    },
  },
];

export const buildMockAnimeRow = buildMockRow;
