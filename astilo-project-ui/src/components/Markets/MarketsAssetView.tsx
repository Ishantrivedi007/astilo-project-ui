import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Newspaper, Satellite } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import { fetchMarketAsset, fetchMarketNews, RANGE_LABEL, RANGES, type AssetType, type MarketRange } from "../../lib/marketsApi";
import MarketLogo, { categoryFromQuoteType } from "./MarketLogo";
import "./Markets.scss";

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
              type="area"
              height={340}
              series={[{ name: d.symbol, data: d.points.map((p) => [p.t, p.close]) as unknown as number[] }]}
              options={{
                ...interactiveChart,
                colors: [seriesColor],
                stroke: { curve: "smooth", width: 2 },
                xaxis: { type: "datetime" },
                yaxis: { labels: { formatter: (v: number) => v?.toFixed(2) } },
                tooltip: { ...interactiveChart.tooltip, x: { format: "dd MMM yyyy HH:mm" } },
                dataLabels: { enabled: false },
              }}
            />
          ) : (
            <p className="markets-unavailable">No historical points for this range.</p>
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
          </dl>

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
