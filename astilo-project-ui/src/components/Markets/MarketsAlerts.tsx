import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, TrendingDown, TrendingUp, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { cancelPriceAlert, fetchPriceAlerts, type PriceAlert, type PriceAlertStatus } from "../../lib/priceAlertsApi";
import { tradingErrorMessage } from "../../lib/tradingApi";
import "./Markets.scss";
import "./Trading.scss";

const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const FILTERS: { value: PriceAlertStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "active", label: "Active" },
  { value: "triggered", label: "Triggered" },
  { value: "cancelled", label: "Cancelled" },
];

const MarketsAlerts = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<PriceAlertStatus | null>(null);

  const alertsQuery = useQuery({ queryKey: ["markets", "price-alerts"], queryFn: fetchPriceAlerts });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelPriceAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets", "price-alerts"] });
      toast.success("Cancelled price alert.");
    },
    onError: (err: unknown) => toast.error(tradingErrorMessage(err, "Couldn't cancel that alert.")),
  });

  const cancel = async (alert: PriceAlert) => {
    const ok = await confirm({
      title: "Cancel price alert?",
      message: `Cancel the alert for ${alert.symbol} ${alert.condition} ${money(alert.targetPrice)}?`,
      confirmLabel: "Cancel alert",
    });
    if (!ok) return;
    cancelMutation.mutate(alert.id);
  };

  const allAlerts = alertsQuery.data ?? [];
  const alerts = useMemo(() => (filter ? allAlerts.filter((a) => a.status === filter) : allAlerts), [allAlerts, filter]);
  const activeCount = allAlerts.filter((a) => a.status === "active").length;

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Bell size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Price alerts
      </h1>
      <p className="markets-tagline">
        Get notified when a symbol crosses a target price. {activeCount > 0 ? `${activeCount} active right now.` : ""}
      </p>

      <div className="markets-filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`markets-filter-chip ${filter === f.value ? "active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {alertsQuery.isLoading && <p className="markets-unavailable">Loading alerts…</p>}
      {alertsQuery.isError && <p className="markets-unavailable">Couldn't load your price alerts right now.</p>}
      {!alertsQuery.isLoading && alerts.length === 0 && (
        <p className="markets-unavailable">
          {allAlerts.length === 0
            ? "No price alerts yet — open any asset page to set one."
            : `No ${FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} alerts.`}
        </p>
      )}

      <div className="trading-history-list">
        {alerts.map((a) => (
          <div key={a.id} className="trading-history-row">
            <button
              type="button"
              className="markets-result-text"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
              onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(a.symbol)}&type=${a.assetType}`)}
            >
              <span className="markets-result-name">{a.name ?? a.symbol}</span>
              <span className="markets-result-meta">{a.symbol}</span>
            </button>
            <span className={a.condition === "above" ? "positive" : "negative"}>
              {a.condition === "above" ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {a.condition} {money(a.targetPrice)}
            </span>
            <span className="markets-result-meta">{a.status}</span>
            {a.status === "triggered" && (
              <span className="markets-result-meta">
                {money(a.triggeredPrice)} on {a.triggeredAt ? new Date(a.triggeredAt).toLocaleString() : ""}
              </span>
            )}
            {a.status === "cancelled" && a.cancelledAt && (
              <span className="markets-result-meta">Cancelled {new Date(a.cancelledAt).toLocaleString()}</span>
            )}
            {a.status === "active" && (
              <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => cancel(a)}>
                <X size={12} /> Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketsAlerts;
