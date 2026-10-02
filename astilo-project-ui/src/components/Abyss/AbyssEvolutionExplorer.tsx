import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchEvolutionRelatives, fetchDivergence, fetchSpeciesProfile, searchSpecies } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssEvolutionExplorer = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [aphiaId, setAphiaId] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState(false);
  const [selectedSibling, setSelectedSibling] = useState<string | null>(null);

  const { data: searchResults } = useQuery({
    queryKey: ["abyss", "evo-search", activeQuery],
    queryFn: () => searchSpecies(activeQuery, 5),
    enabled: activeQuery.trim().length > 0 && !aphiaId,
    retry: false,
  });

  const { data: profile } = useQuery({
    queryKey: ["abyss", "species", aphiaId],
    queryFn: () => fetchSpeciesProfile(aphiaId!),
    enabled: aphiaId !== null,
    retry: false,
  });

  const lineage = profile?.classification.data.lineage ?? [];
  const parentNode = lineage.length >= 2 ? lineage[lineage.length - 2] : null;

  const { data: relatives } = useQuery({
    queryKey: ["abyss", "evo-relatives", parentNode?.aphiaId],
    queryFn: () => fetchEvolutionRelatives(parentNode!.aphiaId!),
    enabled: Boolean(parentNode?.aphiaId),
    retry: false,
  });

  const ownClade = lineage[lineage.length - 1]?.scientificName;
  const { data: divergence } = useQuery({
    queryKey: ["abyss", "divergence", ownClade, selectedSibling],
    queryFn: () => fetchDivergence(ownClade!, selectedSibling!),
    enabled: timeMode && Boolean(ownClade) && Boolean(selectedSibling),
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAphiaId(null);
    setActiveQuery(query.trim());
  };

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Evolution Explorer</p>
        <h1 className="abyss-title">Real evolutionary relatives.</h1>
        <p className="abyss-tagline">
          Pick a species to see its real taxonomic relatives from WoRMS. Divergence dates are shown
          only where Astilo has a curated, published estimate — never invented.
        </p>
      </Reveal>

      <Reveal>
        <form onSubmit={submit} className="flex gap-2 mt-6 mb-4" style={{ maxWidth: 480 }}>
          <input
            className="abyss-search-input"
            style={{ flex: 1, padding: "0.7rem 1rem", borderRadius: "0.75rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.9rem" }}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scientific name, e.g. Octopus vulgaris"
          />
          <button type="submit" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }}>
            Explore
          </button>
        </form>
      </Reveal>

      {!aphiaId && searchResults && searchResults.data.results.length > 0 && (
        <div className="grid gap-2 mb-6">
          {searchResults.data.results.map((r) => (
            <Reveal key={r.aphiaId}>
              <button type="button" className="abyss-card text-left w-full" onClick={() => setAphiaId(r.aphiaId)}>
                <span className="italic font-semibold">{r.scientificName}</span>
              </button>
            </Reveal>
          ))}
        </div>
      )}

      {profile && parentNode && (
        <>
          <Reveal>
            <button
              type="button"
              className="abyss-source-badge mb-4"
              style={timeMode ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              onClick={() => setTimeMode((t) => !t)}
            >
              <Clock size={11} /> TIME MODE
            </button>
          </Reveal>

          <Reveal>
            <div className="abyss-card">
              <p className="text-sm text-white/60 mb-3">
                Relatives sharing the parent clade <span className="italic font-semibold text-white">{parentNode.scientificName}</span> ({parentNode.rank}):
              </p>
              <div className="flex flex-wrap gap-2">
                {relatives?.data.results.map((rel) => (
                  <button
                    key={rel.aphiaId}
                    type="button"
                    className="abyss-source-badge"
                    style={selectedSibling === rel.scientificName ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
                    onClick={() => (rel.rank === "Species" ? navigate(`${AppRoute.abyssSpecies}/${rel.aphiaId}`) : setSelectedSibling(rel.scientificName))}
                  >
                    {rel.scientificName}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <AbyssSourceBadge source="WoRMS" />
                <AbyssConfidenceBadge confidence="OBSERVED" />
              </div>
            </div>
          </Reveal>

          {timeMode && selectedSibling && divergence && (
            <Reveal>
              <div className="abyss-card mt-4">
                <p className="text-sm font-semibold mb-1">
                  {ownClade} vs. {selectedSibling}
                </p>
                {divergence.data.myaRange ? (
                  <>
                    <p className="text-2xl font-bold mb-1">{divergence.data.myaRange}</p>
                    <p className="text-xs text-white/60 mb-2">{divergence.data.note}</p>
                    <AbyssConfidenceBadge confidence="CURATED" />
                  </>
                ) : (
                  <>
                    <p className="abyss-unavailable mb-2">{divergence.data.note}</p>
                    <AbyssConfidenceBadge confidence="UNKNOWN" />
                  </>
                )}
              </div>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
};

export default AbyssEvolutionExplorer;
