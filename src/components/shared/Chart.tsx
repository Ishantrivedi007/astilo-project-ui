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
        animations: { enabled: true, speed: 600, animateGradually: { enabled: true } },
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

type ChartSeries = { name?: string; data: number[] }[] | number[];

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
