import axios from "axios";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";
const markets = axios.create({ baseURL: `${API_BASE}/markets`, timeout: 20000 });

export type AssetType = "stock" | "crypto";
export type MarketRange = "1d" | "5d" | "1mo" | "6mo" | "1y" | "5y" | "max";

export interface MarketPoint {
  t: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface MarketAssetData {
  symbol: string;
  name: string;
  currency: string | null;
  exchange: string | null;
  instrumentType: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap?: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketTime: number | null;
  range: string;
  interval: string;
  points: MarketPoint[];
}

export interface MarketEnvelope<T> {
  source: string;
  sourceDataset: string;
  symbol: string | null;
  retrievedAt: string;
  data: T;
}

export async function fetchMarketAsset(symbol: string, assetType: AssetType, range: MarketRange = "1mo") {
  const { data } = await markets.get(`/asset`, { params: { symbol, asset_type: assetType, range } });
  return data as MarketEnvelope<MarketAssetData>;
}

export interface MarketSearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  quoteType: string | null;
  sector: string | null;
}

export async function searchMarkets(query: string, assetType: AssetType, limit = 10) {
  const { data } = await markets.get(`/search`, { params: { q: query, asset_type: assetType, limit } });
  return data as MarketEnvelope<{ count: number; results: MarketSearchResult[] }>;
}

export interface TopCoin {
  symbol: string;
  name: string;
  ticker: string;
  price: number;
  changePercent: number;
  marketCap: number;
  image: string;
}

export async function fetchTopCrypto(limit = 20) {
  const { data } = await markets.get(`/top`, { params: { asset_type: "crypto", limit } });
  return data as MarketEnvelope<{ count: number; results: TopCoin[] }>;
}

export async function fetchTrendingSymbols() {
  const { data } = await markets.get(`/top`, { params: { asset_type: "stock" } });
  return data as MarketEnvelope<{ symbols: string[] }>;
}

export const RANGE_LABEL: Record<MarketRange, string> = {
  "1d": "1D",
  "5d": "5D",
  "1mo": "1M",
  "6mo": "6M",
  "1y": "1Y",
  "5y": "5Y",
  max: "Max",
};

export const RANGES: MarketRange[] = ["1d", "5d", "1mo", "6mo", "1y", "5y", "max"];
