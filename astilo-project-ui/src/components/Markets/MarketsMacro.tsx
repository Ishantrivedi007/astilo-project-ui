import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, LineChart } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import {
  fetchMacroDashboard,
  fetchMacroIndicator,
  INDICATOR_LABEL,
  MACRO_COUNTRIES,
  type MacroIndicatorKey,
} from "../../lib/marketsApi";
import "./Markets.scss";

const INDICATOR_KEYS: MacroIndicatorKey[] = ["gdp", "gdpGrowth", "inflation", "unemployment", "interestRate"];

const chartOptionsFor = () => ({
  xaxis: { type: "category" as const },
  stroke: { curve: "smooth" as const, width: 2.5 },
  dataLabels: { enabled: false },
  markers: { size: 3 },
});

const MarketsMacro = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"dashboard" | "compare">("dashboard");
  const [country, setCountry] = useState("US");
  const [indicator, setIndicator] = useState<MacroIndicatorKey>("gdp");
  const [compareCountries, setCompareCountries] = useState<string[]>(["US", "IN"]);

  const dashboardQuery = useQuery({
    queryKey: ["markets", "macro", "dashboard", country],
    queryFn: () => fetchMacroDashboard(country),
    retry: false,
  });

  const toggleCompareCountry = (code: string) => {
    setCompareCountries((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 4) return prev;
      return [...prev, code];
    });
  };

  const compareQueries = useQueries({
    queries: compareCountries.map((code) => ({
      queryKey: ["markets", "macro", "indicator", code, indicator],
      queryFn: () => fetchMacroIndicator(code, indicator),
      retry: false,
    })),
  });

  const compareSeries = useMemo(
    () =>
      compareQueries
        .map((q, i) => {
          const d = q.data?.data;
          if (!d) return null;
          const countryName = MACRO_COUNTRIES.find((c) => c.code === compareCountries[i])?.name ?? compareCountries[i];
          return { name: countryName, data: d.points.map((p) => ({ x: p.year, y: p.value })) };
        })
        .filter((s): s is { name: string; data: { x: number; y: number | null }[] } => s != null),
    [compareQueries, compareCountries]
  );

  const indicators = dashboardQuery.data?.data.indicators;

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <LineChart size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Macro Dashboard
      </h1>
      <p className="markets-tagline">
        Real historical economic indicators from the World Bank — GDP, growth, inflation, unemployment and real
        interest rates. This is historical data with real reporting lag, not a forward-looking release calendar.
      </p>

      <div className="markets-type-toggle mb-3">
        <button type="button" className={mode === "dashboard" ? "active" : ""} onClick={() => setMode("dashboard")}>
          Country dashboard
        </button>
        <button type="button" className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>
          Compare across countries
        </button>
      </div>

      {mode === "dashboard" && (
        <>
          <div className="markets-filter-row">
            {MACRO_COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`markets-filter-chip ${country === c.code ? "active" : ""}`}
                onClick={() => setCountry(c.code)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {dashboardQuery.isLoading && <p className="markets-unavailable">Loading macro data…</p>}
          {dashboardQuery.isError && <p className="markets-unavailable">Couldn't load macro data for {country}.</p>}

          {indicators &&
            INDICATOR_KEYS.map((key) => {
              const ind = indicators[key];
              if (!ind) {
                return (
                  <div key={key} style={{ marginTop: "1.5rem" }}>
                    <h2 className="markets-section-title">{INDICATOR_LABEL[key]}</h2>
                    <p className="markets-unavailable">No data available for this indicator.</p>
                  </div>
                );
              }
              const series = [{ name: INDICATOR_LABEL[key], data: ind.points.map((p) => ({ x: p.year, y: p.value })) }];
              return (
                <div key={key} style={{ marginTop: "1.5rem" }}>
                  <h2 className="markets-section-title">{INDICATOR_LABEL[key]}</h2>
                  <p className="markets-unavailable" style={{ marginBottom: "0.5rem" }}>
                    {ind.latestKnown ? `Latest: ${ind.latestKnown.value.toFixed(2)} (${ind.latestKnown.year})` : "No recent known value."}
                  </p>
                  {series[0].data.length > 0 ? (
                    <Chart type="line" height={220} series={series} options={chartOptionsFor()} />
                  ) : (
                    <p className="markets-unavailable">No historical points available.</p>
                  )}
                </div>
              );
            })}
        </>
      )}

      {mode === "compare" && (
        <>
          <div className="markets-filter-row">
            {INDICATOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`markets-filter-chip ${indicator === key ? "active" : ""}`}
                onClick={() => setIndicator(key)}
              >
                {INDICATOR_LABEL[key]}
              </button>
            ))}
          </div>

          <p className="markets-unavailable" style={{ margin: "0.5rem 0" }}>
            Pick 2-4 countries to compare on {INDICATOR_LABEL[indicator]}.
          </p>
          <div className="markets-filter-row">
            {MACRO_COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`markets-filter-chip ${compareCountries.includes(c.code) ? "active" : ""}`}
                onClick={() => toggleCompareCountry(c.code)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {compareSeries.length > 0 ? (
            <Chart type="line" height={340} series={compareSeries} options={chartOptionsFor()} />
          ) : (
            <p className="markets-unavailable">Select at least one country to compare.</p>
          )}
        </>
      )}
    </div>
  );
};

export default MarketsMacro;
