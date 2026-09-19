import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Satellite } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import { fetchMarketAsset, RANGE_LABEL, RANGES, type AssetType, type MarketRange } from "../../lib/marketsApi";
import "./Markets.scss";

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
                colors: [seriesColor],
                stroke: { curve: "smooth", width: 2 },
                xaxis: { type: "datetime" },
                yaxis: { labels: { formatter: (v: number) => v?.toFixed(2) } },
                tooltip: { x: { format: "dd MMM yyyy HH:mm" } },
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
        </>
      )}
    </div>
  );
};

export default MarketsAssetView;
