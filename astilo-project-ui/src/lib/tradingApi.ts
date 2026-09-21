import { apiClient } from "./apiClient";
import type { AssetType } from "./marketsApi";

export interface TradingAccountData {
  id: number;
  cashBalance: number;
  createdAt: string | null;
}

export interface TradingHolding {
  id: number;
  symbol: string;
  assetType: AssetType;
  name: string | null;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
}

export interface TradingPortfolio {
  account: TradingAccountData;
  holdings: TradingHolding[];
  holdingsValue: number;
  totalValue: number;
}

export interface TradingTransaction {
  id: number;
  symbol: string;
  assetType: AssetType;
  name: string | null;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  realizedPnl: number | null;
  createdAt: string | null;
}

export interface TradingOrderResult extends TradingPortfolio {
  transaction: TradingTransaction;
}

export interface TradingInsights {
  symbol: string;
  insufficientData?: boolean;
  periodChangePct?: number;
  volatilityPct?: number;
  trendDirection?: "up" | "down";
  periodHigh?: number;
  periodLow?: number;
  rangePosition?: number;
  currentPrice?: number;
  disclaimer?: string;
}

export const fetchTradingAccount = () => apiClient.get<TradingPortfolio>("/trading/account").then((r) => r.data);

export const fetchTradingOrders = () => apiClient.get<TradingTransaction[]>("/trading/orders").then((r) => r.data);

export const placeTradingOrder = (payload: { symbol: string; assetType: AssetType; side: "buy" | "sell"; quantity: number }) =>
  apiClient.post<TradingOrderResult>("/trading/orders", payload).then((r) => r.data);

export const depositTradingFunds = (payload: { amount: number; name: string; cardNumber: string; expiry: string; cvv: string }) =>
  apiClient.post<TradingPortfolio>("/trading/deposit", payload).then((r) => r.data);

export const fetchTradingInsights = (symbol: string, assetType: AssetType) =>
  apiClient.get<TradingInsights>("/trading/insights", { params: { symbol, asset_type: assetType } }).then((r) => r.data);
