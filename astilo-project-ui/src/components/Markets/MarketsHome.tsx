import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Flame, Globe2, Landmark, LineChart, Newspaper, PieChart, Repeat, Scale, Search, Star } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchTopCrypto, fetchTrendingSymbols, searchMarkets, type AssetType } from "../../lib/marketsApi";
import { BONDS, COMMODITIES, EXCHANGE_REGIONS, FOREX } from "../../lib/marketsCatalog";
import MarketQuoteCard from "./MarketQuoteCard";
import MarketLogo, { categoryFromQuoteType, type MarketCategory } from "./MarketLogo";
import "./Markets.scss";

// Major benchmark indices are canonical, fixed-identity instruments (like
// the backend's own per-country REGION_INDICES list) — there's no dynamic
// "enumerate every index" API, so these ticker->name mappings are real
// reference data, not a curated guess standing in for one.
const INDICES = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^FTSE", label: "FTSE 100" },
];

const QUOTE_TYPE_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "EQUITY", label: "Stocks" },
  { value: "ETF", label: "ETFs/Funds" },
  { value: "INDEX", label: "Indices" },
  { value: "FUTURE", label: "Commodities" },
  { value: "CURRENCY", label: "Forex" },
];

const MarketsHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searchType, setSearchType] = useState<AssetType>("stock");
  const [quoteTypeFilter, setQuoteTypeFilter] = useState<string | null>(null);
  const [exchangeFilter, setExchangeFilter] = useState<string | null>(null);
  const [exchangeTab, setExchangeTab] = useState(EXCHANGE_REGIONS[0].key);
  const activeExchange = EXCHANGE_REGIONS.find((ex) => ex.key === exchangeTab) ?? EXCHANGE_REGIONS[0];
  const exchangeTrendingQuery = useQuery({
    queryKey: ["markets", "trending", activeExchange.region],
    queryFn: () => fetchTrendingSymbols(activeExchange.region),
    staleTime: 5 * 60_000,
    retry: false,
  });

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
    queryFn: () => fetchTrendingSymbols(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
    setQuoteTypeFilter(null);
    setExchangeFilter(null);
  };

  const allResults = searchQuery.data?.data.results ?? [];
  const results = useMemo(
    () =>
      allResults.filter(
        (r) => (!quoteTypeFilter || r.quoteType === quoteTypeFilter) && (!exchangeFilter || r.exchange === exchangeFilter)
      ),
    [allResults, quoteTypeFilter, exchangeFilter]
  );
  const availableTypes = useMemo(() => new Set(allResults.map((r) => r.quoteType)), [allResults]);
  const availableExchanges = useMemo(
    () => Array.from(new Set(allResults.map((r) => r.exchange).filter((e): e is string => !!e))),
    [allResults]
  );

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

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsMap)}>
          <Globe2 size={12} /> World map — which markets are up or down today
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.trading)}>
          <Landmark size={12} /> Simulated trading — practice buy/sell with fake money
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.tradingPortfolio)}>
          <PieChart size={12} /> Portfolio — holdings, allocation &amp; P&amp;L
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsCommodities)}>
          <Flame size={12} /> Commodity Explorer — compare gold, oil, crops &amp; more
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsForex)}>
          <Repeat size={12} /> Forex Lab — cross-asset currency comparisons
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsCompare)}>
          <Scale size={12} /> Compare Companies — side-by-side fundamentals
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsMacro)}>
          <LineChart size={12} /> Macro Dashboard — GDP, inflation &amp; more
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsNews)}>
          <Newspaper size={12} /> News Clusters — related stories, grouped
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsWatchlist)}>
          <Star size={12} /> Watchlist — symbols you're tracking
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsAlerts)}>
          <Bell size={12} /> Price Alerts — get notified at your target price
        </button>
        <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.marketsCalendar)}>
          <CalendarClock size={12} /> Calendar — earnings, IPOs &amp; economic releases
        </button>
      </div>

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
              Stocks, funds &amp; commodities
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

      {submitted && !searchQuery.isLoading && allResults.length > 0 && searchType === "stock" && (
        <div className="markets-filter-row">
          {QUOTE_TYPE_FILTERS.filter((f) => f.value === null || availableTypes.has(f.value)).map((f) => (
            <button
              key={f.label}
              type="button"
              className={`markets-filter-chip ${quoteTypeFilter === f.value ? "active" : ""}`}
              onClick={() => setQuoteTypeFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {submitted && !searchQuery.isLoading && allResults.length > 0 && searchType === "stock" && availableExchanges.length > 1 && (
        <div className="markets-filter-row">
          {[{ value: null, label: "All exchanges" }, ...availableExchanges.map((e) => ({ value: e, label: e }))].map((f) => (
            <button
              key={f.label}
              type="button"
              className={`markets-filter-chip ${exchangeFilter === f.value ? "active" : ""}`}
              onClick={() => setExchangeFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {submitted && !searchQuery.isLoading && results.length > 0 && (
        <div className="markets-search-results">
          {results.map((r) => {
            const category: MarketCategory = searchType === "crypto" ? "crypto" : categoryFromQuoteType(r.quoteType);
            return (
              <button
                key={r.symbol}
                type="button"
                className="markets-search-result-row"
                onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(r.symbol)}&type=${searchType}`)}
              >
                <span className="markets-result-left">
                  <MarketLogo logoUrl={r.logoUrl} category={category} name={r.name} size={28} />
                  <span className="markets-result-text">
                    <span className="markets-result-name">{r.name}</span>
                    <span className="markets-result-meta">{r.symbol}</span>
                  </span>
                </span>
                <span className="markets-result-meta">{r.exchange ?? r.quoteType}</span>
              </button>
            );
          })}
        </div>
      )}
      {submitted && !searchQuery.isLoading && allResults.length === 0 && (
        <p className="markets-unavailable">No matches for "{submitted}".</p>
      )}
      {submitted && !searchQuery.isLoading && allResults.length > 0 && results.length === 0 && (
        <p className="markets-unavailable">No "{QUOTE_TYPE_FILTERS.find((f) => f.value === quoteTypeFilter)?.label}" matches for "{submitted}".</p>
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
            <div className="markets-quote-card-head">
              <MarketLogo logoUrl={c.logoUrl} category="crypto" name={c.name} size={26} />
              <span className="markets-quote-symbol">{c.ticker}</span>
            </div>
            <span className="markets-quote-name">{c.name}</span>
            <span className="markets-quote-price">
              {c.price != null ? `$${c.price.toLocaleString(undefined, { maximumFractionDigits: c.price < 5 ? 4 : 2 })}` : "Data unavailable"}
            </span>
            {c.changePercent != null && (
              <span className={`markets-quote-change ${c.changePercent >= 0 ? "positive" : "negative"}`}>
                {c.changePercent >= 0 ? "+" : ""}
                {c.changePercent.toFixed(2)}%
              </span>
            )}
          </button>
        ))}
        {cryptoQuery.isLoading && <p className="markets-unavailable">Loading…</p>}
      </div>

      <h2 className="markets-section-title">Trending today</h2>
      <div className="markets-quote-grid">
        {trendingQuery.data?.data.symbols.slice(0, 12).map((s) => (
          <MarketQuoteCard key={s} symbol={s} assetType="stock" showWatchlistToggle />
        ))}
        {trendingQuery.isError && <p className="markets-unavailable">Trending list unavailable right now.</p>}
      </div>

      <h2 className="markets-section-title">Browse by exchange</h2>
      <p className="markets-unavailable" style={{ marginBottom: "0.5rem" }}>
        Real, live trending tickers per market — Yahoo's trending data is keyed by country, so NYSE/NASDAQ (both US)
        and NSE/BSE (both India) share a feed; that's a real limitation of the free source, not a shortcut we took.
      </p>
      <div className="markets-type-toggle mb-3">
        {EXCHANGE_REGIONS.map((ex) => (
          <button key={ex.key} type="button" className={exchangeTab === ex.key ? "active" : ""} onClick={() => setExchangeTab(ex.key)}>
            {ex.label}
          </button>
        ))}
      </div>
      {exchangeTrendingQuery.isLoading && <p className="markets-unavailable">Loading {activeExchange.label} trending…</p>}
      {exchangeTrendingQuery.isError && <p className="markets-unavailable">Trending data unavailable for {activeExchange.label} right now.</p>}
      {exchangeTrendingQuery.data && exchangeTrendingQuery.data.data.symbols.length === 0 && (
        <p className="markets-unavailable">Yahoo has no trending data for {activeExchange.label} right now — try searching directly above.</p>
      )}
      <div className="markets-quote-grid">
        {exchangeTrendingQuery.data?.data.symbols.map((s) => (
          <MarketQuoteCard key={s} symbol={s} assetType="stock" category="stock" showWatchlistToggle />
        ))}
      </div>

      <h2 className="markets-section-title">Indices</h2>
      <div className="markets-quote-grid">
        {INDICES.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} category="index" showWatchlistToggle />
        ))}
      </div>

      <h2 className="markets-section-title">Commodities</h2>
      <div className="markets-quote-grid">
        {COMMODITIES.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} category="commodity" showWatchlistToggle />
        ))}
      </div>

      <h2 className="markets-section-title">Forex</h2>
      <div className="markets-quote-grid">
        {FOREX.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} category="forex" showWatchlistToggle />
        ))}
      </div>

      <h2 className="markets-section-title">Bonds</h2>
      <div className="markets-quote-grid">
        {BONDS.map((s) => (
          <MarketQuoteCard key={s.symbol} symbol={s.symbol} assetType="stock" label={s.label} category="bond" showWatchlistToggle />
        ))}
      </div>

    </div>
  );
};

export default MarketsHome;
