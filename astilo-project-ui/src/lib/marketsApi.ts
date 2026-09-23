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
  logoUrl: string | null;
  marketTime: number | null;
  founded?: string | null;
  about?: string | null;
  athPrice?: number | null;
  athDate?: string | null;
  atlPrice?: number | null;
  atlDate?: string | null;
  range: string;
  interval: string;
  points: MarketPoint[];
  /** Set only by the gold/silver last-resort fallback (gold-api.com) when
   * every other provider — including Yahoo itself — had nothing: a real
   * current price, but genuinely no historical series to chart. */
  spotOnly?: boolean;
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
  logoUrl: string | null;
}

export async function searchMarkets(query: string, assetType: AssetType, limit = 10) {
  const { data } = await markets.get(`/search`, { params: { q: query, asset_type: assetType, limit } });
  return data as MarketEnvelope<{ count: number; results: MarketSearchResult[] }>;
}

export interface RegionIndex {
  country: string;
  region: string;
  name: string;
  symbol: string;
  indexName: string;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
}

export async function fetchMarketRegions() {
  const { data } = await markets.get(`/regions`);
  return data as MarketEnvelope<{ count: number; results: RegionIndex[] }>;
}

export interface TopCoin {
  symbol: string;
  name: string;
  ticker: string;
  price: number;
  changePercent: number;
  marketCap: number;
  logoUrl: string;
}

export interface MarketArticle {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
}

export async function fetchMarketNews(symbol: string, limit = 8) {
  const { data } = await markets.get(`/news`, { params: { symbol, limit } });
  return data as MarketEnvelope<{ count: number; results: MarketArticle[] }>;
}

export async function fetchTopCrypto(limit = 20) {
  const { data } = await markets.get(`/top`, { params: { asset_type: "crypto", limit } });
  return data as MarketEnvelope<{ count: number; results: TopCoin[] }>;
}

export async function fetchTrendingSymbols(region = "US") {
  const { data } = await markets.get(`/top`, { params: { asset_type: "stock", region } });
  return data as MarketEnvelope<{ region: string; symbols: string[] }>;
}

export interface SimilarCompany {
  symbol: string;
  name: string;
  exchange: string | null;
  quoteType: string | null;
  sector: string | null;
  logoUrl: string | null;
}

export type FundamentalsData =
  | { available: false; reason: string }
  | {
      available: true;
      peRatioTrailing: number | null;
      peRatioForward: number | null;
      dividendYield: number | null;
      dividendRate: number | null;
      exDividendDate: string | null;
      payoutRatio: number | null;
      beta: number | null;
      marketCap: number | null;
      eps: number | null;
      bookValue: number | null;
      priceToBook: number | null;
      fiftyTwoWeekChangePercent: number | null;
      sector: string | null;
      industry: string | null;
      fullTimeEmployees: number | null;
      website: string | null;
      longBusinessSummary: string | null;
      similarCompanies: SimilarCompany[];
    };

export async function fetchMarketFundamentals(symbol: string) {
  const { data } = await markets.get(`/fundamentals`, { params: { symbol } });
  return data as MarketEnvelope<FundamentalsData>;
}

export interface MacroIndicatorPoint {
  year: number;
  value: number | null;
}

export interface IndicatorData {
  countryCode: string;
  countryName: string | null;
  indicator: string;
  indicatorCode: string;
  points: MacroIndicatorPoint[];
  latestKnown: { year: number; value: number } | null;
}

export type MacroIndicatorKey = "gdp" | "gdpGrowth" | "inflation" | "unemployment" | "interestRate";

export interface MacroDashboardData {
  countryCode: string;
  countryName: string | null;
  indicators: Record<MacroIndicatorKey, IndicatorData | null>;
}

export async function fetchMacroDashboard(countryCode: string) {
  const { data } = await markets.get(`/macro`, { params: { country: countryCode } });
  return data as MarketEnvelope<MacroDashboardData>;
}

export async function fetchMacroIndicator(countryCode: string, indicator: MacroIndicatorKey) {
  const { data } = await markets.get(`/macro/indicator`, { params: { country: countryCode, indicator } });
  return data as MarketEnvelope<IndicatorData>;
}

export interface NewsClusterArticle {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  symbol: string;
  source: string;
}

export interface NewsCluster {
  headline: string;
  timeline: NewsClusterArticle[];
  sources: string[];
  symbols: string[];
}

export async function fetchNewsClusters(symbols: string[], limitPerSymbol = 10) {
  const { data } = await markets.get(`/news-clusters`, {
    params: { symbols: symbols.join(","), limit_per_symbol: limitPerSymbol },
  });
  return data as MarketEnvelope<{ count: number; clusters: NewsCluster[] }>;
}

export const INDICATOR_LABEL: Record<MacroIndicatorKey, string> = {
  gdp: "GDP",
  gdpGrowth: "GDP Growth",
  inflation: "Inflation (CPI)",
  unemployment: "Unemployment",
  interestRate: "Real Interest Rate",
};

export interface MacroCountry {
  code: string;
  name: string;
  region: string | null;
}

/** The real, full list of countries the World Bank publishes indicators
 * for (not a curated shortlist) — fetched live so it never drifts from
 * what the backend's macro dashboard can actually serve. */
export async function fetchMacroCountries() {
  const { data } = await markets.get(`/countries`);
  return data as MarketEnvelope<{ count: number; results: MacroCountry[] }>;
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
