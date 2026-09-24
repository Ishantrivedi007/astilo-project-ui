import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Repeat } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import { RANGE_LABEL, RANGES, type MarketRange } from "../../lib/marketsApi";
import { CROSS_ASSET_REFERENCES, FOREX } from "../../lib/marketsCatalog";
import { useComparisonChart, type ComparisonSymbol } from "../../lib/useComparisonChart";
import MarketQuoteCard from "./MarketQuoteCard";
import "./Markets.scss";

const DEFAULT_REFERENCES = ["INR=X", "GC=F", "^NSEI"];

const MarketsForex = () => {
  const navigate = useNavigate();
  const [selectedForex, setSelectedForex] = useState<string[]>(["EURUSD=X", "GBPUSD=X"]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>(DEFAULT_REFERENCES);
  const [range, setRange] = useState<MarketRange>("1y");

  const toggleForex = (symbol: string) => {
    setSelectedForex((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };
  const toggleRef = (symbol: string) => {
    setSelectedRefs((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  const comparisonSymbols: ComparisonSymbol[] = useMemo(() => {
    const forexSymbols: ComparisonSymbol[] = FOREX.filter((f) => selectedForex.includes(f.symbol)).map((f) => ({
      symbol: f.symbol,
      label: f.label,
      assetType: "stock",
    }));
    const refSymbols: ComparisonSymbol[] = CROSS_ASSET_REFERENCES.filter((r) => selectedRefs.includes(r.symbol)).map((r) => ({
      symbol: r.symbol,
      label: r.label,
      assetType: r.assetType,
    }));
    // De-dupe in case a symbol appears in both lists (e.g. a forex pair also listed as a reference).
    const seen = new Set<string>();
    return [...forexSymbols, ...refSymbols].filter((s) => {
      const key = `${s.assetType}:${s.symbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedForex, selectedRefs]);

  const { chartSeries, isLoading } = useComparisonChart({ symbols: comparisonSymbols, range });

  const chartOptions = {
    xaxis: { type: "datetime" as const, title: { text: "Date" } },
    yaxis: { title: { text: "Change from start of range (%)" }, labels: { formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` } },
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
        <Repeat size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Forex Lab
      </h1>
      <p className="markets-tagline">
        Major currency pairs via Yahoo Finance, plus a cross-asset comparison — see how a currency pair moves
        against gold, major indices, or Bitcoin over time, all normalized to % change so scale doesn't matter.
      </p>

      <h2 className="markets-section-title">Currency pairs</h2>
      <div className="markets-quote-grid">
        {FOREX.map((f) => (
          <MarketQuoteCard key={f.symbol} symbol={f.symbol} assetType="stock" label={f.label} category="forex" showWatchlistToggle />
        ))}
      </div>

      <h2 className="markets-section-title">Cross-asset comparison</h2>
      <p className="markets-unavailable" style={{ marginBottom: "0.5rem" }}>
        e.g. USD/INR vs Gold vs NIFTY 50 — toggle pairs and reference assets below.
      </p>

      <div className="markets-filter-row">
        {FOREX.map((f) => (
          <button
            key={f.symbol}
            type="button"
            className={`markets-filter-chip ${selectedForex.includes(f.symbol) ? "active" : ""}`}
            onClick={() => toggleForex(f.symbol)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="markets-filter-row">
        {CROSS_ASSET_REFERENCES.map((r) => (
          <button
            key={r.symbol}
            type="button"
            className={`markets-filter-chip ${selectedRefs.includes(r.symbol) ? "active" : ""}`}
            onClick={() => toggleRef(r.symbol)}
          >
            {r.label}
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
      {!isLoading && chartSeries.length === 0 && <p className="markets-unavailable">Select at least one symbol to compare.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {comparisonSymbols.map((s) => (
          <button
            key={`${s.assetType}:${s.symbol}`}
            type="button"
            className="markets-chip"
            onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(s.symbol)}&type=${s.assetType ?? "stock"}`)}
          >
            {s.label} — full chart
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketsForex;
