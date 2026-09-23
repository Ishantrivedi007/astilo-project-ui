import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "../../theme/ThemeProvider";

const readVar = (name: string) => {
  if (typeof window === "undefined") return "0 0 0";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/** Theme-aware colours + a sensible Apex base config, recomputed per theme. */
export const useChartTheme = () => {
  const { theme } = useTheme();

  return useMemo(() => {
    const rgb = (v: string) => `rgb(${readVar(v)})`;
    const rgba = (v: string, a: number) => `rgb(${readVar(v)} / ${a})`;
    const isDark = theme.mode === "dark";

    const accent = rgb("--accent-rgb");
    const accent2 = rgb("--accent-2-rgb");
    const ink = rgb("--ink-rgb");
    const inkMuted = rgba("--ink-rgb", 0.55);
    const grid = rgba("--ink-rgb", 0.1);

    const palette = [accent2, accent, "#22d3ee", "#f59e0b", "#f43f5e"];

    const base: ApexOptions = {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        background: "transparent",
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        animations: { enabled: true, speed: 400 },
        parentHeightOffset: 0,
      },
      theme: { mode: isDark ? "dark" : "light" },
      colors: palette,
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2.5, lineCap: "round" },
      grid: {
        borderColor: grid,
        strokeDashArray: 4,
        padding: { left: 8, right: 8 },
      },
      xaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: inkMuted, fontSize: "11px" } },
      },
      yaxis: {
        labels: { style: { colors: inkMuted, fontSize: "11px" } },
      },
      legend: {
        labels: { colors: ink },
        markers: { strokeWidth: 0 },
        fontSize: "12px",
      },
      tooltip: { theme: isDark ? "dark" : "light" },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 0.6, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
      },
    };

    return { accent, accent2, ink, inkMuted, grid, palette, isDark, base };
  }, [theme]);
};

type ChartSeries =
  | { name?: string; data: number[] | { x: number; y: number | null }[] | { x: number; y: (number | null)[] }[] }[]
  | number[];

interface ChartProps {
  type: "area" | "bar" | "line" | "donut" | "candlestick";
  series: ChartSeries;
  options?: ApexOptions;
  height?: number | string;
  /** re-mount on theme change so colours + animations refresh cleanly */
  themeKey?: string;
}

/** Small wrapper that merges the themed base config with per-chart overrides. */
const Chart = ({ type, series, options, height = 280, themeKey }: ChartProps) => {
  const { base } = useChartTheme();
  const { theme } = useTheme();

  // Verified via an isolated debug harness (real hardcoded data, every other
  // variable removed) that chart.type "line" renders axis/grid/legend but
  // never draws the actual series path in this apexcharts/react-apexcharts
  // pairing — while "area" with the exact same data renders correctly. Since
  // there's no known config fix, every "line" request is rendered as an
  // "area" internally with a fully transparent fill, which is visually
  // identical to a line chart but uses the render path that actually works.
  const effectiveType = type === "line" ? "area" : type;

  const merged: ApexOptions = useMemo(() => {
    // Candlestick series carry {x, y:[o,h,l,c]} data — a fundamentally
    // different shape than the numeric-y line/area series the remapping
    // below assumes. Skip the line->area substitution and the stroke/fill
    // overrides entirely; only merge the base chart-level chrome (font,
    // grid, toolbar) so candlesticks render with their own default look.
    if (type === "candlestick") {
      return {
        ...base,
        ...options,
        chart: { ...base.chart, ...options?.chart, type: "candlestick" },
        grid: { ...base.grid, ...options?.grid },
        xaxis: { ...base.xaxis, ...options?.xaxis },
        yaxis: { ...base.yaxis, ...options?.yaxis },
      };
    }
    return {
      ...base,
      ...options,
      chart: { ...base.chart, ...options?.chart, type: effectiveType },
      grid: { ...base.grid, ...options?.grid },
      xaxis: { ...base.xaxis, ...options?.xaxis },
      yaxis: { ...base.yaxis, ...options?.yaxis },
      // base's soft gradient fill (low opacity, meant to shade the area
      // under a line) only makes sense for a *real* area chart. Applied as
      // the fallback to every other type with no caller override, it made
      // "donut"/"bar" slices render as pale/hollow-looking instead of solid.
      // "line" (now rendered as "area" internally, see above) is *forced*
      // transparent regardless of any caller-supplied fill — fill has no
      // visible effect on a genuine line chart, so a caller setting e.g.
      // {opacity: 1} for what it thinks is a harmless no-op (true before
      // the "line"->"area" substitution) would otherwise now paint solid
      // overlapping blocks instead of lines.
      fill: type === "line" ? { type: "solid", opacity: 0 } : options?.fill ?? (type === "area" ? base.fill : { type: "solid", opacity: 1 }),
      stroke: { ...base.stroke, ...options?.stroke },
    };
  }, [base, options, type, effectiveType]);

  return (
    <ReactApexChart
      key={themeKey ?? theme.id}
      type={effectiveType}
      series={series as ApexOptions["series"]}
      options={merged}
      height={height}
    />
  );
};

export default Chart;
