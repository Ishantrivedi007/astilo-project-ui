/**
 * REFERENCE / COMPARISON SAMPLE — not wired into any route, not used by
 * the live app. Demonstrates the same portfolio-allocation hierarchy as
 * the app's real hand-built SVG sunburst (src/components/shared/
 * SunburstChart.tsx, used on the Trading Portfolio and World Map pages)
 * but rendered with Apache ECharts' native `sunburst` series instead, so
 * the two approaches can be compared side by side:
 *
 *   - This file: `echarts` + `echarts-for-react` (newly added dependency,
 *     ~1MB, purpose-built radial-hierarchy chart with built-in zoom,
 *     animated transitions, and richer tooltip/label layout for free).
 *   - The production component: zero extra dependency, hand-rolled SVG
 *     arc math (src/lib/sunburst.ts), click-to-zoom implemented by hand,
 *     simpler but fully under this app's own control and already
 *     matching its theme system via useChartTheme.
 *
 * The data below is illustrative placeholder data ONLY — clearly not real
 * account data, unlike everything else in this codebase's Markets
 * feature, which is real live data. This file exists purely so the two
 * charting approaches can be evaluated; it is not a template to copy
 * real data into without addressing that.
 */
import ReactECharts from "echarts-for-react";

const SAMPLE_DATA = {
  name: "Portfolio",
  children: [
    {
      name: "Stocks",
      children: [
        { name: "AAPL", value: 4200 },
        { name: "MSFT", value: 3100 },
        { name: "NVDA", value: 2600 },
      ],
    },
    {
      name: "Crypto",
      children: [
        { name: "BTC", value: 1800 },
        { name: "ETH", value: 900 },
      ],
    },
    { name: "Cash", value: 1500 },
  ],
};

const SunburstChartEchartsSample = () => {
  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "sunburst",
        data: SAMPLE_DATA.children,
        radius: [40, "90%"],
        sort: undefined,
        emphasis: { focus: "ancestor" },
        levels: [
          {},
          { r0: 40, r: 100, itemStyle: { borderWidth: 2 }, label: { rotate: "tangential" } },
          { r0: 100, r: 160, label: { align: "right" } },
        ],
      },
    ],
  };

  return (
    <div>
      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
        ECharts native sunburst — illustrative sample data, for comparison only.
      </p>
      <ReactECharts option={option} style={{ height: 360, width: 360 }} />
    </div>
  );
};

export default SunburstChartEchartsSample;
