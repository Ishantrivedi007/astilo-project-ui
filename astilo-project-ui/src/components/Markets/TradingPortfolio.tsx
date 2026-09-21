import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Landmark, Wallet } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Chart } from "../shared";
import {
  fetchTradingAccount,
  fetchTradingInsights,
  fetchTradingOrders,
  suggestionForHolding,
  type TradingHolding,
} from "../../lib/tradingApi";
import "./Markets.scss";
import "./Trading.scss";

const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const ALLOCATION_COLORS = ["#4ade80", "#60a5fa", "#facc15", "#a78bfa", "#f87171", "#22d3ee", "#fb923c", "#e879f9"];

const TradingPortfolio = () => {
  const navigate = useNavigate();

  const accountQuery = useQuery({ queryKey: ["trading", "account"], queryFn: fetchTradingAccount, refetchInterval: 30_000 });
  const ordersQuery = useQuery({ queryKey: ["trading", "orders"], queryFn: fetchTradingOrders });
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
                          <span className={`trading-suggestion-badge ${suggestion.tone}`} title={suggestion.description}>
                            {suggestion.label}
                          </span>
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
                  <p key={h.id} className="markets-unavailable">
                    <strong style={{ color: "rgb(var(--ink-rgb) / 0.85)" }}>{h.symbol}:</strong> {suggestion.description}
                  </p>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="markets-section-title">Allocation</h2>
            {allocationValues.some((v) => v > 0) ? (
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
              <p className="markets-unavailable">Nothing to show yet.</p>
            )}
          </div>
        </div>
      )}

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
