import type { MediaItem, TmdbEndpoint } from "../../lib/tmdb";
import { posterUrl } from "../../lib/tmdb";

export interface MovieRowDef {
  id: string;
  label: string;
  emoji: string;
  endpoint: TmdbEndpoint;
}

export const MOVIE_ROWS: MovieRowDef[] = [
  { id: "trending", label: "Trending now", emoji: "🔥", endpoint: { path: "/trending/all/week" } },
  { id: "popular", label: "Popular movies", emoji: "🎬", endpoint: { path: "/movie/popular", kind: "movie" } },
  { id: "top-movie", label: "Top rated movies", emoji: "🏆", endpoint: { path: "/movie/top_rated", kind: "movie" } },
  { id: "now-playing", label: "In theatres", emoji: "🍿", endpoint: { path: "/movie/now_playing", kind: "movie" } },
  { id: "upcoming", label: "Coming soon", emoji: "🗓️", endpoint: { path: "/movie/upcoming", kind: "movie" } },
  { id: "popular-tv", label: "Binge-worthy series", emoji: "📺", endpoint: { path: "/tv/popular", kind: "tv" } },
  { id: "top-tv", label: "Top rated series", emoji: "⭐", endpoint: { path: "/tv/top_rated", kind: "tv" } },
  {
    id: "anime",
    label: "Anime",
    emoji: "🌸",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: { with_genres: 16, with_original_language: "ja", sort_by: "popularity.desc" },
    },
  },
  {
    id: "animated",
    label: "Animated films",
    emoji: "✨",
    endpoint: {
      path: "/discover/movie",
      kind: "movie",
      params: { with_genres: 16, sort_by: "popularity.desc", "vote_count.gte": 500 },
    },
  },
  {
    id: "kdrama",
    label: "K-dramas",
    emoji: "💗",
    endpoint: {
      path: "/discover/tv",
      kind: "tv",
      params: { with_original_language: "ko", with_genres: 18, sort_by: "popularity.desc" },
    },
  },
];

// --- keyless fallback catalogue (public TMDB image CDN, no auth needed) ---

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
  trending: ["Neon Tide", "Afterglow", "The Long Game", "Paper Cities", "Static", "Hollow Crown"],
  popular: ["Joker", "Below Zero", "Game", "Midnight Run", "Dust & Gold", "The Cartographer"],
  "top-movie": ["The Verdict", "Silent Harbor", "Twelve Winters", "A Quiet Fire", "Ledger", "Northwind"],
  "now-playing": ["Rushcut", "Glass Avenue", "The Understudy", "Velvet Static", "Cold Open", "Marrow"],
  upcoming: ["Ultraviolet", "The Second Sun", "Foxglove", "Terminal Blue", "Ember Court", "Nightjar"],
  "popular-tv": ["Signal Lost", "The Family Business", "Undertow", "Bright Rooms", "Off the Grid", "Slow Burn"],
  "top-tv": ["The Long Table", "Ash & Elm", "Quiet Part Loud", "Blueprint", "The Reckoners", "Salt Roads"],
  anime: ["Kaiju Diaries", "Paper Sky", "Blade of Spring", "Neo-Osaka Nights", "The Cat Returns Home", "Static Bloom"],
  animated: ["Tiny Giants", "The Cloud Menders", "Marbles", "Lantern", "Sock Puppet Kingdom", "Pixel & Pine"],
  kdrama: ["Second Spring", "Rain in Seoul", "The Convenience Hour", "Hometown Static", "Late Night Ramyeon", "Paper Hearts"],
};

export const buildMockRow = (rowId: string): MediaItem[] =>
  (MOCK_TITLES[rowId] ?? MOCK_TITLES.trending).map((title, i) => ({
    id: Number(`${rowId.length}${i}${i}`),
    title,
    poster: posterUrl(POSTERS[(i + rowId.length) % POSTERS.length]),
    backdrop: "",
    overview:
      "Mock entry — add a TMDB token in .env to load the real catalogue.",
    rating: Math.round((6.8 + ((i * 7) % 25) / 10) * 10) / 10,
    year: `${2016 + (i % 9)}`,
    kind: rowId.includes("tv") || rowId === "anime" || rowId === "kdrama" ? "tv" : "movie",
  }));
