import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchPaleoEras } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const AbyssPaleoOcean = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "paleo-ocean"],
    queryFn: () => fetchPaleoEras(),
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
        <p className="abyss-eyebrow">~ Paleo Ocean</p>
        <h1 className="abyss-title">541 million years of ocean life.</h1>
        <p className="abyss-tagline">
          A curated reference timeline, not a live dataset — every taxon named is a real,
          documented fossil group from the standard geologic timescale.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-6">
          <AbyssSourceBadge source="Astilo curated reference" />
          <AbyssConfidenceBadge confidence="CURATED" />
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Loading timeline…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}

      <div className="grid gap-3">
        {data?.data.eras.map((era) => (
          <Reveal key={era.id}>
            <div className="abyss-card abyss-media-card">
              <AbyssSpeciesImage title={era.illustrativeTaxon} height={160} />
              <div>
                <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                  <p className="text-lg font-bold">{era.label}</p>
                  <span className="abyss-unavailable">{era.myaRange} million years ago</span>
                </div>
                <p className="text-sm text-white/70 mb-3">{era.description}</p>
                <div className="flex flex-wrap gap-2">
                  {era.taxa.map((t) => (
                    <span key={t} className="abyss-source-badge">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default AbyssPaleoOcean;
