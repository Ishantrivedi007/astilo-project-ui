// Shared curated symbol lists used across Markets pages (home page previews
// and the dedicated Commodity Explorer / Forex Lab pages) so the lists don't
// drift out of sync between files.

export interface CatalogSymbol {
  symbol: string;
  label: string;
}

export const COMMODITIES: CatalogSymbol[] = [
  { symbol: "GC=F", label: "Gold" },
  { symbol: "SI=F", label: "Silver" },
  { symbol: "CL=F", label: "Crude Oil" },
  { symbol: "NG=F", label: "Natural Gas" },
  { symbol: "HG=F", label: "Copper" },
  { symbol: "ZW=F", label: "Wheat" },
  { symbol: "ZC=F", label: "Corn" },
  { symbol: "KC=F", label: "Coffee" },
  { symbol: "CT=F", label: "Cotton" },
];

export const FOREX: CatalogSymbol[] = [
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "GBPUSD=X", label: "GBP/USD" },
  { symbol: "JPY=X", label: "USD/JPY" },
  { symbol: "INR=X", label: "USD/INR" },
  { symbol: "AUDUSD=X", label: "AUD/USD" },
  { symbol: "USDCAD=X", label: "USD/CAD" },
  { symbol: "USDCHF=X", label: "USD/CHF" },
  { symbol: "NZDUSD=X", label: "NZD/USD" },
  { symbol: "EURGBP=X", label: "EUR/GBP" },
];

export const BONDS: CatalogSymbol[] = [
  { symbol: "^TNX", label: "US 10Y Yield" },
  { symbol: "^TYX", label: "US 30Y Yield" },
  { symbol: "^FVX", label: "US 5Y Yield" },
  { symbol: "^IRX", label: "US 13W Rate" },
  { symbol: "TLT", label: "20+Y Treasury ETF" },
  { symbol: "IEF", label: "7-10Y Treasury ETF" },
  { symbol: "SHY", label: "1-3Y Treasury ETF" },
  { symbol: "BND", label: "Total Bond Market" },
  { symbol: "AGG", label: "Core US Aggregate" },
  { symbol: "LQD", label: "Inv. Grade Corporate" },
  { symbol: "HYG", label: "High Yield Corporate" },
];

/** Cross-asset reference symbols for the Forex Lab's comparison chart — the
 * "USD/INR vs Gold vs NIFTY" style overlay. Each needs its own assetType
 * since Bitcoin is fetched via the crypto endpoint, everything else via
 * the stock/Yahoo endpoint. */
export interface CrossAssetSymbol extends CatalogSymbol {
  assetType: "stock" | "crypto";
}

export const CROSS_ASSET_REFERENCES: CrossAssetSymbol[] = [
  { symbol: "INR=X", label: "USD/INR", assetType: "stock" },
  { symbol: "GC=F", label: "Gold", assetType: "stock" },
  { symbol: "^NSEI", label: "NIFTY 50", assetType: "stock" },
  { symbol: "^GSPC", label: "S&P 500", assetType: "stock" },
  { symbol: "bitcoin", label: "Bitcoin", assetType: "crypto" },
];

/** Exchange -> the Yahoo Finance trending region that best covers it, used
 * to drive "Browse by exchange" from real, live trending data instead of a
 * curated ticker list. Yahoo's trending endpoint is genuinely keyed by
 * country, not by individual exchange, so NYSE and NASDAQ (both US) share
 * a region and NSE/BSE (both India) share one too — that's a real
 * limitation of the free data source, not something we can subdivide
 * further without fabricating a split Yahoo doesn't provide. When a
 * region's trending list comes back empty (which happens — India's has no
 * trending results as of this writing), the UI shows that honestly rather
 * than padding it with a fallback list. */
export interface ExchangeRegion {
  key: string;
  label: string;
  region: string;
}

export const EXCHANGE_REGIONS: ExchangeRegion[] = [
  { key: "NYSE", label: "NYSE", region: "US" },
  { key: "NASDAQ", label: "NASDAQ", region: "US" },
  { key: "NSE", label: "NSE", region: "IN" },
  { key: "BSE", label: "BSE", region: "IN" },
  { key: "LSE", label: "LSE", region: "GB" },
];
