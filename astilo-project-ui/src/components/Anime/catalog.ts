import type { AnimeEndpoint } from "../../lib/anime";
import { buildMockAnimeRow as _buildMockAnimeRow } from "../../lib/anime";

export interface AnimeRowDef {
  id: string;
  label: string;
  emoji: string;
  endpoint: AnimeEndpoint;
}

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;
const seasonForMonth = (month: number) => SEASONS[Math.floor(((month + 1) % 12) / 3)];

const now = new Date();
const currentSeason = seasonForMonth(now.getMonth());
const currentYear = now.getFullYear();
const nextSeasonIdx = (SEASONS.indexOf(currentSeason) + 1) % 4;
const nextSeason = SEASONS[nextSeasonIdx];
const nextSeasonYear = nextSeasonIdx === 0 ? currentYear + 1 : currentYear;

export const ANIME_ROWS: AnimeRowDef[] = [
  {
    id: "anime-trending",
    label: "Trending anime",
    emoji: "🔥",
    endpoint: { sort: "TRENDING_DESC" },
  },
  {
    id: "anime-top",
    label: "All-time top rated",
    emoji: "🏆",
    endpoint: { sort: "SCORE_DESC" },
  },
  {
    id: "anime-airing",
    label: "Airing this season",
    emoji: "📡",
    endpoint: { sort: "POPULARITY_DESC", season: currentSeason, seasonYear: currentYear },
  },
  {
    id: "anime-movies",
    label: "Anime movies",
    emoji: "🎬",
    endpoint: { sort: "POPULARITY_DESC", format: "MOVIE" },
  },
  {
    id: "anime-hidden",
    label: "Upcoming next season",
    emoji: "💎",
    endpoint: { sort: "POPULARITY_DESC", season: nextSeason, seasonYear: nextSeasonYear },
  },
];

export const buildMockAnimeRow = _buildMockAnimeRow;
