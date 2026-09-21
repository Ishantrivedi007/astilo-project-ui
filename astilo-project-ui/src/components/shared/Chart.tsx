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
        // Entrance/update animations sound nice but react-apexcharts calls
        // both updateOptions() and updateSeries() whenever either prop's
        // object reference changes — any caller that (even accidentally)
        // passes a new series/options object on a re-render restarts the
        // animation, and rapid repeats of that can leave series stuck
        // never finishing their draw (axis/grid/legend still show, since
        // those aren't animated the same way). Disabling animations removes
        // that whole failure class app-wide.
        animations: { enabled: false },
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

type ChartSeries = { name?: string; data: number[] | { x: number; y: number | null }[] }[] | number[];

interface ChartProps {
  type: "area" | "bar" | "line" | "donut";
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

  const merged: ApexOptions = useMemo(
    () => ({
      ...base,
      ...options,
      chart: { ...base.chart, ...options?.chart, type },
      grid: { ...base.grid, ...options?.grid },
      xaxis: { ...base.xaxis, ...options?.xaxis },
      yaxis: { ...base.yaxis, ...options?.yaxis },
      // base's gradient fill is meant for "area" charts; on a plain "line"
      // chart (no caller-supplied fill override) it was washing the stroke
      // out to near-invisible against warm/light themes — a solid, fully
      // transparent fill keeps line charts crisp.
      fill: options?.fill ?? (type === "line" ? { type: "solid", opacity: 0 } : base.fill),
      stroke: { ...base.stroke, ...options?.stroke },
    }),
    [base, options, type]
  );

  return (
    <ReactApexChart
      key={themeKey ?? theme.id}
      type={type}
      series={series as ApexOptions["series"]}
      options={merged}
      height={height}
    />
  );
};

export default Chart;
