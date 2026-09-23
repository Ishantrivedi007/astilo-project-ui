import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Star, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { fetchWatchlist, removeFromWatchlist, type WatchlistItem } from "../../lib/watchlistApi";
import { tradingErrorMessage } from "../../lib/tradingApi";
import MarketLogo from "./MarketLogo";
import "./Markets.scss";
import "./Trading.scss";

const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const MarketsWatchlist = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const watchlistQuery = useQuery({ queryKey: ["markets", "watchlist"], queryFn: fetchWatchlist });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets", "watchlist"] });
      toast.success("Removed from watchlist.");
    },
    onError: (err: unknown) => toast.error(tradingErrorMessage(err, "Couldn't remove that from your watchlist.")),
  });

  const remove = async (item: WatchlistItem) => {
    const ok = await confirm({
      title: "Remove from watchlist?",
      message: `Remove ${item.symbol} from your watchlist?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    removeMutation.mutate(item.id);
  };

  const items = watchlistQuery.data ?? [];

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Star size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Watchlist
      </h1>
      <p className="markets-tagline">Symbols you're tracking — live prices, updated whenever you load this page.</p>

      {watchlistQuery.isLoading && <p className="markets-unavailable">Loading watchlist…</p>}
      {watchlistQuery.isError && <p className="markets-unavailable">Couldn't load your watchlist right now.</p>}
      {!watchlistQuery.isLoading && items.length === 0 && (
        <p className="markets-unavailable">
          Nothing on your watchlist yet — open any asset page and tap "Add to watchlist" to start tracking it here.
        </p>
      )}

      <div className="trading-history-list">
        {items.map((item) => (
          <div key={item.id} className="trading-history-row">
            <button
              type="button"
              className="markets-result-left"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(item.symbol)}&type=${item.assetType}`)}
            >
              <MarketLogo category={item.assetType === "crypto" ? "crypto" : "stock"} name={item.name ?? item.symbol} size={24} />
              <span className="markets-result-text">
                <span className="markets-result-name">{item.name ?? item.symbol}</span>
                <span className="markets-result-meta">{item.symbol}</span>
              </span>
            </button>
            <span>{money(item.currentPrice)}</span>
            {item.changePercent != null ? (
              <span className={item.changePercent >= 0 ? "positive" : "negative"}>
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            ) : (
              <span className="markets-result-meta">—</span>
            )}
            {item.notes && <span className="markets-result-meta">{item.notes}</span>}
            <span className="markets-result-meta">{item.addedAt ? new Date(item.addedAt).toLocaleDateString() : ""}</span>
            <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => remove(item)}>
              <Trash2 size={12} /> Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketsWatchlist;
