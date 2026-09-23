import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import { RANGE_LABEL, RANGES, type MarketRange } from "../../lib/marketsApi";
import { COMMODITIES } from "../../lib/marketsCatalog";
import { useComparisonChart } from "../../lib/useComparisonChart";
import MarketQuoteCard from "./MarketQuoteCard";
import "./Markets.scss";

const DEFAULT_SELECTED = ["GC=F", "SI=F", "CL=F", "NG=F"];

const MarketsCommodities = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const [range, setRange] = useState<MarketRange>("6mo");

  const toggle = (symbol: string) => {
    setSelected((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  const selectedSymbols = useMemo(
    () => COMMODITIES.filter((c) => selected.includes(c.symbol)).map((c) => ({ symbol: c.symbol, label: c.label })),
    [selected]
  );

  const { chartSeries, isLoading } = useComparisonChart({ symbols: selectedSymbols, range });

  const chartOptions = {
    xaxis: { type: "datetime" as const },
    yaxis: { labels: { formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` } },
    tooltip: { x: { format: "dd MMM yyyy" }, y: { formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` } },
    stroke: { curve: "smooth" as const, width: 2.5 },
    legend: { show: true },
  };

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Flame size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Commodity Explorer
      </h1>
      <p className="markets-tagline">
        Real-time metals, energy and agricultural futures via Yahoo Finance, plus a normalized comparison chart so
        you can see relative performance regardless of price scale.
      </p>

      <h2 className="markets-section-title">All commodities</h2>
      <div className="markets-quote-grid">
        {COMMODITIES.map((c) => (
          <MarketQuoteCard key={c.symbol} symbol={c.symbol} assetType="stock" label={c.label} category="commodity" showWatchlistToggle />
        ))}
      </div>

      <h2 className="markets-section-title">Compare performance (% change)</h2>

      <div className="markets-filter-row">
        {COMMODITIES.map((c) => (
          <button
            key={c.symbol}
            type="button"
            className={`markets-filter-chip ${selected.includes(c.symbol) ? "active" : ""}`}
            onClick={() => toggle(c.symbol)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="markets-range-row">
        {RANGES.map((r) => (
          <button key={r} type="button" className={`markets-range-chip ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {isLoading && <p className="markets-unavailable">Loading comparison…</p>}
      {!isLoading && chartSeries.length > 0 && <Chart type="line" height={360} series={chartSeries} options={chartOptions} />}
      {!isLoading && chartSeries.length === 0 && <p className="markets-unavailable">Select at least one commodity to compare.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedSymbols.map((s) => (
          <button
            key={s.symbol}
            type="button"
            className="markets-chip"
            onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(s.symbol)}&type=stock`)}
          >
            {s.label} — full chart
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketsCommodities;
