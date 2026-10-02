import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchHabitats } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const AbyssHabitats = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "habitats"],
    queryFn: () => fetchHabitats(),
    staleTime: Infinity,
    retry: false,
  });

  const active = data?.data.habitats.find((h) => h.id === activeId);

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Habitat Explorer</p>
        <h1 className="abyss-title">Where ocean life lives.</h1>
        <p className="abyss-tagline">Curated reference environments — real example species, real threats, real approximate ranges.</p>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-6">Loading…</p>}
      {isError && <p className="abyss-unavailable mt-6">Unavailable — backend may be offline.</p>}

      {!active && (
        <div className="abyss-nav-grid mt-6">
          {data?.data.habitats.map((h) => (
            <Reveal key={h.id}>
              <button type="button" className="abyss-nav-tile" onClick={() => setActiveId(h.id)}>
                <span>{h.label}</span>
              </button>
            </Reveal>
          ))}
        </div>
      )}

      {active && (
        <Reveal>
          <button type="button" className="abyss-source-badge mb-4" onClick={() => setActiveId(null)}>
            <ArrowLeft size={11} /> All habitats
          </button>
          <div className="abyss-card abyss-media-card">
            <AbyssSpeciesImage title={active.imageTopic} height={220} />
            <div>
              <h2 className="text-xl font-bold mb-2">{active.label}</h2>
              <p className="text-sm text-white/70 mb-3">{active.description}</p>
              <dl className="abyss-field-grid mb-3">
                <div className="abyss-field"><dt>Depth range</dt><dd>{active.depthRange}</dd></div>
                <div className="abyss-field"><dt>Temperature</dt><dd>{active.temperatureRange}</dd></div>
                <div className="abyss-field"><dt>Salinity</dt><dd>{active.salinityPsu}</dd></div>
              </dl>
              <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Threats</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {active.threats.map((t) => (
                  <span key={t} className="abyss-source-badge">{t}</span>
                ))}
              </div>
              <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Example species</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {active.exampleSpecies.map((s) => (
                  <button key={s} type="button" className="abyss-source-badge" onClick={() => navigate(`${AppRoute.abyssSearch}?q=${encodeURIComponent(s)}`)}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <AbyssSourceBadge source="Astilo curated reference" />
                <AbyssConfidenceBadge confidence="CURATED" />
              </div>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssHabitats;
