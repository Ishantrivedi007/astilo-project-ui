import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchMicrobialOcean } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssMicrobialOcean = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "microbial-ocean"],
    queryFn: () => fetchMicrobialOcean(),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Microbial Ocean & Plankton Universe</p>
        <h1 className="abyss-title">The invisible majority.</h1>
        <p className="abyss-tagline">Marine biology doesn't stop at animals — most ocean life is microscopic.</p>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-6">Loading…</p>}
      {isError && <p className="abyss-unavailable mt-6">Unavailable — backend may be offline.</p>}

      {data && (
        <>
          <p className="abyss-section-title">Microbial groups</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.data.microbialGroups.map((g) => (
              <Reveal key={g.id}>
                <div className="abyss-card">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold">{g.label}</p>
                    <span className="abyss-unavailable italic">{g.exampleGenus}</span>
                  </div>
                  <p className="text-sm text-white/70">{g.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="abyss-section-title">Plankton Universe</p>
          <div className="abyss-nav-grid">
            {data.data.planktonCategories.map((p) => (
              <Reveal key={p.id}>
                <div className="abyss-card">
                  <p className="font-bold mb-1 text-sm">{p.label}</p>
                  <p className="text-xs text-white/60">{p.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="abyss-section-title">Key concepts</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.data.concepts.map((c) => (
              <Reveal key={c.id}>
                <div className="abyss-card">
                  <p className="font-bold mb-1">{c.label}</p>
                  <p className="text-sm text-white/70">{c.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <AbyssSourceBadge source="Astilo curated reference" />
            <AbyssConfidenceBadge confidence="CURATED" />
          </div>
        </>
      )}
    </div>
  );
};

export default AbyssMicrobialOcean;
