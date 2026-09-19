import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ArrowLeft, Globe2, TrendingDown, TrendingUp } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchMarketRegions, type RegionIndex } from "../../lib/marketsApi";
import "./Markets.scss";

// A free, public, keyless world topology — the same dataset react-simple-maps'
// own docs use for this exact purpose.
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const colorFor = (changePercent: number | null): string => {
  if (changePercent == null) return "#2a2a35";
  if (changePercent >= 1.5) return "#16a34a";
  if (changePercent >= 0.3) return "#4ade80";
  if (changePercent > -0.3) return "#6b7280";
  if (changePercent > -1.5) return "#f87171";
  return "#dc2626";
};

const MarketsWorldMap = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<RegionIndex | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const regionsQuery = useQuery({
    queryKey: ["markets", "regions"],
    queryFn: fetchMarketRegions,
    staleTime: 60_000,
  });

  const results = useMemo(() => regionsQuery.data?.data.results ?? [], [regionsQuery.data]);
  const byName = useMemo(() => {
    const m = new Map<string, RegionIndex>();
    for (const r of results) m.set(r.name, r);
    return m;
  }, [results]);

  const gainers = useMemo(() => [...results].filter((r) => r.changePercent != null).sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 5), [results]);
  const losers = useMemo(() => [...results].filter((r) => r.changePercent != null).sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0)).slice(0, 5), [results]);

  const byRegion = useMemo(() => {
    const groups = new Map<string, RegionIndex[]>();
    for (const r of results) {
      const arr = groups.get(r.region) ?? [];
      arr.push(r);
      groups.set(r.region, arr);
    }
    return groups;
  }, [results]);

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Globe2 size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        World markets, live
      </h1>
      <p className="markets-tagline">
        Each country's own real benchmark index (S&amp;P 500, FTSE 100, Nikkei 225, Sensex…) — live from Yahoo
        Finance, colored by today's actual change. Not a forecast; this is what already happened.
      </p>

      {regionsQuery.isLoading && <p className="markets-unavailable">Loading live index data for 25 countries…</p>}
      {regionsQuery.isError && <p className="markets-unavailable">Couldn't load world market data right now.</p>}

      <div className="markets-map-wrap">
        <ComposableMap projectionConfig={{ scale: 148 }} style={{ width: "100%", height: "auto" }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = (geo.properties as { name?: string } | undefined)?.name ?? "";
                const entry = byName.get(name);
                const isHovered = hoveredName === name;
                return (
                  <Geography
                    key={geo.id ?? name}
                    geography={geo}
                    fill={isHovered && entry ? "#facc15" : colorFor(entry?.changePercent ?? null)}
                    stroke="#0d0d12"
                    strokeWidth={0.4}
                    onMouseEnter={() => {
                      if (entry) {
                        setHovered(entry);
                        setHoveredName(name);
                      }
                    }}
                    onMouseLeave={() => {
                      setHovered(null);
                      setHoveredName(null);
                    }}
                    onClick={() => entry && navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(entry.symbol)}&type=stock`)}
                    style={{ outline: "none", cursor: entry ? "pointer" : "default" }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {hovered && (
          <div className="markets-map-tooltip">
            <p className="markets-quote-name">
              {hovered.name} — {hovered.indexName}
            </p>
            <p className={`markets-quote-change ${(hovered.changePercent ?? 0) >= 0 ? "positive" : "negative"}`}>
              {hovered.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {hovered.currency}{" "}
              {hovered.changePercent != null && (
                <>
                  ({hovered.changePercent >= 0 ? "+" : ""}
                  {hovered.changePercent.toFixed(2)}%)
                </>
              )}
            </p>
          </div>
        )}

        <div className="markets-map-legend">
          <span>
            <i style={{ background: "#dc2626" }} /> Sharp loss
          </span>
          <span>
            <i style={{ background: "#f87171" }} /> Loss
          </span>
          <span>
            <i style={{ background: "#6b7280" }} /> Flat
          </span>
          <span>
            <i style={{ background: "#4ade80" }} /> Gain
          </span>
          <span>
            <i style={{ background: "#16a34a" }} /> Sharp gain
          </span>
          <span>
            <i style={{ background: "#2a2a35" }} /> No data
          </span>
        </div>
      </div>

      <div className="markets-map-columns">
        <div>
          <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={16} color="#4ade80" /> Top gainers today
          </h2>
          <div className="markets-search-results">
            {gainers.map((r) => (
              <button
                key={r.country}
                type="button"
                className="markets-search-result-row"
                onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(r.symbol)}&type=stock`)}
              >
                <span className="markets-result-left">
                  <span>
                    <span className="markets-result-name">{r.name}</span> <span className="markets-result-meta">{r.indexName}</span>
                  </span>
                </span>
                <span className="markets-quote-change positive">
                  +{r.changePercent?.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingDown size={16} color="#f87171" /> Top losers today
          </h2>
          <div className="markets-search-results">
            {losers.map((r) => (
              <button
                key={r.country}
                type="button"
                className="markets-search-result-row"
                onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(r.symbol)}&type=stock`)}
              >
                <span className="markets-result-left">
                  <span>
                    <span className="markets-result-name">{r.name}</span> <span className="markets-result-meta">{r.indexName}</span>
                  </span>
                </span>
                <span className="markets-quote-change negative">{r.changePercent?.toFixed(2)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {[...byRegion.entries()].map(([region, list]) => (
        <div key={region}>
          <h2 className="markets-section-title">{region}</h2>
          <div className="markets-quote-grid">
            {list.map((r) => (
              <button
                key={r.country}
                type="button"
                className="markets-quote-card"
                onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(r.symbol)}&type=stock`)}
              >
                <div className="markets-quote-card-head">
                  <span className="markets-quote-symbol">{r.country}</span>
                </div>
                <span className="markets-quote-name">
                  {r.name} · {r.indexName}
                </span>
                <span className="markets-quote-price">
                  {r.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {r.currency}
                </span>
                {r.changePercent != null && (
                  <span className={`markets-quote-change ${r.changePercent >= 0 ? "positive" : "negative"}`}>
                    {r.changePercent >= 0 ? "+" : ""}
                    {r.changePercent.toFixed(2)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarketsWorldMap;
