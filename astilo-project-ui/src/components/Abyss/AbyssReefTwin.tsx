import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal, Chart } from "../shared";
import { simulateReefTwin } from "../../lib/abyssApi";
import AbyssSimulationBanner from "./AbyssSimulationBanner";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSourceBadge from "./AbyssSourceBadge";
import "./Abyss.scss";

const AbyssReefTwin = () => {
  const navigate = useNavigate();
  const [tempDelta, setTempDelta] = useState(0);
  const [phDelta, setPhDelta] = useState(0);
  const [pollution, setPollution] = useState(0);
  const [fishing, setFishing] = useState(0);
  const [years, setYears] = useState(10);

  const simMutation = useMutation({
    mutationFn: () => simulateReefTwin({ tempDelta, phDelta, pollution, fishing, years }),
  });

  const timeline = simMutation.data?.data.timeline ?? [];
  const baseline = simMutation.data?.data.baseline;

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Reef Digital Twin</p>
        <h1 className="abyss-title">Stress-test a coral reef.</h1>
        <p className="abyss-tagline">
          Baseline: 27°C, pH 8.1, 76% coral cover, 83% fish biomass. Adjust stressors and run the
          model forward.
        </p>
      </Reveal>

      <Reveal>
        <div className="abyss-card mt-6">
          {[
            { label: "Temperature change", value: tempDelta, set: setTempDelta, min: -2, max: 5, step: 0.5, unit: "°C" },
            { label: "pH change", value: phDelta, set: setPhDelta, min: -1, max: 0.5, step: 0.1, unit: "" },
            { label: "Pollution", value: pollution, set: setPollution, min: 0, max: 100, step: 5, unit: "%" },
            { label: "Fishing pressure", value: fishing, set: setFishing, min: 0, max: 100, step: 5, unit: "%" },
            { label: "Years to simulate", value: years, set: setYears, min: 1, max: 50, step: 1, unit: "yr" },
          ].map((f) => (
            <div key={f.label} className="abyss-descent-controls" style={{ margin: "0.6rem 0" }}>
              <span className="abyss-unavailable" style={{ minWidth: 150 }}>{f.label}</span>
              <input aria-label={f.label} type="range" min={f.min} max={f.max} step={f.step} value={f.value} onChange={(e) => f.set(Number(e.target.value))} />
              <span style={{ minWidth: 60, textAlign: "right" }}>
                {f.value > 0 && f.unit !== "yr" ? "+" : ""}
                {f.value}
                {f.unit}
              </span>
            </div>
          ))}
          <button type="button" className="abyss-nav-tile mt-3" style={{ flexDirection: "row", alignItems: "center" }} onClick={() => simMutation.mutate()} disabled={simMutation.isPending}>
            Simulate {years} years
          </button>
        </div>
      </Reveal>

      {timeline.length > 0 && baseline && (
        <Reveal>
          <AbyssSimulationBanner>
            This models illustrative ecological relationships and is not a forecast of any real reef.
          </AbyssSimulationBanner>
          <div className="abyss-card">
            <div className="flex items-center gap-2 mb-3">
              <AbyssSourceBadge source="Astilo reef model" />
              <AbyssConfidenceBadge confidence="SIMULATED" />
            </div>
            <Chart
              type="area"
              height={260}
              series={[
                { name: "Coral cover %", data: timeline.map((t) => t.coralCoverPercent) },
                { name: "Fish biomass %", data: timeline.map((t) => t.fishBiomassPercent) },
              ]}
              options={{
                xaxis: { categories: timeline.map((t) => `Yr ${t.year}`) },
                yaxis: { min: 0, max: 100 },
              }}
            />
            <dl className="abyss-field-grid mt-4">
              <div className="abyss-field"><dt>Final coral cover</dt><dd>{timeline[timeline.length - 1].coralCoverPercent}%</dd></div>
              <div className="abyss-field"><dt>Final fish biomass</dt><dd>{timeline[timeline.length - 1].fishBiomassPercent}%</dd></div>
            </dl>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssReefTwin;
