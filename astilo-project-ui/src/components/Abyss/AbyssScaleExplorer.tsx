import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchScaleExplorer } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const formatSize = (meters: number): string => {
  if (meters >= 1) return `${meters.toLocaleString()} m`;
  if (meters >= 0.01) return `${(meters * 100).toFixed(1)} cm`;
  if (meters >= 0.000001) return `${(meters * 1_000_000).toFixed(1)} μm`;
  return `${(meters * 1_000_000_000).toFixed(0)} nm`;
};

const AbyssScaleExplorer = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "scale-explorer"],
    queryFn: () => fetchScaleExplorer(),
    staleTime: Infinity,
    retry: false,
  });

  const points = data?.data.points ?? [];
  const maxLog = points.length ? Math.log10(points[0].meters) : 1;
  const minLog = points.length ? Math.log10(points[points.length - 1].meters) : -7;
  const range = maxLog - minLog;

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Scale Explorer</p>
        <h1 className="abyss-title">From whale to virus.</h1>
        <p className="abyss-tagline">A logarithmic ladder — each step down is roughly an order of magnitude smaller.</p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-6">
          <AbyssSourceBadge source="Astilo curated reference" />
          <AbyssConfidenceBadge confidence="CURATED" />
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Loading…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}

      <div className="grid gap-2">
        {points.map((p) => {
          const widthPct = Math.max(2, ((Math.log10(p.meters) - minLog) / range) * 100);
          return (
            <Reveal key={p.id}>
              <button
                type="button"
                className="abyss-card text-left w-full"
                onClick={() => p.scientificName && navigate(`${AppRoute.abyssSearch}?q=${encodeURIComponent(p.scientificName)}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{p.label}</span>
                  <span className="abyss-unavailable">{formatSize(p.meters)}</span>
                </div>
                <div className="abyss-pop-bar-track">
                  <div className="abyss-pop-bar-fill abyss-pop-bar-fill--up" style={{ left: 0, width: `${widthPct}%` }} />
                </div>
                {p.scientificName && <p className="text-xs italic text-white/40 mt-1">{p.scientificName}</p>}
              </button>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

export default AbyssScaleExplorer;
