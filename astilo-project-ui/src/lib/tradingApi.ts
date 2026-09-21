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

export interface HoldingSuggestion {
  label: string;
  tone: "positive" | "negative" | "neutral";
  /** What this label means in general — a plain-language definition,
   * independent of this specific position's numbers. */
  meaning: string;
  /** The specific computed reasoning for THIS holding right now. */
  description: string;
}

/** A computed, explainable pointer — never "advice" — built only from real
 * numbers already on screen: the position's own unrealized P&L plus the
 * asset's own recent trend and where it sits in its own recent range.
 * Always says why, so it reads as a data summary, not a recommendation. */
export const suggestionForHolding = (holding: TradingHolding, insights: TradingInsights | undefined): HoldingSuggestion => {
  if (!insights || insights.insufficientData || insights.rangePosition == null || insights.trendDirection == null) {
    return {
      label: "Not enough data",
      tone: "neutral",
      meaning: "There isn't enough recent price history yet to compute a 1-month trend for this symbol.",
      description: "Not enough recent price history to compute a trend for this position yet.",
    };
  }
  const pnlPct = holding.unrealizedPnlPercent ?? 0;
  const { trendDirection, rangePosition } = insights;

  if (pnlPct > 5 && rangePosition >= 80 && trendDirection === "up") {
    return {
      label: "Near recent high, in profit",
      tone: "positive",
      meaning:
        "The price is both rising and sitting near the top of where it's traded over the last month, while you're up on the position. This combination is often when traders consider taking some profit, since a price near its recent ceiling has less \"room\" left in that range than one near its floor — though it can also keep climbing past it.",
      description: `Up ${pnlPct.toFixed(1)}% on this position and trading near the top of its 1-month range.`,
    };
  }
  if (pnlPct < -5 && rangePosition <= 20 && trendDirection === "down") {
    return {
      label: "Near recent low, at a loss",
      tone: "negative",
      meaning:
        "The price is falling and sitting near the bottom of its 1-month range, and you're down on the position. Worth revisiting why you bought it — if nothing about the underlying business/asset has changed, some hold through dips like this; if something has changed, that's usually the more important signal than the price itself.",
      description: `Down ${Math.abs(pnlPct).toFixed(1)}% and trading near the bottom of its 1-month range.`,
    };
  }
  if (trendDirection === "up") {
    return {
      label: "Uptrend",
      tone: "positive",
      meaning:
        "The price's 7-day average has been climbing over the past month — momentum has generally been upward. That's a description of the recent past, not a promise: trends reverse often and without warning.",
      description: `Currently ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% on this position. No extreme signal either way — hold and keep watching.`,
    };
  }
  if (trendDirection === "down") {
    return {
      label: "Downtrend",
      tone: "negative",
      meaning:
        "The price's 7-day average has been falling over the past month — momentum has generally been downward. That's a description of the recent past, not a promise: trends reverse often and without warning.",
      description: `Currently ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% on this position. No extreme signal either way — hold and keep watching.`,
    };
  }
  return {
    label: "Hold / monitor",
    tone: "neutral",
    meaning: "The price hasn't shown a clear up or down trend recently — it's been roughly sideways.",
    description: "No strong trend in either direction recently — nothing here suggests urgency.",
  };
};
