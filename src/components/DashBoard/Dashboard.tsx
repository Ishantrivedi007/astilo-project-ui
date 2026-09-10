import { useMemo } from "react";
import { chartData } from "./chartData";
import { KPIS, REVENUE, SIGNUPS, TOP_CONTENT, TRAFFIC } from "./dashboardData";
import UsersTable from "./UsersTable";
import {
  PageHeading,
  GlassPanel,
  StatCard,
  Reveal,
  Chart,
  BarList,
} from "../shared";

const usd = (n: number) => `$${Intl.NumberFormat("us").format(Math.round(n))}`;
const compact = (n: number) =>
  Intl.NumberFormat("us", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const investments = [
  { name: "ETF Shares Vital", value: "$21,349.36", invested: "$19,698.65", gain: "+$11,012.39", up: true },
  { name: "Vitainvest Core", value: "$25,943.43", invested: "$23,698.65", gain: "+$3,012.39", up: true },
  { name: "iShares Tech Growth", value: "$9,443.46", invested: "$14,698.65", gain: "-$5,012.39", up: false },
];

const FUNDS = ["ETF Shares Vital", "Vitainvest Core", "iShares Tech Growth"] as const;

export default function DashBoard() {
  const revenueSeries = useMemo(
    () =>
      (["Subscriptions", "Marketplace", "Ads"] as const).map((k) => ({
        name: k,
        data: REVENUE.map((r) => r[k]),
      })),
    []
  );
  const revenueCats = REVENUE.map((r) => r.date);

  const signupSeries = useMemo(
    () =>
      (["Free", "Pro", "Team"] as const).map((k) => ({
        name: k,
        data: SIGNUPS.map((r) => r[k]),
      })),
    []
  );
  const signupCats = SIGNUPS.map((r) => r.month);

  const investSeries = useMemo(
    () =>
      FUNDS.map((f) => ({
        name: f,
        data: chartData.map((d) => d[f]),
      })),
    []
  );
  const investCats = chartData.map((d) => d.date);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="✦ the numbers">
        Command <span className="gradient-text">center</span>
      </PageHeading>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi, i) => (
          <Reveal key={kpi.label} index={i}>
            <StatCard
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              trend={kpi.trend}
              spark={kpi.spark}
            />
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel title="Revenue by stream" className="lg:col-span-2">
          <Chart
            type="area"
            height={300}
            series={revenueSeries}
            options={{
              chart: { stacked: true },
              xaxis: { categories: revenueCats },
              yaxis: { labels: { formatter: (v: number) => compact(v) } },
              tooltip: { y: { formatter: (v: number) => usd(v) } },
            }}
          />
        </GlassPanel>
        <GlassPanel title="Traffic sources">
          <Chart
            type="donut"
            height={240}
            series={TRAFFIC.map((t) => t.value)}
            options={{
              labels: TRAFFIC.map((t) => t.name),
              legend: { position: "bottom" },
              stroke: { width: 0 },
              plotOptions: { pie: { donut: { size: "68%" } } },
              tooltip: { y: { formatter: (v: number) => compact(v) } },
            }}
          />
          <ul className="mt-4 space-y-1 text-sm text-ink/70">
            {TRAFFIC.map((t) => (
              <li key={t.name} className="flex justify-between">
                <span>{t.name}</span>
                <span className="font-medium text-ink">{compact(t.value)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel title="Sign-ups by plan">
          <Chart
            type="bar"
            height={280}
            series={signupSeries}
            options={{
              chart: { stacked: true },
              plotOptions: { bar: { columnWidth: "48%", borderRadius: 6 } },
              fill: { type: "solid", opacity: 0.9 },
              stroke: { width: 0 },
              xaxis: { categories: signupCats },
              yaxis: { labels: { formatter: (v: number) => compact(v) } },
            }}
          />
        </GlassPanel>
        <GlassPanel title="Top content this week">
          <BarList
            data={TOP_CONTENT.map((d) => ({ name: d.name, value: d.value }))}
            valueFormatter={compact}
          />
        </GlassPanel>
      </div>

      <UsersTable />

      <GlassPanel title="Investments">
        <Chart
          type="line"
          height={300}
          series={investSeries}
          options={{
            xaxis: { categories: investCats, tickAmount: 8 },
            yaxis: { labels: { formatter: (v: number) => compact(v) } },
            tooltip: { y: { formatter: (v: number) => usd(v) } },
            fill: { type: "solid", opacity: 1 },
          }}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hair/30 text-ink/60">
                <th className="py-2 pr-4">Fund</th>
                <th className="py-2 pr-4 text-right">Value</th>
                <th className="py-2 pr-4 text-right">Invested</th>
                <th className="py-2 text-right">Gain</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((row) => (
                <tr key={row.name} className="border-b border-hair/15">
                  <td className="py-3 pr-4 font-medium text-ink">{row.name}</td>
                  <td className="py-3 pr-4 text-right text-ink/80">{row.value}</td>
                  <td className="py-3 pr-4 text-right text-ink/80">{row.invested}</td>
                  <td className="py-3 text-right">
                    <span
                      className={
                        row.up
                          ? "text-emerald-500 dark:text-emerald-300"
                          : "text-rose-500 dark:text-rose-300"
                      }
                    >
                      {row.gain}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
