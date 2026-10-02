import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchHydrothermalVents } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const AbyssHydrothermalVents = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "hydrothermal-vents"],
    queryFn: () => fetchHydrothermalVents(),
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
        <p className="abyss-eyebrow">~ Hydrothermal Vent Explorer</p>
        <h1 className="abyss-title">Life without sunlight.</h1>
        <p className="abyss-tagline">How ecosystems function entirely independent of the sun.</p>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-6">Loading…</p>}
      {isError && <p className="abyss-unavailable mt-6">Unavailable — backend may be offline.</p>}

      {data && (
        <>
          <Reveal>
            <div className="abyss-card abyss-media-card mt-6">
              <AbyssSpeciesImage title="Hydrothermal vent" height={220} />
              <div>
                <p className="text-lg font-bold mb-2">Chemosynthesis</p>
                <p className="text-sm text-white/70">{data.data.chemosynthesisExplainer}</p>
              </div>
            </div>
          </Reveal>

          <p className="abyss-section-title">Vent features</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.data.features.map((f) => (
              <Reveal key={f.id}>
                <div className="abyss-card">
                  <p className="font-bold mb-1">{f.label}</p>
                  <p className="text-sm text-white/70">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="abyss-section-title">Real vent organisms</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.data.organisms.map((o) => (
              <Reveal key={o.scientificName}>
                <div className="abyss-card" style={{ padding: 0, overflow: "hidden" }}>
                  <AbyssSpeciesImage title={o.commonName} height={130} rounded={false} />
                  <div style={{ padding: "0.9rem 1rem" }}>
                    <p className="font-bold italic">{o.scientificName}</p>
                    <p className="text-xs text-white/50 mb-2">{o.commonName}</p>
                    <p className="text-xs text-white/60">{o.note}</p>
                  </div>
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

export default AbyssHydrothermalVents;
