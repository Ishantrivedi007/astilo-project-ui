import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal, Chart } from "../shared";
import { runEvolutionSimulation, type EvolutionPressures } from "../../lib/abyssApi";
import AbyssSimulationBanner from "./AbyssSimulationBanner";
import "./Abyss.scss";

const AbyssEvolutionSim = () => {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState(100);
  const [pressures, setPressures] = useState<EvolutionPressures>({ temperature: 0, oxygen: 0, food: 0, predators: 0 });

  const runMutation = useMutation({
    mutationFn: () => runEvolutionSimulation(generations, pressures),
  });

  const history = runMutation.data?.data.history ?? [];

  const setPressure = (key: keyof EvolutionPressures, value: number) => setPressures((p) => ({ ...p, [key]: value }));

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Evolution Simulator</p>
        <h1 className="abyss-title">Selection pressure over time.</h1>
        <p className="abyss-tagline">
          A teaching simulation of trait drift under chosen pressures — not a reconstruction of any
          real species' evolutionary history.
        </p>
      </Reveal>

      <Reveal>
        <div className="abyss-card mt-6">
          <div className="abyss-descent-controls" style={{ margin: "0.5rem 0" }}>
            <span className="abyss-unavailable" style={{ minWidth: 110 }}>Generations</span>
            <input aria-label="Generations" type="range" min={10} max={100000} step={10} value={generations} onChange={(e) => setGenerations(Number(e.target.value))} />
            <span style={{ minWidth: 80, textAlign: "right" }}>{generations.toLocaleString()}</span>
          </div>
          {([
            { key: "temperature", label: "Temperature ↑" },
            { key: "oxygen", label: "Oxygen ↓" },
            { key: "food", label: "Food scarcity ↑" },
            { key: "predators", label: "Predators ↑" },
          ] as const).map((p) => (
            <div key={p.key} className="abyss-descent-controls" style={{ margin: "0.5rem 0" }}>
              <span className="abyss-unavailable" style={{ minWidth: 110 }}>{p.label}</span>
              <input aria-label={p.label} type="range" min={-1} max={1} step={0.1} value={pressures[p.key]} onChange={(e) => setPressure(p.key, Number(e.target.value))} />
              <span style={{ minWidth: 50, textAlign: "right" }}>{pressures[p.key].toFixed(1)}</span>
            </div>
          ))}
          <button type="button" className="abyss-nav-tile mt-3" style={{ flexDirection: "row", alignItems: "center" }} onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
            Run {generations.toLocaleString()} generations
          </button>
        </div>
      </Reveal>

      {history.length > 0 && (
        <Reveal>
          <AbyssSimulationBanner>Trait drift here is a toy model (random mutation + simplified selection), not calibrated genetics.</AbyssSimulationBanner>
          <div className="abyss-card">
            <Chart
              type="area"
              height={280}
              series={[
                { name: "Mean size", data: history.map((h) => h.meanSize) },
                { name: "Mean speed", data: history.map((h) => h.meanSpeed) },
              ]}
              options={{
                xaxis: { categories: history.map((h) => `Gen ${h.generation}`) },
                yaxis: { min: 0, max: 100 },
              }}
            />
            <p className="abyss-unavailable mt-3">Final population: {history[history.length - 1].population.toLocaleString()}</p>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssEvolutionSim;
