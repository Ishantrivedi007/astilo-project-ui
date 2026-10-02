import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchCoverageIndex } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssKnowledgeMap = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "coverage-index"],
    queryFn: () => fetchCoverageIndex(),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Ocean Knowledge Map</p>
        <h1 className="abyss-title">Astilo Data Coverage.</h1>
        <p className="abyss-tagline">Not "scientific knowledge" — a measure of sampling density, explained plainly below.</p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-4">
          <AbyssSourceBadge source="Derived from real OBIS statistics" />
          <AbyssConfidenceBadge confidence="CURATED" />
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Computing index from live OBIS data (this can take a moment)…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}

      <div className="grid gap-3">
        {data?.data.regions.map((r) => (
          <Reveal key={r.id}>
            <div className="abyss-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{r.label}</span>
                <span className="abyss-unavailable">{r.records.toLocaleString()} real records</span>
              </div>
              <div className="abyss-pop-bar-track">
                <div className="abyss-pop-bar-fill abyss-pop-bar-fill--up" style={{ left: 0, width: `${r.coverageIndex}%` }} />
              </div>
              <p className="text-xs text-white/50 mt-1">ASTILO DATA COVERAGE — {r.coverageIndex}/100</p>
            </div>
          </Reveal>
        ))}
      </div>

      {data && (
        <Reveal>
          <div className="abyss-card mt-4">
            <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Methodology</p>
            <p className="text-sm text-white/70">{data.data.methodology}</p>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssKnowledgeMap;
