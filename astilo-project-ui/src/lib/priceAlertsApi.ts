import { apiClient } from "./apiClient";
import type { AssetType } from "./marketsApi";

export type PriceAlertCondition = "above" | "below";
export type PriceAlertStatus = "active" | "triggered" | "cancelled";

export interface PriceAlert {
  id: number;
  symbol: string;
  assetType: AssetType;
  name: string | null;
  condition: PriceAlertCondition;
  targetPrice: number;
  status: PriceAlertStatus;
  createdAt: string | null;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  cancelledAt: string | null;
}

export const fetchPriceAlerts = () => apiClient.get<PriceAlert[]>("/markets/price-alerts").then((r) => r.data);

export const createPriceAlert = (payload: { symbol: string; assetType: AssetType; condition: PriceAlertCondition; targetPrice: number }) =>
  apiClient.post<PriceAlert>("/markets/price-alerts", payload).then((r) => r.data);

export const cancelPriceAlert = (id: number) =>
  apiClient.delete<{ cancelled: boolean }>(`/markets/price-alerts/${id}`).then((r) => r.data);
