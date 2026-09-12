import type { MediaItem, TmdbEndpoint } from "../../lib/tmdb";
import { posterUrl } from "../../lib/tmdb";

export interface AnimeRowDef {
  id: string;
  label: string;
  emoji: string;
  endpoint: TmdbEndpoint;
}

// TMDB genre 16 = Animation, restricted to Japanese-language originals ≈ anime.
const JA_ANIME = { with_genres: 16, with_original_language: "ja" };
const TODAY = new Date().toISOString().slice(0, 10);

export const ANIME_ROWS: AnimeRowDef[] = [
  {
    id: "anime-trending",
    label: "Trending anime",
    emoji: "🔥",
    endpoint: { path: "/discover/tv", kind: "tv", params: { ...JA_ANIME, sort_by: "popularity.desc" } },
  },
  {
    id: "anime-top",
    label: "All-time top rated",
    emoji: "🏆",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: { ...JA_ANIME, sort_by: "vote_average.desc", "vote_count.gte": 300 },
    },
  },
  {
    id: "anime-airing",
    label: "Recently aired",
    emoji: "📡",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: { ...JA_ANIME, sort_by: "first_air_date.desc", "first_air_date.lte": TODAY },
    },
  },
  {
    id: "anime-movies",
    label: "Anime movies",
    emoji: "🎬",
    endpoint: {
      path: "/discover/movie",
      kind: "movie",
      params: { with_genres: 16, with_original_language: "ja", sort_by: "popularity.desc" },
    },
  },
  {
    id: "anime-hidden",
    label: "Hidden gems",
    emoji: "💎",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: { ...JA_ANIME, sort_by: "vote_average.desc", "vote_count.gte": 40, "vote_count.lte": 300 },
    },
  },
];

// --- keyless fallback catalogue ---

const POSTERS = [
  "/v0eQLbzT6sWelfApuYsEkYpzufl.jpg",
  "/dWSnsAGTfc8U27bWsy2RfwZs0Bs.jpg",
  "/eShw0LB5CkoEfYtpUcXPD85oz5Q.jpg",
  "/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg",
  "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
  "/5bFK5d3mVTAvBCXi5NPWH0tYjKl.jpg",
  "/4ZSzEDVdxWVMVO4oZDvoodQOEfr.jpg",
];

const MOCK_TITLES: Record<string, string[]> = {
  "anime-trending": ["Neo-Osaka Nights", "Blade of Spring", "Static Bloom", "The Cat Returns Home", "Paper Sky", "Kaiju Diaries"],
  "anime-top": ["Ashes of Amaterasu", "Ten Thousand Cherry Blossoms", "The Silent Dojo", "Moonlit Ronin", "Iron Lotus", "Skyward Koi"],
  "anime-airing": ["Wired Hearts", "Nightfall Academy", "Ghost Signal", "The Last Yokai", "Twin Star Express", "Ember Tide"],
  "anime-movies": ["The Cloud Menders", "Lantern Festival", "Sock Puppet Kingdom", "Pixel & Pine", "Marbles", "Tiny Giants"],
  "anime-hidden": ["Quiet Part Loud", "Salt Roads Requiem", "Blueprint Zero", "The Reckoners", "Ash & Elm", "Off the Grid"],
};

export const buildMockAnimeRow = (rowId: string): MediaItem[] =>
  (MOCK_TITLES[rowId] ?? MOCK_TITLES["anime-trending"]).map((title, i) => ({
    id: Number(`9${rowId.length}${i}${i}`),
    title,
    poster: posterUrl(POSTERS[(i + rowId.length) % POSTERS.length]),
    backdrop: "",
    overview: "Mock entry — add a TMDB token in .env to load the real catalogue.",
    rating: Math.round((7.0 + ((i * 7) % 25) / 10) * 10) / 10,
    year: `${2015 + (i % 10)}`,
    kind: rowId === "anime-movies" ? "movie" : "tv",
  }));
