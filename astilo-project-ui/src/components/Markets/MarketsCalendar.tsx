import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Rocket } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchEarningsCalendar, fetchEconomicCalendar, fetchIpoCalendar, type EarningsHorizon } from "../../lib/marketsApi";
import "./Markets.scss";

const HORIZONS: { value: EarningsHorizon; label: string }[] = [
  { value: "3month", label: "Next 3 months" },
  { value: "6month", label: "Next 6 months" },
  { value: "12month", label: "Next 12 months" },
];

const MarketsCalendar = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"earnings" | "ipo" | "economic">("earnings");
  const [horizon, setHorizon] = useState<EarningsHorizon>("3month");
  const [filter, setFilter] = useState("");
  const [majorOnly, setMajorOnly] = useState(true);

  const earningsQuery = useQuery({
    queryKey: ["markets", "earnings-calendar", horizon],
    queryFn: () => fetchEarningsCalendar(horizon),
    enabled: mode === "earnings",
    retry: false,
    staleTime: 3600_000,
  });
  const ipoQuery = useQuery({
    queryKey: ["markets", "ipo-calendar"],
    queryFn: fetchIpoCalendar,
    enabled: mode === "ipo",
    retry: false,
    staleTime: 3600_000,
  });
  const economicQuery = useQuery({
    queryKey: ["markets", "economic-calendar", majorOnly],
    queryFn: () => fetchEconomicCalendar(90, majorOnly),
    enabled: mode === "economic",
    retry: false,
    staleTime: 3600_000,
  });

  const earningsRows = earningsQuery.data?.data.results ?? [];
  const filteredEarnings = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return earningsRows.slice(0, 300);
    return earningsRows.filter((r) => r.symbol.toUpperCase().includes(q) || r.name.toUpperCase().includes(q)).slice(0, 300);
  }, [earningsRows, filter]);

  const ipoRows = ipoQuery.data?.data.results ?? [];
  const filteredIpos = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return ipoRows;
    return ipoRows.filter((r) => r.symbol.toUpperCase().includes(q) || r.name.toUpperCase().includes(q));
  }, [ipoRows, filter]);

  const economicRows = economicQuery.data?.data.results ?? [];

  const isUnavailable = mode === "earnings" ? earningsQuery.isError : mode === "ipo" ? ipoQuery.isError : economicQuery.isError;
  const isLoading = mode === "earnings" ? earningsQuery.isLoading : mode === "ipo" ? ipoQuery.isLoading : economicQuery.isLoading;

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <CalendarClock size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Calendar
      </h1>
      <p className="markets-tagline">
        Real upcoming company earnings dates, IPOs, and US economic release dates (CPI/GDP/jobs/FOMC) — three
        genuinely different data sources, each labeled with where it actually comes from.
      </p>

      <div className="markets-type-toggle mb-3">
        <button type="button" className={mode === "earnings" ? "active" : ""} onClick={() => setMode("earnings")}>
          Earnings
        </button>
        <button type="button" className={mode === "ipo" ? "active" : ""} onClick={() => setMode("ipo")}>
          IPOs
        </button>
        <button type="button" className={mode === "economic" ? "active" : ""} onClick={() => setMode("economic")}>
          Economic (US)
        </button>
      </div>

      {mode === "earnings" && (
        <div className="markets-filter-row mb-3">
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              type="button"
              className={`markets-filter-chip ${horizon === h.value ? "active" : ""}`}
              onClick={() => setHorizon(h.value)}
            >
              {h.label}
            </button>
          ))}
        </div>
      )}

      {mode === "economic" && (
        <div className="markets-filter-row mb-3">
          <button type="button" className={`markets-filter-chip ${majorOnly ? "active" : ""}`} onClick={() => setMajorOnly(true)}>
            Major releases only
          </button>
          <button type="button" className={`markets-filter-chip ${!majorOnly ? "active" : ""}`} onClick={() => setMajorOnly(false)}>
            All releases (noisy)
          </button>
        </div>
      )}

      {mode !== "economic" && (
        <input
          className="markets-search-input mb-3"
          placeholder="Filter by symbol or company name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      {isLoading && <p className="markets-unavailable">Loading…</p>}
      {isUnavailable && mode !== "economic" && (
        <p className="markets-unavailable">
          This calendar isn't available right now — it needs a free Alpha Vantage API key configured on the backend
          (see app/markets/alphavantage.py), or the upstream service is temporarily unreachable.
        </p>
      )}
      {isUnavailable && mode === "economic" && (
        <p className="markets-unavailable">
          This calendar isn't available right now — it needs a free FRED API key configured on the backend (see
          app/markets/fred.py), or the upstream service is temporarily unreachable.
        </p>
      )}

      {mode === "earnings" && !earningsQuery.isLoading && !isUnavailable && (
        <>
          <p className="markets-unavailable mb-2">
            {filteredEarnings.length.toLocaleString()} of {earningsRows.length.toLocaleString()} real upcoming reports
            shown — Source: Alpha Vantage
          </p>
          <div style={{ maxHeight: 500, overflowY: "auto", overflowX: "auto" }}>
            <table className="markets-compare-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company</th>
                  <th>Report date</th>
                  <th>Fiscal period end</th>
                  <th>Estimate</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredEarnings.map((r, i) => (
                  <tr key={`${r.symbol}-${r.reportDate}-${i}`}>
                    <td>
                      <button
                        type="button"
                        className="markets-result-name"
                        style={{ textDecoration: "underline" }}
                        onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(r.symbol)}&type=stock`)}
                      >
                        {r.symbol}
                      </button>
                    </td>
                    <td>{r.name}</td>
                    <td>{r.reportDate}</td>
                    <td>{r.fiscalDateEnding}</td>
                    <td>{r.estimate ? `${r.estimate} ${r.currency}` : "—"}</td>
                    <td>{r.timeOfTheDay || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mode === "ipo" && !ipoQuery.isLoading && !isUnavailable && (
        <>
          <p className="markets-unavailable mb-2">
            <Rocket size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> {filteredIpos.length} real
            upcoming IPOs — Source: Alpha Vantage
          </p>
          {filteredIpos.length === 0 && <p className="markets-unavailable">No upcoming IPOs match this filter.</p>}
          <div style={{ maxHeight: 500, overflowY: "auto", overflowX: "auto" }}>
            <table className="markets-compare-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company</th>
                  <th>Expected date</th>
                  <th>Price range</th>
                  <th>Exchange</th>
                </tr>
              </thead>
              <tbody>
                {filteredIpos.map((r, i) => (
                  <tr key={`${r.symbol}-${i}`}>
                    <td>{r.symbol}</td>
                    <td>{r.name}</td>
                    <td>{r.ipoDate}</td>
                    <td>
                      {r.priceRangeLow && r.priceRangeHigh && r.priceRangeLow !== "0" ? `$${r.priceRangeLow} – $${r.priceRangeHigh}` : "—"}
                    </td>
                    <td>{r.exchange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mode === "economic" && !economicQuery.isLoading && !isUnavailable && (
        <>
          <p className="markets-unavailable mb-2">
            {economicRows.length} real scheduled US release{economicRows.length === 1 ? "" : "s"} in the next 90 days
            — Source: FRED (Federal Reserve Bank of St. Louis)
          </p>
          {economicQuery.data?.data.disclaimer && (
            <p className="markets-unavailable mb-2">{economicQuery.data.data.disclaimer}</p>
          )}
          {economicRows.length === 0 && <p className="markets-unavailable">No releases found in this window.</p>}
          <div style={{ maxHeight: 500, overflowY: "auto", overflowX: "auto" }}>
            <table className="markets-compare-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Release</th>
                </tr>
              </thead>
              <tbody>
                {economicRows.map((r, i) => (
                  <tr key={`${r.releaseId}-${r.date}-${i}`}>
                    <td>{r.date}</td>
                    <td>{r.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MarketsCalendar;
