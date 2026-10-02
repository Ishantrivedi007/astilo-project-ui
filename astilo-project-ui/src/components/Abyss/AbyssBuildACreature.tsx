import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { evaluateCreature, type CreatureEnvironment, type CreatureTraits } from "../../lib/abyssApi";
import AbyssSimulationBanner from "./AbyssSimulationBanner";
import "./Abyss.scss";

const AbyssBuildACreature = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const alienWorld = searchParams.get("world");
  const [env, setEnv] = useState<CreatureEnvironment>(
    alienWorld
      ? { depthMeters: 10000, lightPercent: 0, foodAvailability: "scarce" }
      : { depthMeters: 3000, lightPercent: 0, foodAvailability: "scarce" },
  );
  const [traits, setTraits] = useState<CreatureTraits>({
    bioluminescence: true,
    eyeSize: "medium",
    skeleton: "reduced",
    metabolism: "slow",
    feedingStrategy: "ambush",
  });

  const evalMutation = useMutation({
    mutationFn: () => evaluateCreature(env, traits),
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ {alienWorld ? `Alien Ocean Simulator — ${alienWorld}` : "Build-a-Creature"}</p>
        <h1 className="abyss-title">{alienWorld ? "Design for an alien ocean." : "Design for the deep."}</h1>
        <p className="abyss-tagline">
          {alienWorld
            ? `Whether ${alienWorld} hosts life at all is unknown — this tool applies the same real deep-sea adaptation heuristics used for Earth's ocean to a hypothetical organism, purely for exploration.`
            : "Choose an environment, then design an organism and see how well it fits — a teaching heuristic, not a biological prediction."}
        </p>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <Reveal>
          <div className="abyss-card">
            <p className="text-sm font-semibold mb-3">Environment</p>
            <div className="abyss-descent-controls" style={{ margin: "0.5rem 0" }}>
              <span className="abyss-unavailable" style={{ minWidth: 90 }}>Depth</span>
              <input aria-label="Depth" type="range" min={0} max={11000} step={100} value={env.depthMeters} onChange={(e) => setEnv((p) => ({ ...p, depthMeters: Number(e.target.value) }))} />
              <span style={{ minWidth: 70, textAlign: "right" }}>{env.depthMeters} m</span>
            </div>
            <div className="abyss-descent-controls" style={{ margin: "0.5rem 0" }}>
              <span className="abyss-unavailable" style={{ minWidth: 90 }}>Light</span>
              <input aria-label="Light" type="range" min={0} max={100} step={5} value={env.lightPercent} onChange={(e) => setEnv((p) => ({ ...p, lightPercent: Number(e.target.value) }))} />
              <span style={{ minWidth: 70, textAlign: "right" }}>{env.lightPercent}%</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="abyss-unavailable">Food</span>
              {(["scarce", "moderate", "abundant"] as const).map((f) => (
                <button key={f} type="button" className="abyss-source-badge" style={env.foodAvailability === f ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined} onClick={() => setEnv((p) => ({ ...p, foodAvailability: f }))}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="abyss-card">
            <p className="text-sm font-semibold mb-3">Traits</p>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={traits.bioluminescence} onChange={(e) => setTraits((p) => ({ ...p, bioluminescence: e.target.checked }))} />
              Bioluminescence
            </label>
            {([
              { key: "eyeSize", label: "Eyes", options: ["none", "small", "medium", "large"] },
              { key: "skeleton", label: "Skeleton", options: ["rigid", "reduced", "none"] },
              { key: "metabolism", label: "Metabolism", options: ["slow", "normal", "fast"] },
              { key: "feedingStrategy", label: "Feeding", options: ["active-hunter", "ambush", "filter-feeder", "scavenger"] },
            ] as const).map((group) => (
              <div key={group.key} className="mb-3">
                <p className="text-xs text-white/50 mb-1">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="abyss-source-badge"
                      style={traits[group.key] === opt ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
                      onClick={() => setTraits((p) => ({ ...p, [group.key]: opt }))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <button type="button" className="abyss-nav-tile mt-4" style={{ flexDirection: "row", alignItems: "center" }} onClick={() => evalMutation.mutate()} disabled={evalMutation.isPending}>
        Evaluate design
      </button>

      {evalMutation.data && (
        <Reveal>
          <AbyssSimulationBanner>This ecological-fit score is a simplified teaching heuristic, not a prediction of real survival.</AbyssSimulationBanner>
          <div className="abyss-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-2xl font-bold">{evalMutation.data.data.ecologicalFitScore}/100</p>
              <span className="abyss-source-badge">{evalMutation.data.data.verdict}</span>
            </div>
            <p className="abyss-unavailable mb-2">Pressure at this depth: {evalMutation.data.data.pressureAtm} atm</p>
            <ul className="flex flex-col gap-1">
              {evalMutation.data.data.notes.map((note, i) => (
                <li key={i} className="text-sm text-white/70">• {note}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssBuildACreature;
