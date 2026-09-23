import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { AppRoute } from "../../app/AppRoute";
import { fetchMarketAsset, type AssetType } from "../../lib/marketsApi";
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from "../../lib/watchlistApi";
import { tradingErrorMessage } from "../../lib/tradingApi";
import MarketLogo, { categoryFromQuoteType, type MarketCategory } from "./MarketLogo";

interface Props {
  symbol: string;
  assetType: AssetType;
  label?: string;
  category?: MarketCategory;
  /** Shows a quick-add watchlist star in the card's corner. Opt-in (not
   * every grid this card renders in needs it, and it adds a mutation +
   * shared watchlist query to each card instance). */
  showWatchlistToggle?: boolean;
}

const fmtPrice = (price: number | null, currency: string | null) => {
  if (price == null) return "—";
  const decimals = price < 5 ? 4 : 2;
  return `${currency === "USD" || !currency ? "$" : ""}${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const MarketQuoteCard = ({ symbol, assetType, label, category, showWatchlistToggle }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["markets", "asset", symbol, assetType, "1d"],
    queryFn: () => fetchMarketAsset(symbol, assetType, "1d"),
    staleTime: 60_000,
    retry: false,
  });

  // Shares the ["markets","watchlist"] cache with every other card/page
  // that reads it (WatchlistToggle on the asset page, MarketsWatchlist),
  // so this doesn't add an extra network round-trip beyond the first.
  const watchlistQuery = useQuery({
    queryKey: ["markets", "watchlist"],
    queryFn: fetchWatchlist,
    enabled: !!showWatchlistToggle,
  });
  const watchlistEntry = watchlistQuery.data?.find((w) => w.symbol === symbol && w.assetType === assetType);

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

  const d = data?.data;
  const changePct = d?.changePercent;
  const changeClass = changePct == null ? "" : changePct >= 0 ? "positive" : "negative";
  const resolvedCategory = category ?? (assetType === "crypto" ? "crypto" : categoryFromQuoteType(d?.instrumentType));

  const goToAsset = () => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(symbol)}&type=${assetType}`);

  return (
    // A real <button> can't contain another interactive <button> (the
    // watchlist star below), so this is a div acting as one — same click
    // behavior, same keyboard activation (Enter/Space), real tab stop.
    <div
      role="button"
      tabIndex={0}
      className="markets-quote-card"
      onClick={goToAsset}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToAsset();
        }
      }}
    >
      <div className="markets-quote-card-head">
        <MarketLogo logoUrl={d?.logoUrl} category={resolvedCategory} name={d?.name ?? label ?? symbol} size={26} />
        <span className="markets-quote-symbol">{label ?? symbol}</span>
        {showWatchlistToggle && (
          <button
            type="button"
            className="markets-quote-card-star"
            disabled={addMutation.isPending || removeMutation.isPending}
            title={watchlistEntry ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
            onClick={(e) => {
              e.stopPropagation();
              if (watchlistEntry) removeMutation.mutate(watchlistEntry.id);
              else addMutation.mutate();
            }}
          >
            <Star size={14} fill={watchlistEntry ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      {isLoading && <span className="markets-unavailable">Loading…</span>}
      {isError && <span className="markets-unavailable">Unavailable</span>}
      {d && (
        <>
          <span className="markets-quote-name">{d.name}</span>
          <span className="markets-quote-price">{fmtPrice(d.price, d.currency)}</span>
          {changePct != null && (
            <span className={`markets-quote-change ${changeClass}`}>
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default MarketQuoteCard;
