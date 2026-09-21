import { Chart } from "../shared";

// Exact real AAPL 1d/5m points from the live API response, hardcoded, so we
// can test whether ApexCharts draws a line for this data with zero other
// app code (no queries, no memoization, no per-symbol logic) in the way.
const RAW_POINTS: { t: number; close: number }[] = [
  { t: 1789997400000, close: 334.5411071777344 },
  { t: 1789997700000, close: 333.3699951171875 },
  { t: 1789998000000, close: 333.8900146484375 },
  { t: 1789998300000, close: 335.7200927734375 },
  { t: 1789998600000, close: 335.8999938964844 },
  { t: 1789998900000, close: 335.8500061035156 },
  { t: 1789999200000, close: 336.4949951171875 },
  { t: 1789999500000, close: 337.5249938964844 },
  { t: 1789999800000, close: 336.7799987792969 },
  { t: 1790000100000, close: 337.06500244140625 },
  { t: 1790000400000, close: 337.1000061035156 },
  { t: 1790000700000, close: 337.29998779296875 },
  { t: 1790001000000, close: 337.57000732421875 },
  { t: 1790001300000, close: 337.82501220703125 },
  { t: 1790001600000, close: 337.0050048828125 },
  { t: 1790001900000, close: 336.4700012207031 },
  { t: 1790002200000, close: 336.8500061035156 },
  { t: 1790002500000, close: 336.9800109863281 },
  { t: 1790002800000, close: 337.0299987792969 },
  { t: 1790003100000, close: 337.3299865722656 },
  { t: 1790003400000, close: 337.35009765625 },
  { t: 1790003700000, close: 337.8800048828125 },
  { t: 1790004000000, close: 336.9750061035156 },
  { t: 1790004300000, close: 337.0400085449219 },
  { t: 1790004600000, close: 337.1449890136719 },
  { t: 1790004900000, close: 337.8200988769531 },
  { t: 1790005200000, close: 337.875 },
  { t: 1790005500000, close: 338.2300109863281 },
  { t: 1790005800000, close: 338.1300048828125 },
  { t: 1790006100000, close: 337.7300109863281 },
  { t: 1790006400000, close: 337.9700012207031 },
  { t: 1790006700000, close: 338.43499755859375 },
  { t: 1790007000000, close: 338.5 },
  { t: 1790007300000, close: 338.9100036621094 },
  { t: 1790007600000, close: 338.4800109863281 },
  { t: 1790007900000, close: 338.5299987792969 },
  { t: 1790008200000, close: 338.7900085449219 },
  { t: 1790008500000, close: 338.7367858886719 },
  { t: 1790008800000, close: 339.0054931640625 },
  { t: 1790009100000, close: 339.2491149902344 },
  { t: 1790009400000, close: 338.9200134277344 },
  { t: 1790009700000, close: 338.710693359375 },
  { t: 1790010000000, close: 338.81500244140625 },
  { t: 1790010300000, close: 338.69000244140625 },
  { t: 1790010600000, close: 339.0105895996094 },
  { t: 1790010900000, close: 338.885009765625 },
  { t: 1790011200000, close: 338.6199951171875 },
  { t: 1790011500000, close: 338.760009765625 },
  { t: 1790011800000, close: 338.6499938964844 },
  { t: 1790012100000, close: 338.30999755859375 },
  { t: 1790012400000, close: 338.43011474609375 },
  { t: 1790012700000, close: 338.4750061035156 },
  { t: 1790013000000, close: 338.4049987792969 },
  { t: 1790013300000, close: 338.19000244140625 },
  { t: 1790013600000, close: 338.375 },
  { t: 1790013900000, close: 338.1449890136719 },
  { t: 1790014200000, close: 337.9100036621094 },
  { t: 1790014500000, close: 338.3399963378906 },
  { t: 1790014800000, close: 338.885009765625 },
  { t: 1790015100000, close: 338.9200134277344 },
  { t: 1790015400000, close: 338.75 },
  { t: 1790015700000, close: 338.8550109863281 },
  { t: 1790016000000, close: 338.8599853515625 },
  { t: 1790016300000, close: 338.6720886230469 },
  { t: 1790016600000, close: 338.7650146484375 },
  { t: 1790016900000, close: 338.67498779296875 },
  { t: 1790017200000, close: 338.2539978027344 },
  { t: 1790017500000, close: 338.8299865722656 },
  { t: 1790017800000, close: 338.94000244140625 },
  { t: 1790018100000, close: 339.010009765625 },
  { t: 1790018400000, close: 339.1719970703125 },
  { t: 1790018700000, close: 339.4383850097656 },
  { t: 1790019000000, close: 339.2049865722656 },
  { t: 1790019300000, close: 339.3299865722656 },
  { t: 1790019600000, close: 339.2049865722656 },
  { t: 1790019900000, close: 339.6050109863281 },
  { t: 1790020200000, close: 339.3900146484375 },
  { t: 1790020388000, close: 339.3399963378906 },
];

/** Isolated test harness for the "line chart shows axis/grid/legend but no
 * visible line" bug — real hardcoded AAPL data, zero other app logic
 * (no queries, no memoized multi-series construction, no theme merging
 * beyond the shared Chart wrapper itself) so the next screenshot tells us
 * definitively whether the bug is in ApexCharts/the wrapper itself, or in
 * something specific to how MarketsAssetView builds its series/options. */
const ChartDebug = () => {
  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "#fff", marginBottom: "1rem" }}>Chart debug — hardcoded real AAPL data</h1>

      <h2 style={{ color: "#fff", fontSize: "1rem", margin: "1.5rem 0 0.5rem" }}>
        1. Minimal — no Chart.tsx wrapper theme merge, raw ApexOptions only
      </h2>
      <Chart
        type="line"
        height={300}
        series={[{ name: "AAPL", data: RAW_POINTS.map((p) => ({ x: p.t, y: p.close })) }]}
        options={{
          colors: ["#4ade80"],
          stroke: { width: 3 },
          xaxis: { type: "datetime" },
          chart: { toolbar: { show: false }, animations: { enabled: false } },
        }}
      />

      <h2 style={{ color: "#fff", fontSize: "1rem", margin: "1.5rem 0 0.5rem" }}>
        2. [x,y] tuple array format instead of {"{x,y}"} objects
      </h2>
      <Chart
        type="line"
        height={300}
        series={[{ name: "AAPL", data: RAW_POINTS.map((p) => [p.t, p.close]) as unknown as number[] }]}
        options={{
          colors: ["#facc15"],
          stroke: { width: 3 },
          xaxis: { type: "datetime" },
          chart: { toolbar: { show: false }, animations: { enabled: false } },
        }}
      />

      <h2 style={{ color: "#fff", fontSize: "1rem", margin: "1.5rem 0 0.5rem" }}>3. type="area" instead of "line"</h2>
      <Chart
        type="area"
        height={300}
        series={[{ name: "AAPL", data: RAW_POINTS.map((p) => ({ x: p.t, y: p.close })) }]}
        options={{
          colors: ["#60a5fa"],
          stroke: { width: 3 },
          xaxis: { type: "datetime" },
          chart: { toolbar: { show: false }, animations: { enabled: false } },
        }}
      />

      <h2 style={{ color: "#fff", fontSize: "1rem", margin: "1.5rem 0 0.5rem" }}>4. Plain numeric index x-axis (no datetime)</h2>
      <Chart
        type="line"
        height={300}
        series={[{ name: "AAPL", data: RAW_POINTS.map((p) => p.close) }]}
        options={{
          colors: ["#f472b6"],
          stroke: { width: 3 },
          chart: { toolbar: { show: false }, animations: { enabled: false } },
        }}
      />
    </div>
  );
};

export default ChartDebug;
