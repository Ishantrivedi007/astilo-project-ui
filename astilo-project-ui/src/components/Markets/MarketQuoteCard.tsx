import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { AppRoute } from "../../app/AppRoute";
import { fetchMarketAsset, type AssetType } from "../../lib/marketsApi";
import MarketLogo, { categoryFromQuoteType, type MarketCategory } from "./MarketLogo";

interface Props {
  symbol: string;
  assetType: AssetType;
  label?: string;
  category?: MarketCategory;
}

const fmtPrice = (price: number | null, currency: string | null) => {
  if (price == null) return "—";
  const decimals = price < 5 ? 4 : 2;
  return `${currency === "USD" || !currency ? "$" : ""}${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const MarketQuoteCard = ({ symbol, assetType, label, category }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["markets", "asset", symbol, assetType, "1d"],
    queryFn: () => fetchMarketAsset(symbol, assetType, "1d"),
    staleTime: 60_000,
    retry: false,
  });

  const d = data?.data;
  const changePct = d?.changePercent;
  const changeClass = changePct == null ? "" : changePct >= 0 ? "positive" : "negative";
  const resolvedCategory = category ?? (assetType === "crypto" ? "crypto" : categoryFromQuoteType(d?.instrumentType));

  return (
    <button
      type="button"
      className="markets-quote-card"
      onClick={() => navigate(`${AppRoute.marketsAsset}?symbol=${encodeURIComponent(symbol)}&type=${assetType}`)}
    >
      <div className="markets-quote-card-head">
        <MarketLogo logoUrl={d?.logoUrl} category={resolvedCategory} name={d?.name ?? label ?? symbol} size={26} />
        <span className="markets-quote-symbol">{label ?? symbol}</span>
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
    </button>
  );
};

export default MarketQuoteCard;
