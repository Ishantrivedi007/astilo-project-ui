import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchAnatomyDiagrams, fetchAnatomySpecies } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssMarineAnatomy = () => {
  const navigate = useNavigate();
  const [speciesId, setSpeciesId] = useState<string | null>(null);

  const { data: speciesEnv } = useQuery({
    queryKey: ["abyss", "anatomy-species"],
    queryFn: () => fetchAnatomySpecies(),
    staleTime: Infinity,
  });

  const { data: diagramsEnv, isLoading, isError } = useQuery({
    queryKey: ["abyss", "anatomy-diagrams", speciesId],
    queryFn: () => fetchAnatomyDiagrams(speciesId!),
    enabled: Boolean(speciesId),
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Marine Anatomy Explorer</p>
        <h1 className="abyss-title">Inside ocean animals.</h1>
        <p className="abyss-tagline">
          Real, individually license-checked diagrams from Wikimedia Commons — not procedural 3D
          models. Coverage varies by species; some systems have no verified diagram available.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap gap-2 mt-4 mb-6">
          {speciesEnv?.data.species.map((s) => (
            <button
              key={s.id}
              type="button"
              className="abyss-source-badge"
              style={speciesId === s.id ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              onClick={() => setSpeciesId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Reveal>

      {!speciesId && <p className="abyss-unavailable">Choose a species to see real anatomical diagrams.</p>}
      {isLoading && <p className="abyss-unavailable">Searching Wikimedia Commons and verifying licenses (first load can take a moment)…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}
      {diagramsEnv && diagramsEnv.data.diagrams.length === 0 && (
        <p className="abyss-unavailable">No verified open diagrams found for {diagramsEnv.data.speciesLabel}.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {diagramsEnv?.data.diagrams.map((d) => (
          <Reveal key={d.url}>
            <div className="abyss-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 160, background: "#fff" }}>
                <img src={d.url} alt={d.pageTitle} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ padding: "0.7rem 0.9rem" }}>
                <span className="abyss-source-badge mb-2">{d.system}</span>
                <p className="text-xs text-white/40 mt-2">
                  {d.artist ? `${d.artist} · ` : ""}
                  {d.license}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {diagramsEnv && (
        <div className="flex items-center gap-2 mt-4">
          <AbyssSourceBadge source="Wikimedia Commons" />
          <AbyssConfidenceBadge confidence="OBSERVED" />
        </div>
      )}
    </div>
  );
};

export default AbyssMarineAnatomy;
