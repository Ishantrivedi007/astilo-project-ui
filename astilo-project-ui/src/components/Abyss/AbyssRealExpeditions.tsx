import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchRealExpeditions } from "../../lib/abyssApi";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssRealExpeditions = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "real-expeditions"],
    queryFn: () => fetchRealExpeditions(),
    staleTime: Infinity,
    retry: false,
  });

  const programs = data?.data.programs.filter((p) => !activeCategory || p.categories.includes(activeCategory)) ?? [];

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Real Expedition Explorer</p>
        <h1 className="abyss-title">Who's exploring right now.</h1>
        <p className="abyss-tagline">
          Real, currently active ocean exploration programs — not Astilo's own missions. Every link
          goes to the operator's own site.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-4">
          <AbyssConfidenceBadge confidence="CURATED" />
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" className="abyss-source-badge" style={!activeCategory ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined} onClick={() => setActiveCategory(null)}>
            All
          </button>
          {data?.data.categories.map((c) => (
            <button key={c} type="button" className="abyss-source-badge" style={activeCategory === c ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined} onClick={() => setActiveCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Loading…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}

      <div className="grid gap-3">
        {programs.map((p) => (
          <Reveal key={p.id}>
            <a href={p.url} target="_blank" rel="noreferrer" className="abyss-card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <p className="font-bold">{p.name}</p>
                <ExternalLink size={14} className="text-white/40" />
              </div>
              <p className="text-xs text-white/40 mb-2">{p.operator}</p>
              <p className="text-sm text-white/70 mb-3">{p.description}</p>
              <div className="flex flex-wrap gap-2">
                {p.categories.map((c) => (
                  <span key={c} className="abyss-source-badge">{c}</span>
                ))}
              </div>
            </a>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default AbyssRealExpeditions;
