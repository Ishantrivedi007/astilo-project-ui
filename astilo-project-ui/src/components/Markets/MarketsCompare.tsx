import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Scale, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import {
  fetchMarketAsset,
  fetchMarketFundamentals,
  searchMarkets,
  RANGES,
  RANGE_LABEL,
  type FundamentalsData,
  type MarketAssetData,
  type MarketRange,
} from "../../lib/marketsApi";
import { useComparisonChart } from "../../lib/useComparisonChart";
import { Chart } from "../shared";
import MarketLogo, { categoryFromQuoteType } from "./MarketLogo";
import "./Markets.scss";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT"];
const MAX_SYMBOLS = 4;
const CHART_COLORS = ["#2f5bd7", "#6d3fc9", "#c98a1e", "#1591a3"];

const fmtNum = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCompact = (n: number | null | undefined) =>
  n == null ? "—" : Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(n);

const fmtPct = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(decimals)}%`;

interface Row {
  label: string;
  values: (asset: MarketAssetData | undefined, fundamentals: FundamentalsData | undefined) => string;
}

const ROWS: Row[] = [
  { label: "Price", values: (a) => (a?.price != null ? `${a.currency === "USD" ? "$" : ""}${fmtNum(a.price, a.price < 5 ? 4 : 2)}` : "—") },
  {
    label: "Change %",
    values: (a) => (a?.changePercent != null ? `${a.changePercent >= 0 ? "+" : ""}${a.changePercent.toFixed(2)}%` : "—"),
  },
  { label: "Day range", values: (a) => (a?.dayLow != null && a?.dayHigh != null ? `${fmtNum(a.dayLow)} – ${fmtNum(a.dayHigh)}` : "—") },
  {
    label: "52-week range",
    values: (a) => (a?.fiftyTwoWeekLow != null && a?.fiftyTwoWeekHigh != null ? `${fmtNum(a.fiftyTwoWeekLow)} – ${fmtNum(a.fiftyTwoWeekHigh)}` : "—"),
  },
  { label: "Volume", values: (a) => fmtCompact(a?.volume) },
  { label: "Market cap", values: (a, f) => (f?.available ? fmtCompact(f.marketCap) : fmtCompact(a?.marketCap)) },
  { label: "P/E (trailing)", values: (_a, f) => (f?.available ? fmtNum(f.peRatioTrailing) : "Not available") },
  { label: "P/E (forward)", values: (_a, f) => (f?.available ? fmtNum(f.peRatioForward) : "Not available") },
  { label: "Price / book", values: (_a, f) => (f?.available ? fmtNum(f.priceToBook) : "Not available") },
  { label: "EPS", values: (_a, f) => (f?.available ? fmtNum(f.eps) : "Not available") },
  { label: "Book value / share", values: (_a, f) => (f?.available ? fmtNum(f.bookValue) : "Not available") },
  { label: "Dividend yield", values: (_a, f) => (f?.available ? fmtPct(f.dividendYield) : "Not available") },
  { label: "Payout ratio", values: (_a, f) => (f?.available ? fmtPct(f.payoutRatio) : "Not available") },
  { label: "Beta", values: (_a, f) => (f?.available ? fmtNum(f.beta) : "Not available") },
  { label: "52-week change", values: (_a, f) => (f?.available ? fmtPct(f.fiftyTwoWeekChangePercent) : "Not available") },
  { label: "Sector", values: (_a, f) => (f?.available ? f.sector ?? "—" : "Not available") },
  { label: "Industry", values: (_a, f) => (f?.available ? f.industry ?? "—" : "Not available") },
];

const MarketsCompare = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [range, setRange] = useState<MarketRange>("6mo");

  const searchQuery = useQuery({
    queryKey: ["markets", "search", submitted, "stock"],
    queryFn: () => searchMarkets(submitted, "stock"),
    enabled: !!submitted,
    retry: false,
  });

  const assetQueries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["markets", "asset", s, "stock", "1d"],
      queryFn: () => fetchMarketAsset(s, "stock", "1d"),
      retry: false,
    })),
  });

  const fundamentalsQueries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["markets", "fundamentals", s],
      queryFn: () => fetchMarketFundamentals(s),
      retry: false,
    })),
  });

  const addSymbol = (symbol: string) => {
    if (symbols.includes(symbol) || symbols.length >= MAX_SYMBOLS) return;
    setSymbols((prev) => [...prev, symbol]);
    setQuery("");
    setSubmitted("");
  };

  const removeSymbol = (symbol: string) => setSymbols((prev) => prev.filter((s) => s !== symbol));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const results = searchQuery.data?.data.results ?? [];

  const assets = useMemo(() => assetQueries.map((q) => q.data?.data), [assetQueries]);
  const fundamentalsList = useMemo(() => fundamentalsQueries.map((q) => q.data?.data), [fundamentalsQueries]);

  const { chartSeries, isLoading: chartLoading } = useComparisonChart({
    symbols: symbols.map((s) => ({ symbol: s, label: s, assetType: "stock" as const })),
    range,
  });

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Scale size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Compare Companies
      </h1>
      <p className="markets-tagline">
        Normalized performance chart plus a full price, valuation, profitability, and business comparison for 2-4
        stocks. Fundamentals may show "Not available" — that's an honest gap in the underlying data source, not a
        failure.
      </p>

      <form onSubmit={submit}>
        <div className="markets-search-row">
          <input
            className="markets-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a symbol or company — up to 4"
            disabled={symbols.length >= MAX_SYMBOLS}
          />
          <button type="submit" className="markets-chip" disabled={symbols.length >= MAX_SYMBOLS}>
            Search
          </button>
        </div>
      </form>

      {submitted && searchQuery.isLoading && <p className="markets-unavailable">Searching…</p>}
      {submitted && !searchQuery.isLoading && results.length > 0 && (
        <div className="markets-search-results">
          {results.slice(0, 8).map((r) => (
            <button key={r.symbol} type="button" className="markets-search-result-row" onClick={() => addSymbol(r.symbol)}>
              <span className="markets-result-left">
                <MarketLogo logoUrl={r.logoUrl} category={categoryFromQuoteType(r.quoteType)} name={r.name} size={28} />
                <span className="markets-result-text">
                  <span className="markets-result-name">{r.name}</span>
                  <span className="markets-result-meta">{r.symbol}</span>
                </span>
              </span>
              <span className="markets-result-meta">{r.exchange ?? r.quoteType}</span>
            </button>
          ))}
        </div>
      )}
      {submitted && !searchQuery.isLoading && results.length === 0 && (
        <p className="markets-unavailable">No matches for "{submitted}".</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {symbols.map((s) => (
          <span key={s} className="markets-chip active inline-flex items-center gap-1">
            {s}
            <button type="button" onClick={() => removeSymbol(s)} aria-label={`Remove ${s}`} style={{ display: "flex" }}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {symbols.length === 0 && <p className="markets-unavailable mt-3">Add at least one symbol to compare.</p>}

      {symbols.length > 0 && (
        <div style={{ marginTop: "1.2rem" }}>
          <h2 className="markets-section-title">Performance comparison</h2>
          <div className="markets-range-row" style={{ marginBottom: "0.6rem" }}>
            {RANGES.map((r) => (
              <button key={r} type="button" className={`markets-range-chip ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
          {chartLoading && <p className="markets-unavailable">Loading chart…</p>}
          {!chartLoading && chartSeries.length === 0 && <p className="markets-unavailable">No historical data available for this range.</p>}
          {chartSeries.length > 0 && (
            <Chart
              type="line"
              height={320}
              series={chartSeries}
              options={{
                colors: CHART_COLORS,
                xaxis: { type: "datetime", title: { text: "Date" } },
                yaxis: { title: { text: "Change from start of range (%)" }, labels: { formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` } },
                tooltip: { x: { format: "dd MMM yyyy" }, y: { formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` } },
                stroke: { curve: "smooth", width: 2.5 },
                legend: { show: true },
              }}
            />
          )}
        </div>
      )}

      {symbols.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: "1.2rem" }}>
          <table className="markets-compare-table">
            <thead>
              <tr>
                <th></th>
                {symbols.map((s, i) => (
                  <th key={s}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MarketLogo
                        logoUrl={assets[i]?.logoUrl}
                        category={categoryFromQuoteType(assets[i]?.instrumentType)}
                        name={assets[i]?.name ?? s}
                        size={22}
                      />
                      <button
                        type="button"
                        onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(s)}&type=stock`)}
                        style={{ color: "inherit", textDecoration: "underline" }}
                      >
                        {s}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="markets-result-meta">{row.label}</td>
                  {symbols.map((s, i) => (
                    <td key={s}>{row.values(assets[i], fundamentalsList[i])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketsCompare;
