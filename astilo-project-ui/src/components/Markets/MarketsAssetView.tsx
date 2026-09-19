import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Newspaper, Satellite, TrendingUp } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import { fetchMarketAsset, fetchMarketNews, RANGE_LABEL, RANGES, type AssetType, type MarketPoint, type MarketRange } from "../../lib/marketsApi";
import { fetchResearchSummary } from "../../lib/cosmosApi";
import MarketLogo, { categoryFromQuoteType } from "./MarketLogo";
import "./Markets.scss";

const sma = (points: MarketPoint[], window: number): (number | null)[] =>
  points.map((_, i) => {
    if (i < window - 1) return null;
    const slice = points.slice(i - window + 1, i + 1);
    return slice.reduce((sum, p) => sum + p.close, 0) / window;
  });

/** Real, computed-from-history indicators — never a predicted future price.
 * "Forecast" without a model would just be a guess dressed up as data, so
 * this shows what the numbers actually say instead: trend direction,
 * volatility, and where price sits in its own recent range. */
const useTrendInsights = (points: MarketPoint[]) =>
  useMemo(() => {
    if (points.length < 2) return null;
    const closes = points.map((p) => p.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const periodChangePct = ((last - first) / first) * 100;

    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
    const volatilityPct = Math.sqrt(variance) * 100;

    const periodHigh = Math.max(...closes);
    const periodLow = Math.min(...closes);
    const rangePosition = periodHigh === periodLow ? 50 : ((last - periodLow) / (periodHigh - periodLow)) * 100;

    const highIdx = closes.indexOf(periodHigh);
    const lowIdx = closes.indexOf(periodLow);

    const sma7 = sma(points, Math.min(7, points.length));
    const sma30 = points.length >= 30 ? sma(points, 30) : null;
    const trendDirection = sma7[sma7.length - 1] != null && sma7[0] != null ? (sma7[sma7.length - 1]! >= sma7[Math.max(0, sma7.length - 8)]! ? "up" : "down") : null;

    return {
      periodChangePct,
      volatilityPct,
      periodHigh,
      periodHighAt: points[highIdx]?.t,
      periodLow,
      periodLowAt: points[lowIdx]?.t,
      rangePosition,
      sma7,
      sma30,
      trendDirection,
    };
  }, [points]);

// Toolbar zoom/pan + crosshair tooltip, same "dynamic chart" treatment used
// elsewhere in the app (Nimrose analytics), rather than a static line.
const interactiveChart = {
  chart: {
    toolbar: { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
    zoom: { enabled: true, autoScaleYaxis: true },
  },
  markers: { size: 0, hover: { size: 4 } },
  tooltip: { shared: true, intersect: false, followCursor: true },
};

const fmtNum = (n: number | null | undefined, decimals = 2) =>
  n == null ? "Data unavailable" : n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCompact = (n: number | null | undefined) =>
  n == null ? "Data unavailable" : Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(n);

const MarketsAssetView = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const symbol = params.get("symbol") ?? "";
  const assetType = (params.get("type") as AssetType) ?? "stock";
  const [range, setRange] = useState<MarketRange>("1mo");

  const assetQuery = useQuery({
    queryKey: ["markets", "asset", symbol, assetType, range],
    queryFn: () => fetchMarketAsset(symbol, assetType, range),
    enabled: !!symbol,
    retry: false,
  });

  const d = assetQuery.data?.data;
  const changePositive = (d?.changePercent ?? 0) >= 0;
  const seriesColor = changePositive ? "#4ade80" : "#f87171";

  // Yahoo's crypto tickers follow the "{TICKER}-USD" convention (e.g.
  // BTC-USD) regardless of asset_type used to fetch the quote itself, since
  // CoinGecko (used for crypto quotes) has no free news endpoint.
  const newsSymbol = d ? (assetType === "crypto" ? `${d.symbol}-USD` : d.symbol) : null;
  const newsQuery = useQuery({
    queryKey: ["markets", "news", newsSymbol],
    queryFn: () => fetchMarketNews(newsSymbol!, 8),
    enabled: !!newsSymbol,
    retry: false,
  });
  const articles = newsQuery.data?.data.results ?? [];
  const insights = useTrendInsights(d?.points ?? []);

  // For stocks/ETFs there's no "about/founded" from Yahoo — reuse the
  // Research module's Wikipedia summary for the company itself. Crypto
  // already carries this from CoinGecko's own coin metadata.
  const wikiAboutQuery = useQuery({
    queryKey: ["markets", "about", d?.name],
    queryFn: () => fetchResearchSummary(d!.name),
    enabled: !!d && assetType === "stock",
    retry: false,
  });
  const about = assetType === "crypto" ? d?.about ?? null : wikiAboutQuery.data?.data.extract ?? null;

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      {!symbol && <p className="markets-unavailable">No symbol given.</p>}
      {assetQuery.isLoading && <p className="markets-unavailable">Loading {symbol}…</p>}
      {assetQuery.isError && <p className="markets-unavailable">Couldn't load data for "{symbol}".</p>}

      {d && (
        <>
          <div className="markets-asset-header">
            <div className="markets-result-left" style={{ alignItems: "flex-start" }}>
              <MarketLogo
                logoUrl={d.logoUrl}
                category={assetType === "crypto" ? "crypto" : categoryFromQuoteType(d.instrumentType)}
                name={d.name}
                size={44}
              />
              <div>
                <p className="markets-eyebrow">
                  {d.exchange ?? assetType} · {d.symbol}
                </p>
                <h1 className="markets-title" style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
                  {d.name}
                </h1>
                <div className="markets-asset-price-row">
                  <span className="markets-asset-price">
                    {d.currency === "USD" ? "$" : ""}
                    {fmtNum(d.price, d.price != null && d.price < 5 ? 4 : 2)}
                    {d.currency && d.currency !== "USD" ? ` ${d.currency}` : ""}
                  </span>
                  {d.change != null && d.changePercent != null && (
                    <span className={`markets-asset-change ${changePositive ? "positive" : "negative"}`}>
                      {changePositive ? "+" : ""}
                      {fmtNum(d.change)} ({changePositive ? "+" : ""}
                      {fmtNum(d.changePercent)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="markets-source-badge">
              <Satellite size={11} strokeWidth={2.5} />
              {assetQuery.data?.source}
            </span>
          </div>

          <div className="markets-range-row">
            {RANGES.map((r) => (
              <button key={r} type="button" className={`markets-range-chip ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          {d.points.length > 0 ? (
            <Chart
              type="line"
              height={340}
              series={[
                { name: d.symbol, data: d.points.map((p) => [p.t, p.close]) as unknown as number[] },
                ...(insights?.sma7
                  ? [{ name: "7-period avg", data: d.points.map((p, i) => [p.t, insights.sma7[i]]) as unknown as number[] }]
                  : []),
                ...(insights?.sma30
                  ? [{ name: "30-period avg", data: d.points.map((p, i) => [p.t, insights.sma30![i]]) as unknown as number[] }]
                  : []),
              ]}
              options={{
                ...interactiveChart,
                colors: [seriesColor, "#facc15", "#a78bfa"],
                stroke: { curve: "smooth", width: [2, 1.5, 1.5], dashArray: [0, 4, 4] },
                xaxis: { type: "datetime" },
                yaxis: { labels: { formatter: (v: number) => v?.toFixed(2) } },
                tooltip: { ...interactiveChart.tooltip, x: { format: "dd MMM yyyy HH:mm" } },
                dataLabels: { enabled: false },
                legend: { show: true },
              }}
            />
          ) : (
            <p className="markets-unavailable">No historical points for this range.</p>
          )}

          {insights && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={16} /> Trends &amp; insights for this range
              </h2>
              <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
                Computed directly from the historical prices above — not a prediction of what happens next.
              </p>
              <dl className="markets-stats-grid">
                <div className="markets-stat">
                  <dt>Change over range</dt>
                  <dd style={{ color: insights.periodChangePct >= 0 ? "#4ade80" : "#f87171" }}>
                    {insights.periodChangePct >= 0 ? "+" : ""}
                    {insights.periodChangePct.toFixed(2)}%
                  </dd>
                </div>
                <div className="markets-stat">
                  <dt>Trend (7-period avg)</dt>
                  <dd>{insights.trendDirection === "up" ? "Rising" : insights.trendDirection === "down" ? "Falling" : "Data unavailable"}</dd>
                </div>
                <div className="markets-stat">
                  <dt>Volatility (per period)</dt>
                  <dd>{insights.volatilityPct.toFixed(2)}%</dd>
                </div>
                <div className="markets-stat">
                  <dt>Position in range</dt>
                  <dd>{insights.rangePosition.toFixed(0)}% toward period high</dd>
                </div>
                <div className="markets-stat">
                  <dt>Period high</dt>
                  <dd>{fmtNum(insights.periodHigh)}</dd>
                </div>
                <div className="markets-stat">
                  <dt>Period low</dt>
                  <dd>{fmtNum(insights.periodLow)}</dd>
                </div>
              </dl>
            </div>
          )}

          <dl className="markets-stats-grid">
            <div className="markets-stat">
              <dt>Previous close</dt>
              <dd>{fmtNum(d.previousClose)}</dd>
            </div>
            <div className="markets-stat">
              <dt>Day high</dt>
              <dd>{fmtNum(d.dayHigh)}</dd>
            </div>
            <div className="markets-stat">
              <dt>Day low</dt>
              <dd>{fmtNum(d.dayLow)}</dd>
            </div>
            <div className="markets-stat">
              <dt>52-week high</dt>
              <dd>{fmtNum(d.fiftyTwoWeekHigh)}</dd>
            </div>
            <div className="markets-stat">
              <dt>52-week low</dt>
              <dd>{fmtNum(d.fiftyTwoWeekLow)}</dd>
            </div>
            <div className="markets-stat">
              <dt>Volume</dt>
              <dd>{fmtCompact(d.volume)}</dd>
            </div>
            {d.marketCap != null && (
              <div className="markets-stat">
                <dt>Market cap</dt>
                <dd>{fmtCompact(d.marketCap)}</dd>
              </div>
            )}
            <div className="markets-stat">
              <dt>Instrument</dt>
              <dd>{d.instrumentType ?? "Data unavailable"}</dd>
            </div>
            {d.founded && (
              <div className="markets-stat">
                <dt>Launched / formed</dt>
                <dd>{d.founded}</dd>
              </div>
            )}
            {d.athPrice != null && (
              <div className="markets-stat">
                <dt>All-time high</dt>
                <dd>
                  {fmtNum(d.athPrice)}
                  {d.athDate ? ` (${new Date(d.athDate).toLocaleDateString()})` : ""}
                </dd>
              </div>
            )}
          </dl>

          {(about || wikiAboutQuery.isLoading) && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 className="markets-section-title">About {d.name}</h2>
              {wikiAboutQuery.isLoading && assetType === "stock" ? (
                <p className="markets-unavailable">Loading…</p>
              ) : (
                <p className="markets-source-badge" style={{ display: "block", padding: "0.75rem 1rem", fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(232,236,255,0.75)" }}>
                  {about}
                </p>
              )}
            </div>
          )}

          <h2 className="markets-section-title">
            <Newspaper size={16} style={{ display: "inline", verticalAlign: "-3px", marginRight: 6 }} />
            Recent articles
          </h2>
          {newsQuery.isLoading && <p className="markets-unavailable">Loading news…</p>}
          {!newsQuery.isLoading && articles.length === 0 && <p className="markets-unavailable">No recent articles found for {d.symbol}.</p>}
          <div className="markets-news-list">
            {articles.map((a) => (
              <a key={a.link} href={a.link} target="_blank" rel="noreferrer" className="markets-news-item">
                <p className="markets-news-title">
                  {a.title} <ExternalLink size={11} style={{ display: "inline", verticalAlign: "-1px" }} />
                </p>
                {a.description && <p className="markets-news-desc">{a.description}</p>}
                <p className="markets-news-meta">{a.publishedAt}</p>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MarketsAssetView;
