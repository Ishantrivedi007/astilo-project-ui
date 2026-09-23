import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Newspaper, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchNewsClusters, fetchTrendingSymbols } from "../../lib/marketsApi";
import "./Markets.scss";

const MAX_SYMBOLS = 8;

const MarketsNews = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [input, setInput] = useState("");

  // Real, live trending tickers (same source as the home page's Trending
  // section) drive both the quick-pick chips and the initial selection —
  // no fixed example-symbol list standing in for "what's popular right now."
  const trendingQuery = useQuery({
    queryKey: ["markets", "trending", "US"],
    queryFn: () => fetchTrendingSymbols("US"),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const quickPicks = trendingQuery.data?.data.symbols ?? [];

  useEffect(() => {
    if (!seeded && quickPicks.length > 0) {
      setSeeded(true);
      setSymbols(quickPicks.slice(0, 4));
    }
  }, [seeded, quickPicks]);

  const clustersQuery = useQuery({
    queryKey: ["markets", "news-clusters", symbols],
    queryFn: () => fetchNewsClusters(symbols, 10),
    enabled: symbols.length > 0,
    retry: false,
  });

  const toggleSymbol = (s: string) => {
    setSymbols((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= MAX_SYMBOLS) return prev;
      return [...prev, s];
    });
  };

  const addFreeText = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = input.trim().toUpperCase();
    if (!symbol || symbols.includes(symbol) || symbols.length >= MAX_SYMBOLS) return;
    setSymbols((prev) => [...prev, symbol]);
    setInput("");
  };

  const clusters = clustersQuery.data?.data.clusters ?? [];

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Newspaper size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        News Clusters
      </h1>
      <p className="markets-tagline">
        Related articles across multiple symbols and sources, grouped into a single story timeline — instead of a
        flat list of duplicate headlines.
      </p>

      {trendingQuery.isLoading && <p className="markets-unavailable">Loading trending symbols…</p>}
      <div className="markets-filter-row">
        {quickPicks.map((s) => (
          <button
            key={s}
            type="button"
            className={`markets-filter-chip ${symbols.includes(s) ? "active" : ""}`}
            onClick={() => toggleSymbol(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={addFreeText}>
        <div className="markets-search-row">
          <input
            className="markets-search-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add another symbol — e.g. META"
            disabled={symbols.length >= MAX_SYMBOLS}
          />
          <button type="submit" className="markets-chip" disabled={symbols.length >= MAX_SYMBOLS}>
            Add
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {symbols.map((s) => (
          <span key={s} className="markets-chip active inline-flex items-center gap-1">
            {s}
            <button type="button" onClick={() => toggleSymbol(s)} aria-label={`Remove ${s}`} style={{ display: "flex" }}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {symbols.length === 0 && <p className="markets-unavailable mt-3">Add at least one symbol to see news clusters.</p>}
      {clustersQuery.isLoading && <p className="markets-unavailable mt-3">Loading clusters…</p>}
      {clustersQuery.isError && <p className="markets-unavailable mt-3">Couldn't load news clusters right now.</p>}
      {!clustersQuery.isLoading && symbols.length > 0 && clusters.length === 0 && (
        <p className="markets-unavailable mt-3">No news clusters found for these symbols.</p>
      )}

      <div style={{ marginTop: "1.2rem" }}>
        {clusters.map((cluster, ci) => (
          <div key={ci} className="markets-news-cluster">
            <div className="markets-news-cluster-tags">
              {cluster.symbols.map((s) => (
                <span key={s} className="markets-news-cluster-tag">
                  {s}
                </span>
              ))}
              {cluster.sources.map((src) => (
                <span key={src} className="markets-news-cluster-tag">
                  {src}
                </span>
              ))}
            </div>
            <p className="markets-news-cluster-headline">{cluster.headline}</p>
            <div className="markets-news-list">
              {cluster.timeline.map((a) => (
                <a key={a.link} href={a.link} target="_blank" rel="noreferrer" className="markets-news-item">
                  <p className="markets-news-title">
                    {a.title} <ExternalLink size={11} style={{ display: "inline", verticalAlign: "-1px" }} />
                  </p>
                  {a.description && <p className="markets-news-desc">{a.description}</p>}
                  <p className="markets-news-meta">
                    {a.source} · {a.symbol} · {a.publishedAt}
                  </p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketsNews;
