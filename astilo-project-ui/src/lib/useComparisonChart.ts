import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { fetchMarketAsset, type AssetType, type MarketRange } from "./marketsApi";

export interface ComparisonSymbol {
  symbol: string;
  label: string;
  assetType?: AssetType;
}

interface UseComparisonChartArgs {
  symbols: ComparisonSymbol[];
  range: MarketRange;
}

/** Fetches each symbol's history for `range` and builds normalized
 * %-change-from-range-start series so wildly different price scales
 * (e.g. Gold ~$2000 vs Natural Gas ~$3) can share one axis. */
export function useComparisonChart({ symbols, range }: UseComparisonChartArgs) {
  const queries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["markets", "asset", s.symbol, s.assetType ?? "stock", range],
      queryFn: () => fetchMarketAsset(s.symbol, s.assetType ?? "stock", range),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const chartSeries = useMemo(() => {
    const series: { name: string; data: { x: number; y: number }[] }[] = [];
    symbols.forEach((s, i) => {
      const points = queries[i]?.data?.data.points ?? [];
      if (points.length === 0) return;
      const first = points[0].close;
      if (first == null || first === 0) return;
      const data = points
        .filter((p) => p.close != null)
        .map((p) => ({ x: p.t, y: ((p.close - first) / first) * 100 }));
      if (data.length > 1) series.push({ name: s.label, data });
    });
    return series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols, queries.map((q) => q.dataUpdatedAt).join(",")]);

  return { chartSeries, isLoading };
}
