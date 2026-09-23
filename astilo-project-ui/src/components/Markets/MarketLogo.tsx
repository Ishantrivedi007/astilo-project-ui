import { useState } from "react";
import { BarChart3, Bitcoin, Building2, Flame, Landmark, Repeat, ScrollText, TrendingUp } from "lucide-react";

export type MarketCategory = "stock" | "etf" | "fund" | "index" | "commodity" | "forex" | "crypto" | "bond";

const CATEGORY_ICON: Record<MarketCategory, typeof TrendingUp> = {
  stock: TrendingUp,
  etf: Landmark,
  fund: Landmark,
  index: BarChart3,
  commodity: Flame,
  forex: Repeat,
  crypto: Bitcoin,
  bond: ScrollText,
};

/** quoteType (Yahoo) -> our category, for icon fallback selection. */
export const categoryFromQuoteType = (quoteType: string | null | undefined): MarketCategory => {
  switch (quoteType) {
    case "ETF":
      return "etf";
    case "INDEX":
      return "index";
    case "FUTURE":
      return "commodity";
    case "CURRENCY":
      return "forex";
    case "CRYPTOCURRENCY":
      return "crypto";
    default:
      return "stock";
  }
};

interface Props {
  logoUrl?: string | null;
  category: MarketCategory;
  name: string;
  size?: number;
}

/** Real logo when we have one (company logo, or the crypto's own icon);
 * falls back to a category icon rather than a broken image or a guess. */
const MarketLogo = ({ logoUrl, category, name, size = 28 }: Props) => {
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICON[category] ?? Building2;

  if (!logoUrl || failed) {
    return (
      <span
        className="markets-logo-fallback"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Icon size={Math.round(size * 0.55)} strokeWidth={2} />
      </span>
    );
  }

  return (
    <img
      className="markets-logo-img"
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

export default MarketLogo;
