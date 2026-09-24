import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import { useTheme } from "../../theme/ThemeProvider";
import { nodeValue, toEchartsSunburst, type SunburstNode } from "../../lib/sunburst";

interface Props {
  data: SunburstNode;
  /** Rendered box is a square of this size (px). */
  size?: number;
  /** Formats a value for the tooltip, e.g. currency or a unit label. */
  formatValue?: (value: number) => string;
}

/** A fully data-driven radial sunburst — any depth, any branching factor,
 * computed fresh from whatever `data` tree is passed in each render. Uses
 * Apache ECharts' native sunburst series for real click-to-zoom (click a
 * ring to zoom in, click the inner rings to zoom back out — built into
 * ECharts itself, no hand-rolled state machine needed) plus smooth
 * built-in animation and tooltips. */
const SunburstChart = ({ data, size = 420, formatValue }: Props) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  const echartsData = useMemo(() => toEchartsSunburst(data).children ?? [], [data]);
  // ECharts' sunburst tooltip params don't reliably include `percent`
  // (that's a pie-chart convention, confirmed live: it showed up as
  // "undefined%" on real data) — computed by hand instead, against the
  // real total across the whole tree, not assumed from the library.
  const total = useMemo(() => nodeValue(data), [data]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params: { name: string; value: number }) => {
          const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : null;
          const valueLabel = formatValue ? formatValue(params.value) : params.value.toLocaleString();
          return `<strong>${params.name}</strong><br/>${valueLabel}${pct != null ? ` (${pct}%)` : ""}`;
        },
        backgroundColor: isDark ? "rgba(20,22,32,0.95)" : "rgba(255,255,255,0.97)",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
        textStyle: { color: isDark ? "#e5e7eb" : "#1f2330", fontSize: 12 },
      },
      series: [
        {
          type: "sunburst",
          data: echartsData,
          radius: [size * 0.1, size * 0.49],
          center: ["50%", "50%"],
          nodeClick: "rootToNode",
          sort: undefined,
          animationDurationUpdate: 500,
          animationEasingUpdate: "cubicOut",
          emphasis: { focus: "ancestor" },
          itemStyle: {
            borderColor: isDark ? "#12131c" : "#ffffff",
            borderWidth: 1.5,
          },
          label: {
            color: isDark ? "#e5e7eb" : "#1f2330",
            // Below this angular width, a segment just doesn't have room
            // for readable text — skip the label entirely rather than
            // cramming/overlapping it into its neighbors.
            minAngle: 11,
            overflow: "truncate",
          },
          // Fewer, larger segments (inner rings) get roomier, larger
          // labels; the densest outer ring (many small segments, e.g.
          // ~24 countries on the World Map) gets a smaller font and a
          // higher minAngle cutoff so it thins itself out instead of
          // overlapping — computed relative to the actual rendered size,
          // not a fixed pixel value that only worked at one chart size.
          levels: [
            {},
            { r0: size * 0.1, r: size * 0.27, label: { fontSize: Math.round(size * 0.032), rotate: "radial" } },
            { r0: size * 0.27, r: size * 0.38, label: { fontSize: Math.round(size * 0.026), rotate: "radial", minAngle: 13 } },
            { r0: size * 0.38, r: size * 0.49, label: { fontSize: Math.round(size * 0.022), rotate: "radial", minAngle: 15 } },
          ],
        },
      ],
    }),
    [echartsData, size, formatValue, isDark, total]
  );

  if (echartsData.length === 0) {
    return <p className="markets-unavailable">Nothing to show yet.</p>;
  }

  return <ReactECharts option={option} style={{ height: size, width: size }} notMerge />;
};

export default SunburstChart;
