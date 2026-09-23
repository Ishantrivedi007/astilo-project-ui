import { apiClient } from "./apiClient";
import type { AssetType } from "./marketsApi";

export interface WatchlistItem {
  id: number;
  symbol: string;
  assetType: AssetType;
  name: string | null;
  notes: string | null;
  addedAt: string | null;
  currentPrice: number | null;
  changePercent: number | null;
}

export const fetchWatchlist = () => apiClient.get<WatchlistItem[]>("/markets/watchlist").then((r) => r.data);

export const addToWatchlist = (payload: { symbol: string; assetType: AssetType; notes?: string }) =>
  apiClient.post<WatchlistItem>("/markets/watchlist", payload).then((r) => r.data);

export const removeFromWatchlist = (id: number) =>
  apiClient.delete<{ deleted: boolean }>(`/markets/watchlist/${id}`).then((r) => r.data);
