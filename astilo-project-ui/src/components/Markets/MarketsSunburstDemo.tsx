import { useNavigate } from "react-router-dom";
import { ArrowLeft, PieChart } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { SunburstChart } from "../shared";
import type { SunburstNode } from "../../lib/sunburst";
import SunburstChartEchartsSample from "../shared/SunburstChart.echarts-sample";
import "./Markets.scss";

const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Same shape/values as the ECharts sample's illustrative data (see that
// file's own disclaimer) — kept identical on purpose so this page is a
// like-for-like comparison of the two rendering approaches, not a
// comparison muddied by different numbers. Neither of these numbers is
// real account data; the real version of this exact chart (driven by
// your actual live portfolio) is on the Portfolio page.
const SAMPLE_TREE: SunburstNode = {
  id: "root",
  name: "Portfolio",
  children: [
    {
      id: "stocks",
      name: "Stocks",
      children: [
        { id: "AAPL", name: "AAPL", value: 4200 },
        { id: "MSFT", name: "MSFT", value: 3100 },
        { id: "NVDA", name: "NVDA", value: 2600 },
      ],
    },
    {
      id: "crypto",
      name: "Crypto",
      children: [
        { id: "BTC", name: "BTC", value: 1800 },
        { id: "ETH", name: "ETH", value: 900 },
      ],
    },
    { id: "cash", name: "Cash", value: 1500 },
  ],
};

const MarketsSunburstDemo = () => {
  const navigate = useNavigate();

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <PieChart size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Sunburst chart comparison
      </h1>
      <p className="markets-tagline">
        Two implementations of the same hierarchy, side by side, on identical illustrative data (not real account
        data — the real, live version of this exact chart is on the{" "}
        <button type="button" onClick={() => navigate(AppRoute.tradingPortfolio)} style={{ textDecoration: "underline", display: "inline", color: "inherit" }}>
          Portfolio
        </button>{" "}
        page).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", marginTop: "1.5rem" }}>
        <div>
          <h2 className="markets-section-title">This app's own SVG sunburst</h2>
          <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
            Hand-rolled (src/lib/sunburst.ts + shared/SunburstChart.tsx) — no extra dependency, click-to-zoom,
            theme-integrated.
          </p>
          <SunburstChart data={SAMPLE_TREE} size={340} formatValue={money} />
        </div>

        <div>
          <h2 className="markets-section-title">Apache ECharts native sunburst</h2>
          <SunburstChartEchartsSample />
        </div>
      </div>
    </div>
  );
};

export default MarketsSunburstDemo;
