import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchFoodWebGraph, simulateFoodWeb } from "../../lib/abyssApi";
import AbyssSimulationBanner from "./AbyssSimulationBanner";
import "./Abyss.scss";

const AbyssFoodWeb = () => {
  const navigate = useNavigate();
  const [changes, setChanges] = useState<Record<string, number>>({});

  const { data: graphEnv } = useQuery({
    queryKey: ["abyss", "food-web", "graph"],
    queryFn: () => fetchFoodWebGraph(),
    staleTime: Infinity,
  });

  const simMutation = useMutation({
    mutationFn: () => {
      const nonZero = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== 0));
      return simulateFoodWeb(nonZero);
    },
  });

  const nodes = graphEnv?.data.nodes.filter((n) => n.id !== "sun") ?? [];
  const result = simMutation.data?.data.populationChangePercent;

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Food Web</p>
        <h1 className="abyss-title">Who eats whom?</h1>
        <p className="abyss-tagline">
          Sun → Phytoplankton → Zooplankton → Small fish → Tuna → Shark. Adjust a population and
          run the simulator to see the cascade.
        </p>
      </Reveal>

      <Reveal>
        <div className="abyss-food-web-chain">
          {nodes.map((node, i) => (
            <div key={node.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div className="abyss-food-web-node">
                <span className="text-sm font-semibold">{node.label}</span>
                <input
                  aria-label={`${node.label} population change`}
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={changes[node.id] ?? 0}
                  onChange={(e) => setChanges((prev) => ({ ...prev, [node.id]: Number(e.target.value) }))}
                />
                <span className="abyss-unavailable">{(changes[node.id] ?? 0) > 0 ? "+" : ""}{changes[node.id] ?? 0}%</span>
              </div>
              {i < nodes.length - 1 && <span className="abyss-food-web-arrow">→</span>}
            </div>
          ))}
        </div>
      </Reveal>

      <button
        type="button"
        className="abyss-nav-tile"
        style={{ flexDirection: "row", alignItems: "center" }}
        onClick={() => simMutation.mutate()}
        disabled={simMutation.isPending || Object.values(changes).every((v) => v === 0)}
      >
        Run simulation
      </button>

      {result && (
        <Reveal>
          <AbyssSimulationBanner />
          <div className="abyss-card">
            <p className="text-sm font-semibold mb-3">Resulting population change</p>
            <div className="grid gap-3">
              {nodes.map((node) => {
                const v = result[node.id] ?? 0;
                const width = Math.min(Math.abs(v), 100) / 2; // up to 50% of track each direction
                return (
                  <div key={node.id}>
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                      <span>{node.label}</span>
                      <span style={{ color: v > 0 ? "#5eead4" : v < 0 ? "#fb7185" : undefined }}>
                        {v > 0 ? "+" : ""}
                        {v}%
                      </span>
                    </div>
                    <div className="abyss-pop-bar-track">
                      <div
                        className={`abyss-pop-bar-fill abyss-pop-bar-fill--${v >= 0 ? "up" : "down"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssFoodWeb;
