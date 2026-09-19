import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Search } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchTopCrypto, fetchTrendingSymbols, searchMarkets, type AssetType } from "../../lib/marketsApi";
import MarketQuoteCard from "./MarketQuoteCard";
import "./Markets.scss";

const STOCKS = [
  { symbol: "AAPL", label: "Apple" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "GOOGL", label: "Alphabet" },
  { symbol: "AMZN", label: "Amazon" },
  { symbol: "NVDA", label: "Nvidia" },
  { symbol: "TSLA", label: "Tesla" },
];

const INDICES = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^FTSE", label: "FTSE 100" },
];

const COMMODITIES = [
  { symbol: "GC=F", label: "Gold" },
  { symbol: "SI=F", label: "Silver" },
  { symbol: "CL=F", label: "Crude Oil" },
  { symbol: "NG=F", label: "Natural Gas" },
];

const FOREX = [
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "GBPUSD=X", label: "GBP/USD" },
  { symbol: "JPY=X", label: "USD/JPY" },
  { symbol: "INR=X", label: "USD/INR" },
];

const FUNDS = [
  { symbol: "SPY", label: "S&P 500 ETF" },
  { symbol: "QQQ", label: "Nasdaq 100 ETF" },
  { symbol: "VOO", label: "Vanguard S&P 500" },
  { symbol: "JPM", label: "JPMorgan Chase" },
];

const MarketsHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searchType, setSearchType] = useState<AssetType>("stock");

  const searchQuery = useQuery({
    queryKey: ["markets", "search", submitted, searchType],
    queryFn: () => searchMarkets(submitted, searchType),
    enabled: !!submitted,
    retry: false,
  });

  const cryptoQuery = useQuery({
    queryKey: ["markets", "top", "crypto"],
    queryFn: () => fetchTopCrypto(12),
    staleTime: 60_000,
  });

  const trendingQuery = useQuery({
    queryKey: ["markets", "trending"],
    queryFn: fetchTrendingSymbols,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const results = searchQuery.data?.data.results ?? [];

  return (
    <div className="markets-page">
      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <LineChart size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Real market data, live and historical
      </h1>
      <p className="markets-tagline">
        Stocks, ETFs/funds, indices, commodities, and forex via Yahoo Finance's public data — crypto via
        CoinGecko. Both free and keyless. Every quote shows its real source and when it was fetched.
      </p>

      <form onSubmit={submit}>
        <div className="markets-search-row">
          <input
            className="markets-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a symbol or company — AAPL, Tesla, Bitcoin, gold…"
          />
          <div className="markets-type-toggle">
            <button type="button" className={searchType === "stock" ? "active" : ""} onClick={() => setSearchType("stock")}>
              Stocks &amp; more
            </button>
            <button type="button" className={searchType === "crypto" ? "active" : ""} onClick={() => setSearchType("crypto")}>
              Crypto
            </button>
          </div>
          <button type="submit" className="markets-chip">
            <Search size={12} style={{ display: "inline", verticalAlign: "-2px" }} /> Search
          </button>
        </div>
      </form>

      {searchQuery.isLoading && <p className="markets-unavailable">Searching…</p>}
      {submitted && !searchQuery.isLoading && results.length > 0 && (
        <div className="markets-search-results">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              className="markets-search-result-row"
              onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(r.symbol)}&type=${searchType}`)}
            >
              <span>
                <span className="markets-result-name">{r.name}</span>{" "}
                <span className="markets-result-meta">{r.symbol}</span>
              </span>
              <span className="markets-result-meta">{r.exchange ?? r.quoteType}</span>
            </button>
          ))}
        </div>
      )}
      {submitted && !searchQuery.isLoading && results.length === 0 && (
        <p className="markets-unavailable">No matches for "{submitted}".</p>
      )}

      <h2 className="markets-section-title">Crypto — top by market cap</h2>
      <div className="markets-quote-grid">
        {cryptoQuery.data?.data.results.map((c) => (
          <button
            key={c.symbol}
            type="button"
            className="markets-quote-card"
            onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${c.symbol}&type=crypto`)}
          >
            <span className="markets-quote-symbol">{c.ticker}</span>
            <span className="markets-quote-name">{c.name}</span>
            <span className="markets-quote-price">${c.price.toLocaleString(undefined, { maximumFractionDigits: c.price < 5 ? 4 : 2 })}</span>
            <span className={`markets-quote-change ${c.changePercent >= 0 ? "positive" : "negative"}`}>
              {c.changePercent >= 0 ? "+" : ""}
              {c.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
        {cryptoQuery.isLoading && <p className="markets-unavailable">Loading…</p>}
      </div>

      <h2 className="markets-section-title">Trending today</h2>
      <div className="markets-quote-grid">
        {trendingQuery.data?.data.symbols.slice(0, 12).map((s) => (
          <MarketQuoteCard key={s} symbol={s} assetType="stock" />
        ))}
        {trendingQuery.isError && <p className="markets-unavailable">Trending list unavailable right now.</p>}
      </div>

      <h2 className="markets-section-title">Stocks</h2>
      <div className="markets-quote-grid">
        {STOCKS.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} />
        ))}
      </div>

      <h2 className="markets-section-title">Indices</h2>
      <div className="markets-quote-grid">
        {INDICES.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} />
        ))}
      </div>

      <h2 className="markets-section-title">Commodities</h2>
      <div className="markets-quote-grid">
        {COMMODITIES.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} />
        ))}
      </div>

      <h2 className="markets-section-title">Forex</h2>
      <div className="markets-quote-grid">
        {FOREX.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} />
        ))}
      </div>

      <h2 className="markets-section-title">Funds &amp; banks</h2>
      <div className="markets-quote-grid">
        {FUNDS.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} />
        ))}
      </div>
    </div>
  );
};

export default MarketsHome;
