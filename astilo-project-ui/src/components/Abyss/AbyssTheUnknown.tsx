import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchTheUnknown } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssTheUnknown = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "the-unknown"],
    queryFn: () => fetchTheUnknown(),
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
        <p className="abyss-eyebrow">~ The Unknown</p>
        <h1 className="abyss-title">What we don't know.</h1>
        <p className="abyss-tagline">
          Far more interesting than pretending the ocean has been fully catalogued — these are real
          gaps in what science has observed.
        </p>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-6">Gathering real data on sampling gaps (this can take a moment)…</p>}
      {isError && <p className="abyss-unavailable mt-6">Unavailable — backend may be offline.</p>}

      {data && (
        <>
          <p className="abyss-section-title">Poorly sampled regions</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.data.poorlySampledRegions.map((r) => (
              <Reveal key={r.id}>
                <div className="abyss-card">
                  <p className="font-bold text-sm">{r.label}</p>
                  <p className="abyss-unavailable">{r.records?.toLocaleString() ?? "—"} real OBIS records</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="abyss-section-title">Rarely observed species</p>
          <div className="grid gap-2">
            {data.data.rarelyObservedSpecies.map((s) => (
              <Reveal key={s.scientificName}>
                <div className="abyss-card flex items-center justify-between">
                  <div>
                    <p className="font-bold italic">{s.scientificName}</p>
                    <p className="text-xs text-white/50">{s.commonName}</p>
                  </div>
                  <span className="abyss-source-badge">{s.obisRecordCount ?? "?"} OBIS records</span>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <AbyssSourceBadge source="OBIS (live counts)" />
            <AbyssConfidenceBadge confidence="OBSERVED" />
          </div>

          <p className="abyss-section-title">Unresolved taxonomy</p>
          <div className="grid gap-3">
            {data.data.unresolvedTaxonomyExamples.map((u) => (
              <Reveal key={u.topic}>
                <div className="abyss-card">
                  <p className="font-bold mb-1">{u.topic}</p>
                  <p className="text-sm text-white/70">{u.note}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="abyss-section-title">Open scientific questions</p>
          <ul className="grid gap-2">
            {data.data.scientificQuestions.map((q) => (
              <li key={q} className="abyss-card text-sm text-white/70">{q}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default AbyssTheUnknown;
