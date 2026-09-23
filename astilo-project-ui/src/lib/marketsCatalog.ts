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

export interface ExchangePreset {
  key: string;
  label: string;
  symbols: CatalogSymbol[];
}

export const EXCHANGE_PRESETS: ExchangePreset[] = [
  {
    key: "NYSE",
    label: "NYSE",
    symbols: [
      { symbol: "JPM", label: "JPMorgan Chase" },
      { symbol: "KO", label: "Coca-Cola" },
      { symbol: "DIS", label: "Disney" },
      { symbol: "WMT", label: "Walmart" },
      { symbol: "V", label: "Visa" },
    ],
  },
  {
    key: "NASDAQ",
    label: "NASDAQ",
    symbols: [
      { symbol: "AAPL", label: "Apple" },
      { symbol: "MSFT", label: "Microsoft" },
      { symbol: "GOOGL", label: "Alphabet" },
      { symbol: "AMZN", label: "Amazon" },
      { symbol: "NVDA", label: "Nvidia" },
    ],
  },
  {
    key: "NSE",
    label: "NSE",
    symbols: [
      { symbol: "RELIANCE.NS", label: "Reliance Industries" },
      { symbol: "TCS.NS", label: "Tata Consultancy" },
      { symbol: "HDFCBANK.NS", label: "HDFC Bank" },
      { symbol: "INFY.NS", label: "Infosys" },
    ],
  },
  {
    key: "BSE",
    label: "BSE",
    symbols: [
      { symbol: "RELIANCE.BO", label: "Reliance Industries" },
      { symbol: "TCS.BO", label: "Tata Consultancy" },
    ],
  },
  {
    key: "LSE",
    label: "LSE",
    symbols: [
      { symbol: "HSBA.L", label: "HSBC" },
      { symbol: "BP.L", label: "BP" },
      { symbol: "ULVR.L", label: "Unilever" },
    ],
  },
];
