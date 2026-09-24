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
const SunburstChart = ({ data, size = 320, formatValue }: Props) => {
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
          radius: [size * 0.12, size * 0.46],
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
            fontSize: 10,
            minAngle: 8,
          },
          levels: [
            {},
            { r0: size * 0.12, r: size * 0.28 },
            { r0: size * 0.28, r: size * 0.37 },
            { r0: size * 0.37, r: size * 0.46 },
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
