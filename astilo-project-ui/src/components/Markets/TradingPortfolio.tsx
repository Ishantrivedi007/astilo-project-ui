import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AppRoute } from "../../app/AppRoute";
import { Chart, SunburstChart, useConfirm } from "../shared";
import type { SunburstNode } from "../../lib/sunburst";
import {
  cancelPendingOrder,
  fetchPendingOrders,
  fetchTradingAccount,
  fetchTradingInsights,
  fetchTradingOrders,
  suggestionForHolding,
  tradingErrorMessage,
  type TradingHolding,
} from "../../lib/tradingApi";
import "./Markets.scss";
import "./Trading.scss";

const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const ALLOCATION_COLORS = ["#4ade80", "#60a5fa", "#facc15", "#a78bfa", "#f87171", "#22d3ee", "#fb923c", "#e879f9"];

const TradingPortfolio = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [allocationView, setAllocationView] = useState<"donut" | "sunburst">("donut");

  const accountQuery = useQuery({ queryKey: ["trading", "account"], queryFn: fetchTradingAccount, refetchInterval: 30_000 });
  const ordersQuery = useQuery({ queryKey: ["trading", "orders"], queryFn: fetchTradingOrders });
  const pendingOrdersQuery = useQuery({ queryKey: ["trading", "pending-orders"], queryFn: fetchPendingOrders, refetchInterval: 30_000 });

  const cancelPendingMutation = useMutation({
    mutationFn: (id: number) => cancelPendingOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading", "pending-orders"] });
      toast.success("Cancelled pending order.");
    },
    onError: (err: unknown) => toast.error(tradingErrorMessage(err, "Couldn't cancel that order.")),
  });

  const cancelPending = async (id: number, symbol: string) => {
    const ok = await confirm({
      title: "Cancel pending order?",
      message: `Cancel the pending order for ${symbol}?`,
      confirmLabel: "Cancel order",
    });
    if (!ok) return;
    cancelPendingMutation.mutate(id);
  };
  const portfolio = accountQuery.data;
  const holdings = portfolio?.holdings ?? [];

  const insightsQueries = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ["trading", "insights", h.symbol, h.assetType],
      queryFn: () => fetchTradingInsights(h.symbol, h.assetType),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const allocationLabels = [...holdings.map((h) => h.symbol), ...(portfolio && portfolio.account.cashBalance > 0 ? ["Cash"] : [])];
  const allocationValues = [...holdings.map((h) => h.marketValue ?? 0), ...(portfolio && portfolio.account.cashBalance > 0 ? [portfolio.account.cashBalance] : [])];

  // Total -> asset type (stock/crypto/cash) -> individual symbol, sized by
  // real live market value — every level computed fresh from the actual
  // holdings each render, not a fixed 2-level shape.
  const allocationTree: SunburstNode = useMemo(() => {
    const byType = new Map<string, SunburstNode[]>();
    for (const h of holdings) {
      const value = h.marketValue ?? 0;
      if (value <= 0) continue;
      const arr = byType.get(h.assetType) ?? [];
      arr.push({ id: `${h.assetType}:${h.symbol}`, name: h.symbol, value });
      byType.set(h.assetType, arr);
    }
    const children: SunburstNode[] = Array.from(byType.entries()).map(([type, syms]) => ({
      id: `type:${type}`,
      name: type === "crypto" ? "Crypto" : "Stocks",
      children: syms,
    }));
    if (portfolio && portfolio.account.cashBalance > 0) {
      children.push({ id: "type:cash", name: "Cash", value: portfolio.account.cashBalance });
    }
    return { id: "root", name: "Portfolio", children };
  }, [holdings, portfolio]);

  const totalUnrealized = holdings.reduce((sum, h) => sum + (h.unrealizedPnl ?? 0), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.quantity, 0);
  const totalUnrealizedPct = totalCost > 0 ? (totalUnrealized / totalCost) * 100 : null;

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.trading)}>
        <ArrowLeft size={12} /> Back to Trade
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Landmark size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Portfolio
      </h1>
      <p className="markets-tagline">
        Your full simulated position — real live prices, real computed trends, fake money. Suggestions below are
        computed data summaries, not investment advice.
      </p>

      <div className="trading-summary-row">
        <div className="trading-summary-card">
          <span className="trading-summary-label">
            <Wallet size={12} /> Simulated cash
          </span>
          <span className="trading-summary-value">{money(portfolio?.account.cashBalance)}</span>
        </div>
        <div className="trading-summary-card">
          <span className="trading-summary-label">Holdings value</span>
          <span className="trading-summary-value">{money(portfolio?.holdingsValue)}</span>
        </div>
        <div className="trading-summary-card">
          <span className="trading-summary-label">Total portfolio value</span>
          <span className="trading-summary-value">{money(portfolio?.totalValue)}</span>
        </div>
        <div className="trading-summary-card">
          <span className="trading-summary-label">Unrealized P&amp;L</span>
          <span className="trading-summary-value" style={{ color: totalUnrealized >= 0 ? "#4ade80" : "#f87171" }}>
            {totalUnrealized >= 0 ? "+" : ""}
            {money(totalUnrealized)}
            {totalUnrealizedPct != null && ` (${totalUnrealizedPct >= 0 ? "+" : ""}${totalUnrealizedPct.toFixed(1)}%)`}
          </span>
        </div>
      </div>

      {holdings.length === 0 ? (
        <p className="markets-unavailable">No holdings yet — place a simulated trade from the Trade page to get started.</p>
      ) : (
        <div className="trading-portfolio-layout">
          <div>
            <h2 className="markets-section-title">Holdings</h2>
            <div className="trading-portfolio-table-wrap">
              <table className="trading-portfolio-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Qty</th>
                    <th>Avg cost</th>
                    <th>Price</th>
                    <th>Market value</th>
                    <th>P&amp;L</th>
                    <th>Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h: TradingHolding, i: number) => {
                    const insights = insightsQueries[i]?.data;
                    const suggestion = suggestionForHolding(h, insights);
                    return (
                      <tr key={h.id}>
                        <td>
                          <button type="button" className="trading-portfolio-symbol" onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(h.symbol)}&type=${h.assetType}`)}>
                            {h.symbol}
                          </button>
                          <div className="markets-result-meta">{h.name}</div>
                        </td>
                        <td>{h.quantity}</td>
                        <td>{money(h.avgCost)}</td>
                        <td>{money(h.currentPrice)}</td>
                        <td>{money(h.marketValue)}</td>
                        <td className={h.unrealizedPnl != null && h.unrealizedPnl >= 0 ? "positive" : "negative"}>
                          {h.unrealizedPnl != null ? (
                            <>
                              {h.unrealizedPnl >= 0 ? "+" : ""}
                              {money(h.unrealizedPnl)} ({h.unrealizedPnlPercent?.toFixed(1)}%)
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className={`trading-suggestion-badge ${suggestion.tone}`}>{suggestion.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="trading-suggestion-details">
              {holdings.map((h: TradingHolding, i: number) => {
                const insights = insightsQueries[i]?.data;
                const suggestion = suggestionForHolding(h, insights);
                return (
                  <div key={h.id} className="trading-suggestion-card">
                    <p className="markets-unavailable">
                      <strong style={{ color: "rgb(var(--ink-rgb) / 0.85)" }}>{h.symbol}</strong> —{" "}
                      <span className={`trading-suggestion-badge ${suggestion.tone}`}>{suggestion.label}</span>
                    </p>
                    <p className="trading-suggestion-meaning">{suggestion.meaning}</p>
                    <p className="markets-unavailable">{suggestion.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <h2 className="markets-section-title" style={{ margin: 0 }}>Allocation</h2>
              <div className="markets-type-toggle">
                <button type="button" className={allocationView === "donut" ? "active" : ""} onClick={() => setAllocationView("donut")}>
                  Donut
                </button>
                <button type="button" className={allocationView === "sunburst" ? "active" : ""} onClick={() => setAllocationView("sunburst")}>
                  Sunburst
                </button>
              </div>
            </div>
            {allocationValues.some((v) => v > 0) ? (
              allocationView === "donut" ? (
                <Chart
                  type="donut"
                  height={280}
                  series={allocationValues}
                  options={{
                    labels: allocationLabels,
                    colors: ALLOCATION_COLORS,
                    legend: { position: "bottom" },
                    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <SunburstChart data={allocationTree} size={380} formatValue={(v) => money(v, 0)} />
                  <p className="markets-unavailable">Click a ring to zoom in, click the center to zoom back out.</p>
                </div>
              )
            ) : (
              <p className="markets-unavailable">Nothing to show yet.</p>
            )}
          </div>
        </div>
      )}

      <h2 className="markets-section-title">Pending orders</h2>
      {(pendingOrdersQuery.data?.length ?? 0) === 0 && <p className="markets-unavailable">No pending simulated orders.</p>}
      <div className="trading-history-list">
        {pendingOrdersQuery.data?.map((o) => (
          <div key={o.id} className="trading-history-row">
            <span className={o.side === "buy" ? "positive" : "negative"}>{o.side.toUpperCase()}</span>
            <span>
              {o.quantity} {o.symbol}
            </span>
            <span className="markets-result-meta">
              {o.orderType} @ {money(o.orderType === "limit" ? o.limitPrice : o.stopPrice)}
            </span>
            <span className="markets-result-meta">{o.status}</span>
            {o.status === "pending" && (
              <button type="button" className="markets-chip" onClick={() => cancelPending(o.id, o.symbol)}>
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="markets-section-title">Order history</h2>
      {(ordersQuery.data?.length ?? 0) === 0 && <p className="markets-unavailable">No simulated trades yet.</p>}
      <div className="trading-history-list">
        {ordersQuery.data?.map((t) => (
          <div key={t.id} className="trading-history-row">
            <span className={t.side === "buy" ? "positive" : "negative"}>{t.side.toUpperCase()}</span>
            <span>
              {t.quantity} {t.symbol}
            </span>
            <span className="markets-result-meta">@ {money(t.price)}</span>
            <span className="markets-result-meta">
              {t.realizedPnl != null && (t.realizedPnl >= 0 ? `+${money(t.realizedPnl)} realized` : `${money(t.realizedPnl)} realized`)}
            </span>
            <span className="markets-result-meta">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradingPortfolio;
