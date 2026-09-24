import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, ExternalLink, Newspaper, PieChart, Satellite, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import {
  fetchDividends,
  fetchMarketAsset,
  fetchMarketFundamentals,
  fetchMarketNews,
  RANGE_LABEL,
  RANGES,
  type AssetType,
  type MarketPoint,
  type MarketRange,
} from "../../lib/marketsApi";
import { fetchResearchSummary } from "../../lib/cosmosApi";
import {
  fetchTradingAccount,
  placeTradingOrder,
  suggestionForHolding,
  fetchTradingInsights,
  tradingErrorMessage,
  type TradingOrderType,
} from "../../lib/tradingApi";
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from "../../lib/watchlistApi";
import { createPriceAlert, type PriceAlertCondition } from "../../lib/priceAlertsApi";
import { bollingerBands, macd, rsi, vwap } from "../../lib/technicalIndicators";
import MarketLogo, { categoryFromQuoteType } from "./MarketLogo";
import WhatIfCalculator from "./WhatIfCalculator";
import "./Markets.scss";
import "./Trading.scss";

const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Buy/sell this exact symbol right from its own page — same simulated
 * trading account as the Trading tab, so a trade made here shows up there
 * (and in Portfolio) immediately via the shared "trading" query keys. */
const AssetTradePanel = ({ symbol, assetType }: { symbol: string; assetType: AssetType }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [orderType, setOrderType] = useState<TradingOrderType>("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const accountQuery = useQuery({ queryKey: ["trading", "account"], queryFn: fetchTradingAccount });
  const insightsQuery = useQuery({
    queryKey: ["trading", "insights", symbol, assetType],
    queryFn: () => fetchTradingInsights(symbol, assetType),
    retry: false,
  });
  const holding = accountQuery.data?.holdings.find((h) => h.symbol === symbol && h.assetType === assetType);

  const orderMutation = useMutation({
    mutationFn: () =>
      placeTradingOrder({
        symbol,
        assetType,
        side,
        quantity: Number(quantity),
        orderType,
        limitPrice: orderType === "limit" ? Number(limitPrice) : undefined,
        stopPrice: orderType === "stop" ? Number(stopPrice) : undefined,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(["trading", "account"], result);
      queryClient.invalidateQueries({ queryKey: ["trading", "orders"] });
      if ("transaction" in result) {
        toast.success(`${side === "buy" ? "Bought" : "Sold"} ${quantity} ${symbol} @ ${money(result.transaction.price)} (simulated).`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["trading", "pending-orders"] });
        const price = orderType === "limit" ? Number(limitPrice) : Number(stopPrice);
        toast.success(`Placed ${orderType} ${side} order for ${quantity} ${symbol} at ${money(price)} (simulated, pending fill).`);
      }
      setQuantity("1");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { status?: number } };
      let fallback = "Order failed.";
      if (axiosErr?.response?.status === 402) {
        const price = insightsQuery.data?.currentPrice;
        const qty = Number(quantity);
        if (side === "buy" && price != null) {
          fallback = `Insufficient simulated cash — need ${money(price * qty)}, have ${money(accountQuery.data?.account.cashBalance)}.`;
        } else if (side === "sell") {
          fallback = `Insufficient holding — trying to sell ${qty}, you have ${holding?.quantity ?? 0}.`;
        } else {
          fallback = "Insufficient simulated funds for this trade.";
        }
      }
      toast.error(tradingErrorMessage(err, fallback));
    },
  });

  return (
    <div className="trading-order-panel" style={{ marginTop: "1.2rem" }}>
      <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
        <PieChart size={16} /> Simulated trading
      </h2>
      <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
        Practice buying/selling {symbol} at its real live price with simulated money — same account as{" "}
        <button type="button" onClick={() => navigate(AppRoute.trading)} style={{ textDecoration: "underline", display: "inline", color: "inherit" }}>
          Trading
        </button>
        .
      </p>

      {holding && (
        <>
          <p className="markets-unavailable">
            You hold {holding.quantity} @ avg {money(holding.avgCost)} ({money(holding.unrealizedPnl)} unrealized)
          </p>
          {insightsQuery.data && (
            <div className="trading-suggestion-card" style={{ marginTop: "0.4rem", marginBottom: "0.6rem" }}>
              <p className="markets-unavailable">
                <strong style={{ color: "rgb(var(--ink-rgb) / 0.8)" }}>{suggestionForHolding(holding, insightsQuery.data).label}</strong>
              </p>
              <p className="trading-suggestion-meaning">{suggestionForHolding(holding, insightsQuery.data).meaning}</p>
              <p className="markets-unavailable">{suggestionForHolding(holding, insightsQuery.data).description}</p>
            </div>
          )}
        </>
      )}

      <div className="markets-type-toggle" style={{ margin: "0.6rem 0" }}>
        <button type="button" className={side === "buy" ? "active" : ""} onClick={() => setSide("buy")}>
          Buy
        </button>
        <button type="button" className={side === "sell" ? "active" : ""} onClick={() => setSide("sell")} disabled={!holding}>
          Sell
        </button>
      </div>

      <label className="trading-field">
        <span>Quantity</span>
        <input type="number" min={0.0001} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>

      <div className="markets-type-toggle" style={{ margin: "0.6rem 0" }}>
        <button type="button" className={orderType === "market" ? "active" : ""} onClick={() => setOrderType("market")}>
          Market
        </button>
        <button type="button" className={orderType === "limit" ? "active" : ""} onClick={() => setOrderType("limit")}>
          Limit
        </button>
        <button type="button" className={orderType === "stop" ? "active" : ""} onClick={() => setOrderType("stop")}>
          Stop
        </button>
      </div>

      {orderType === "limit" && (
        <label className="trading-field">
          <span>Limit price</span>
          <input type="number" min={0} step="any" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
        </label>
      )}
      {orderType === "stop" && (
        <label className="trading-field">
          <span>Stop price</span>
          <input type="number" min={0} step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} />
        </label>
      )}

      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem", alignItems: "center" }}>
        <button
          type="button"
          className="markets-chip active"
          disabled={
            orderMutation.isPending ||
            !Number(quantity) ||
            (side === "sell" && !holding) ||
            (orderType === "limit" && !Number(limitPrice)) ||
            (orderType === "stop" && !Number(stopPrice))
          }
          onClick={() => orderMutation.mutate()}
        >
          {orderMutation.isPending ? "Placing order…" : `${side === "buy" ? "Buy" : "Sell"} ${symbol} (simulated)`}
        </button>
        <span className="markets-result-meta">Cash: {money(accountQuery.data?.account.cashBalance)}</span>
      </div>
    </div>
  );
};

/** Toggle button for adding/removing this symbol from the user's watchlist —
 * queries the whole watchlist (same query key MarketsWatchlist reads) and
 * checks membership by symbol+assetType, same invalidation pattern as the
 * trade panel's mutations. */
const WatchlistToggle = ({ symbol, assetType, name }: { symbol: string; assetType: AssetType; name: string }) => {
  const queryClient = useQueryClient();
  const watchlistQuery = useQuery({ queryKey: ["markets", "watchlist"], queryFn: fetchWatchlist });
  const entry = watchlistQuery.data?.find((w) => w.symbol === symbol && w.assetType === assetType);

  const addMutation = useMutation({
    mutationFn: () => addToWatchlist({ symbol, assetType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets", "watchlist"] });
      toast.success(`Added ${symbol} to your watchlist.`);
    },
    onError: (err: unknown) => toast.error(tradingErrorMessage(err, "Couldn't add that to your watchlist.")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets", "watchlist"] });
      toast.success(`Removed ${symbol} from your watchlist.`);
    },
    onError: (err: unknown) => toast.error(tradingErrorMessage(err, "Couldn't remove that from your watchlist.")),
  });

  const pending = addMutation.isPending || removeMutation.isPending;

  return (
    <button
      type="button"
      className={`markets-chip inline-flex items-center gap-1 ${entry ? "active" : ""}`}
      disabled={pending || watchlistQuery.isLoading}
      onClick={() => (entry ? removeMutation.mutate(entry.id) : addMutation.mutate())}
      title={entry ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
    >
      <Star size={12} fill={entry ? "currentColor" : "none"} /> {entry ? "On watchlist" : "Add to watchlist"}
    </button>
  );
};

/** Small "set a price alert" form near the trade panel — same
 * markets-type-toggle Above/Below styling as buy/sell, posts to the shared
 * price-alerts list MarketsAlerts reads. */
const PriceAlertForm = ({ symbol, assetType }: { symbol: string; assetType: AssetType }) => {
  const queryClient = useQueryClient();
  const [condition, setCondition] = useState<PriceAlertCondition>("above");
  const [targetPrice, setTargetPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createPriceAlert({ symbol, assetType, condition, targetPrice: Number(targetPrice) }),
    onSuccess: (alert) => {
      queryClient.invalidateQueries({ queryKey: ["markets", "price-alerts"] });
      toast.success(`Alert set: ${symbol} ${alert.condition} ${money(alert.targetPrice)}.`);
      setTargetPrice("");
    },
    onError: (err: unknown) => toast.error(tradingErrorMessage(err, "Couldn't set that alert.")),
  });

  return (
    <div className="trading-order-panel" style={{ marginTop: "1.2rem" }}>
      <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
        <Bell size={16} /> Set a price alert
      </h2>
      <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
        Get notified when {symbol} crosses your target price.
      </p>

      <div className="markets-type-toggle" style={{ margin: "0.6rem 0" }}>
        <button type="button" className={condition === "above" ? "active" : ""} onClick={() => setCondition("above")}>
          Above
        </button>
        <button type="button" className={condition === "below" ? "active" : ""} onClick={() => setCondition("below")}>
          Below
        </button>
      </div>

      <label className="trading-field">
        <span>Target price</span>
        <input type="number" min={0} step="any" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
      </label>

      <button
        type="button"
        className="markets-chip"
        style={{ marginTop: "0.6rem" }}
        disabled={createMutation.isPending || !Number(targetPrice)}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? "Setting alert…" : `Set alert (${symbol} ${condition} ${targetPrice || "…"})`}
      </button>
    </div>
  );
};

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

/** A real, computed statistical projection — ordinary least-squares linear
 * regression of price vs. time index, extrapolated forward — not a model,
 * not investment advice, and explicitly labeled as such wherever it's
 * shown. Gives the "forecast" surface the user asked for without
 * fabricating a number that looks more authoritative than it is. */
const useLinearForecast = (points: MarketPoint[], volatilityPct: number | undefined) =>
  useMemo(() => {
    if (points.length < 5) return null;
    const n = points.length;
    const xs = points.map((_, i) => i);
    const ys = points.map((p) => p.close);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (ys[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;

    const stepMs = n > 1 ? points[n - 1].t - points[n - 2].t : 86_400_000;
    const horizon = Math.min(30, Math.max(5, Math.round(n * 0.2)));
    const band = ((volatilityPct ?? 2) / 100) * yMean;

    const projected = Array.from({ length: horizon }, (_, i) => {
      const idx = n + i;
      const t = points[n - 1].t + stepMs * (i + 1);
      const value = intercept + slope * idx;
      const spread = band * Math.sqrt(i + 1);
      return { t, value, low: value - spread, high: value + spread };
    });

    const lastActual = ys[n - 1];
    const endValue = projected[projected.length - 1].value;
    const trendPct = lastActual !== 0 ? ((endValue - lastActual) / lastActual) * 100 : 0;

    return { projected, trendPct, horizon };
  }, [points, volatilityPct]);

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

const fmtPct = (n: number | null | undefined, decimals = 2) =>
  n == null ? "Data unavailable" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(decimals)}%`;

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

  const fundamentalsQuery = useQuery({
    queryKey: ["markets", "fundamentals", symbol],
    queryFn: () => fetchMarketFundamentals(symbol),
    enabled: !!symbol && assetType === "stock",
    retry: false,
  });
  const fundamentals = fundamentalsQuery.data?.data;

  const dividendsQuery = useQuery({
    queryKey: ["markets", "dividends", symbol],
    queryFn: () => fetchDividends(symbol),
    enabled: !!symbol && assetType === "stock",
    retry: false,
  });
  const dividends = dividendsQuery.data?.data.results ?? [];

  const insights = useTrendInsights(d?.points ?? []);
  const forecast = useLinearForecast(d?.points ?? [], insights?.volatilityPct);

  // Same query key AssetTradePanel uses below — React Query dedupes this
  // into a single request, just read here too for the risk-metrics stats.
  const tradingInsightsQuery = useQuery({
    queryKey: ["trading", "insights", symbol, assetType],
    queryFn: () => fetchTradingInsights(symbol, assetType),
    enabled: !!symbol,
    retry: false,
  });
  const riskMetrics = tradingInsightsQuery.data;

  const [chartMode, setChartMode] = useState<"line" | "candlestick">("line");
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVwap, setShowVwap] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
  const [showMacd, setShowMacd] = useState(false);

  const hasOhlc = useMemo(() => (d?.points ?? []).some((p) => p.open != null && p.high != null && p.low != null), [d]);
  const hasVolume = useMemo(() => (d?.points ?? []).some((p) => p.volume != null), [d]);

  const candlestickSeries = useMemo(() => {
    if (!d || !hasOhlc) return null;
    const data = d.points
      .filter((p) => p.open != null && p.high != null && p.low != null)
      .map((p) => ({ x: p.t, y: [p.open, p.high, p.low, p.close] as number[] }));
    return data.length > 0 ? [{ data }] : null;
  }, [d, hasOhlc]);

  const bands = useMemo(() => (d ? bollingerBands(d.points) : null), [d]);
  const vwapValues = useMemo(() => (d ? vwap(d.points) : null), [d]);
  const rsiValues = useMemo(() => (d ? rsi(d.points) : null), [d]);
  const macdValues = useMemo(() => (d ? macd(d.points) : null), [d]);

  const hasEnoughForBollinger = (d?.points.length ?? 0) >= 20;
  const hasEnoughForRsi = (d?.points.length ?? 0) > 14 && (rsiValues ?? []).some((v) => v != null);
  const hasEnoughForMacd = (d?.points.length ?? 0) > 26 && (macdValues?.macdLine ?? []).some((v) => v != null);

  const rsiChartData = useMemo(() => {
    if (!d || !rsiValues) return null;
    const pts = d.points.map((p, i) => ({ x: p.t, y: rsiValues[i] })).filter((p): p is { x: number; y: number } => p.y != null);
    if (pts.length < 2) return null;
    return {
      series: [{ name: "RSI (14)", data: pts }],
      options: {
        ...interactiveChart,
        colors: ["#a78bfa"],
        xaxis: { type: "datetime" as const },
        yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v?.toFixed(0) } },
        annotations: { yaxis: [{ y: 70, borderColor: "#f87171", label: { text: "70" } }, { y: 30, borderColor: "#4ade80", label: { text: "30" } }] },
        dataLabels: { enabled: false },
        legend: { show: false },
      },
    };
  }, [d, rsiValues]);

  const macdChartData = useMemo(() => {
    if (!d || !macdValues) return null;
    const macdPts = d.points.map((p, i) => ({ x: p.t, y: macdValues.macdLine[i] })).filter((p): p is { x: number; y: number } => p.y != null);
    const signalPts = d.points.map((p, i) => ({ x: p.t, y: macdValues.signalLine[i] })).filter((p): p is { x: number; y: number } => p.y != null);
    if (macdPts.length < 2) return null;
    return {
      series: [
        { name: "MACD", data: macdPts },
        { name: "Signal", data: signalPts },
      ],
      options: {
        ...interactiveChart,
        colors: ["#60a5fa", "#facc15"],
        xaxis: { type: "datetime" as const },
        dataLabels: { enabled: false },
        legend: { show: true },
      },
    };
  }, [d, macdValues]);

  // Built once per actual data change rather than as a fresh object/array
  // literal on every render (the chart JSX previously constructed these
  // inline) — react-apexcharts calls both updateOptions() and updateSeries()
  // whenever either prop's *reference* changes, even if the values are
  // identical; getting a brand-new series/options object on every unrelated
  // re-render (e.g. the news/about queries settling) was triggering that
  // update path constantly, which is a known way for the wrapper to leave
  // series stuck without ever finishing their draw — axis/grid/legend still
  // render (they're static chrome), but the line paths never appear.
  const chartData = useMemo(() => {
    if (!d || d.points.length === 0) return null;
    const chartSeries: { name: string; data: { x: number; y: number }[] }[] = [
      { name: d.symbol, data: d.points.map((p) => ({ x: p.t, y: p.close })) },
    ];
    const seriesColors = [seriesColor];
    const seriesWidths = [2];
    const seriesDash = [0];

    if (insights?.sma7) {
      const pts = d.points.map((p, i) => ({ x: p.t, y: insights.sma7[i] })).filter((p): p is { x: number; y: number } => p.y != null);
      if (pts.length > 1) {
        chartSeries.push({ name: "7-period avg", data: pts });
        seriesColors.push("#facc15");
        seriesWidths.push(1.5);
        seriesDash.push(4);
      }
    }
    if (insights?.sma30) {
      const pts = d.points.map((p, i) => ({ x: p.t, y: insights.sma30![i] })).filter((p): p is { x: number; y: number } => p.y != null);
      if (pts.length > 1) {
        chartSeries.push({ name: "30-period avg", data: pts });
        seriesColors.push("#a78bfa");
        seriesWidths.push(1.5);
        seriesDash.push(4);
      }
    }
    if (forecast) {
      chartSeries.push({
        name: "Projected (linear trend)",
        data: [
          { x: d.points[d.points.length - 1].t, y: d.points[d.points.length - 1].close },
          ...forecast.projected.map((p) => ({ x: p.t, y: p.value })),
        ],
      });
      seriesColors.push("#60a5fa");
      seriesWidths.push(2);
      seriesDash.push(6);
    }
    if (showBollinger && bands && hasEnoughForBollinger) {
      const upperPts = d.points.map((p, i) => ({ x: p.t, y: bands.upper[i] })).filter((p): p is { x: number; y: number } => p.y != null);
      const lowerPts = d.points.map((p, i) => ({ x: p.t, y: bands.lower[i] })).filter((p): p is { x: number; y: number } => p.y != null);
      if (upperPts.length > 1 && lowerPts.length > 1) {
        chartSeries.push({ name: "Bollinger upper", data: upperPts });
        seriesColors.push("#22d3ee");
        seriesWidths.push(1);
        seriesDash.push(2);
        chartSeries.push({ name: "Bollinger lower", data: lowerPts });
        seriesColors.push("#22d3ee");
        seriesWidths.push(1);
        seriesDash.push(2);
      }
    }
    if (showVwap && vwapValues && hasVolume) {
      const pts = d.points.map((p, i) => ({ x: p.t, y: vwapValues[i] })).filter((p): p is { x: number; y: number } => p.y != null);
      if (pts.length > 1) {
        chartSeries.push({ name: "VWAP", data: pts });
        seriesColors.push("#fb923c");
        seriesWidths.push(1.5);
        seriesDash.push(0);
      }
    }

    const chartOptions = {
      ...interactiveChart,
      colors: seriesColors,
      stroke: { curve: "smooth" as const, width: seriesWidths, dashArray: seriesDash },
      xaxis: { type: "datetime" as const },
      yaxis: { labels: { formatter: (v: number) => v?.toFixed(2) } },
      tooltip: { ...interactiveChart.tooltip, x: { format: "dd MMM yyyy HH:mm" } },
      dataLabels: { enabled: false },
      legend: { show: true },
    };

    return { chartSeries, chartOptions };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, insights?.sma7, insights?.sma30, forecast, seriesColor, showBollinger, bands, hasEnoughForBollinger, showVwap, vwapValues, hasVolume]);

  // For stocks/ETFs there's no "about/founded" from Yahoo — reuse the
  // Research module's Wikipedia summary for the company itself. Crypto
  // already carries this from CoinGecko's own coin metadata.
  const wikiAboutQuery = useQuery({
    queryKey: ["markets", "about", d?.name],
    queryFn: () => fetchResearchSummary(d!.name),
    enabled: !!d && assetType === "stock",
    retry: false,
  });
  const wikiAbout = wikiAboutQuery.data?.data;
  const about = assetType === "crypto" ? d?.about ?? null : wikiAbout?.detailedExtract ?? wikiAbout?.extract ?? null;
  const aboutImages = assetType === "stock" ? wikiAbout?.articleImages ?? [] : [];

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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
              <span className="markets-source-badge">
                <Satellite size={11} strokeWidth={2.5} />
                {assetQuery.data?.source}
              </span>
              <WatchlistToggle symbol={d.symbol} assetType={assetType} name={d.name} />
            </div>
          </div>

          <div className="markets-range-row">
            {RANGES.map((r) => (
              <button key={r} type="button" className={`markets-range-chip ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          <div className="markets-range-row" style={{ marginTop: "0.4rem" }}>
            <button type="button" className={`markets-range-chip ${chartMode === "line" ? "active" : ""}`} onClick={() => setChartMode("line")}>
              Line
            </button>
            <button
              type="button"
              className={`markets-range-chip ${chartMode === "candlestick" ? "active" : ""}`}
              onClick={() => setChartMode("candlestick")}
              disabled={!hasOhlc}
            >
              Candlestick
            </button>
          </div>

          {d.spotOnly ? (
            <p className="markets-unavailable">
              This price is coming from a last-resort fallback source (every other provider, including Yahoo, had
              nothing right now) that only offers the current spot price — no historical chart is available until
              Yahoo or another provider recovers.
            </p>
          ) : chartMode === "candlestick" ? (
            candlestickSeries ? (
              <Chart type="candlestick" height={340} series={candlestickSeries} options={{ xaxis: { type: "datetime" as const } }} />
            ) : (
              <p className="markets-unavailable">Candlestick (OHLC) data isn't available for {d.symbol} in this range.</p>
            )
          ) : chartData ? (
            <Chart type="line" height={340} series={chartData.chartSeries} options={chartData.chartOptions} />
          ) : (
            <p className="markets-unavailable">No historical points for this range.</p>
          )}

          {chartMode === "line" && chartData && (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem", fontSize: "0.82rem" }}>
              {hasEnoughForBollinger && (
                <label className="markets-result-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} />
                  Show Bollinger Bands
                </label>
              )}
              {hasVolume && (
                <label className="markets-result-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={showVwap} onChange={(e) => setShowVwap(e.target.checked)} />
                  Show VWAP
                </label>
              )}
              {hasEnoughForRsi && (
                <label className="markets-result-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={showRsi} onChange={(e) => setShowRsi(e.target.checked)} />
                  Show RSI
                </label>
              )}
              {hasEnoughForMacd && (
                <label className="markets-result-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={showMacd} onChange={(e) => setShowMacd(e.target.checked)} />
                  Show MACD
                </label>
              )}
            </div>
          )}

          {showRsi && hasEnoughForRsi && rsiChartData && (
            <div style={{ marginTop: "0.8rem" }}>
              <p className="markets-result-meta" style={{ marginBottom: "0.2rem" }}>RSI (14)</p>
              <Chart type="line" height={120} series={rsiChartData.series} options={rsiChartData.options} />
            </div>
          )}
          {showMacd && hasEnoughForMacd && macdChartData && (
            <div style={{ marginTop: "0.8rem" }}>
              <p className="markets-result-meta" style={{ marginBottom: "0.2rem" }}>MACD (12, 26, 9)</p>
              <Chart type="line" height={120} series={macdChartData.series} options={macdChartData.options} />
            </div>
          )}

          <AssetTradePanel symbol={d.symbol} assetType={assetType} />

          <PriceAlertForm symbol={d.symbol} assetType={assetType} />

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
                {riskMetrics && !riskMetrics.insufficientData && (
                  <>
                    <div className="markets-stat">
                      <dt>Sharpe ratio (annualized)</dt>
                      <dd>{fmtNum(riskMetrics.sharpeRatioAnnualized)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Max drawdown</dt>
                      <dd>{riskMetrics.maxDrawdownPct != null ? `-${Math.abs(riskMetrics.maxDrawdownPct).toFixed(2)}%` : "Data unavailable"}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Beta{riskMetrics.betaBenchmark ? ` (vs ${riskMetrics.betaBenchmark})` : ""}</dt>
                      <dd>{fmtNum(riskMetrics.beta)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          )}

          {assetType === "stock" && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 className="markets-section-title">Fundamentals</h2>
              {fundamentalsQuery.isLoading && <p className="markets-unavailable">Loading fundamentals…</p>}
              {fundamentals && !fundamentals.available && (
                <p className="markets-unavailable">Fundamentals data isn't available for this symbol right now — {fundamentals.reason}</p>
              )}
              {fundamentals && fundamentals.available && (
                <>
                  {fundamentals.source && (
                    <p className="markets-unavailable" style={{ marginBottom: "0.4rem" }}>Source: {fundamentals.source}</p>
                  )}
                  <dl className="markets-stats-grid">
                    <div className="markets-stat">
                      <dt>P/E (trailing)</dt>
                      <dd>{fmtNum(fundamentals.peRatioTrailing)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>P/E (forward)</dt>
                      <dd>{fmtNum(fundamentals.peRatioForward)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Dividend yield</dt>
                      <dd>{fmtPct(fundamentals.dividendYield)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Payout ratio</dt>
                      <dd>{fmtPct(fundamentals.payoutRatio)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Beta</dt>
                      <dd>{fmtNum(fundamentals.beta)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Market cap</dt>
                      <dd>{fmtCompact(fundamentals.marketCap)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>EPS</dt>
                      <dd>{fmtNum(fundamentals.eps)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>Price / book</dt>
                      <dd>{fmtNum(fundamentals.priceToBook)}</dd>
                    </div>
                    <div className="markets-stat">
                      <dt>52-week change</dt>
                      <dd>{fmtPct(fundamentals.fiftyTwoWeekChangePercent)}</dd>
                    </div>
                  </dl>

                  {fundamentals.similarCompanies.length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                      <h3 className="markets-result-meta" style={{ marginBottom: "0.4rem" }}>Similar companies (same industry)</h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {fundamentals.similarCompanies.map((c) => (
                          <button
                            key={c.symbol}
                            type="button"
                            className="markets-chip inline-flex items-center gap-1"
                            onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(c.symbol)}&type=stock`)}
                          >
                            <MarketLogo logoUrl={c.logoUrl} category={categoryFromQuoteType(c.quoteType)} name={c.name} size={16} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {assetType === "stock" && dividends.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 className="markets-section-title">Dividend history</h2>
              <p className="markets-unavailable" style={{ marginBottom: "0.4rem" }}>Source: Alpha Vantage — real historical distributions.</p>
              <div style={{ maxHeight: 280, overflowY: "auto", overflowX: "auto" }}>
                <table className="markets-compare-table">
                  <thead>
                    <tr>
                      <th>Ex-dividend date</th>
                      <th>Amount</th>
                      <th>Declaration</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.slice(0, 40).map((div, i) => (
                      <tr key={i}>
                        <td>{div.ex_dividend_date}</td>
                        <td>${div.amount}</td>
                        <td>{div.declaration_date === "None" ? "—" : div.declaration_date}</td>
                        <td>{div.payment_date === "None" ? "—" : div.payment_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {symbol && <WhatIfCalculator symbol={symbol} assetType={assetType} />}

          {forecast && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={16} /> Statistical projection ({forecast.horizon} periods ahead)
              </h2>
              <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
                A linear-regression extrapolation of this range's own price trend, with an uncertainty band that
                widens with this asset's own recent volatility — not a prediction, model, or investment advice.
                Markets can and do reverse trend without warning.
              </p>
              <dl className="markets-stats-grid">
                <div className="markets-stat">
                  <dt>Projected direction</dt>
                  <dd style={{ color: forecast.trendPct >= 0 ? "#4ade80" : "#f87171" }}>
                    {forecast.trendPct >= 0 ? "+" : ""}
                    {forecast.trendPct.toFixed(2)}% if the current trend held
                  </dd>
                </div>
                <div className="markets-stat">
                  <dt>Projected value ({forecast.horizon}-period end)</dt>
                  <dd>{fmtNum(forecast.projected[forecast.projected.length - 1].value)}</dd>
                </div>
                <div className="markets-stat">
                  <dt>Uncertainty band (end)</dt>
                  <dd>
                    {fmtNum(forecast.projected[forecast.projected.length - 1].low)} –{" "}
                    {fmtNum(forecast.projected[forecast.projected.length - 1].high)}
                  </dd>
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
                <>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    {(d.logoUrl || wikiAbout?.thumbnailUrl) && (
                      <img
                        src={d.logoUrl || wikiAbout?.thumbnailUrl || undefined}
                        alt={`${d.name} logo`}
                        style={{ width: 88, height: 88, objectFit: "contain", borderRadius: 12, background: "rgba(255,255,255,0.06)", padding: "0.5rem", flexShrink: 0 }}
                      />
                    )}
                    <div
                      className="markets-source-badge"
                      style={{ display: "block", padding: "0.75rem 1rem", fontSize: "0.82rem", lineHeight: 1.6, color: "rgb(var(--ink-rgb) / 0.8)", flex: 1, minWidth: 240 }}
                    >
                      {(about ?? "").split("\n").filter(Boolean).map((para, i) => {
                        // Wikipedia's plaintext extraction leaves section
                        // markers ("== History ==") in as literal text
                        // instead of stripping them — render as a real
                        // heading instead of raw wiki markup.
                        const heading = para.match(/^(=+)\s*(.+?)\s*\1$/);
                        if (heading) return <h4 key={i} style={{ margin: "0.9rem 0 0.4rem", fontSize: "0.9rem", color: "rgb(var(--ink-rgb))" }}>{heading[2]}</h4>;
                        return (
                          <p key={i} style={{ marginBottom: "0.6rem" }}>
                            {para}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                  {wikiAbout?.pageUrl && (
                    <p className="markets-unavailable" style={{ marginTop: "0.4rem" }}>
                      Source:{" "}
                      <a href={wikiAbout.pageUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                        Wikipedia — {wikiAbout.title}
                      </a>
                    </p>
                  )}
                  {aboutImages.length > 0 && (
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
                      {aboutImages.slice(0, 6).map((img) => (
                        <a key={img.url} href={img.url} target="_blank" rel="noreferrer" title={img.title}>
                          <img src={img.url} alt={img.title} style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(140,160,255,0.15)" }} loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
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
