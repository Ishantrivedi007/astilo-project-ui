import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchProvenanceGraph, searchSpecies } from "../../lib/abyssApi";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssProvenanceGraph = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [aphiaId, setAphiaId] = useState<number | null>(null);

  const { data: searchResults } = useQuery({
    queryKey: ["abyss", "provenance-search", activeQuery],
    queryFn: () => searchSpecies(activeQuery, 5),
    enabled: activeQuery.trim().length > 0 && !aphiaId,
    retry: false,
  });

  const { data: graphEnv, isLoading, isError } = useQuery({
    queryKey: ["abyss", "provenance", aphiaId],
    queryFn: () => fetchProvenanceGraph(aphiaId!),
    enabled: aphiaId !== null,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAphiaId(null);
    setActiveQuery(query.trim());
  };

  const root = graphEnv?.data.nodes.find((n) => n.kind === "species");
  const branches = graphEnv?.data.nodes.filter((n) => n.kind === "dataset") ?? [];

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Scientific Provenance Graph</p>
        <h1 className="abyss-title">Where did this come from?</h1>
        <p className="abyss-tagline">Every fact on a species page traces back to a real dataset, institution and citation.</p>
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
            Trace
          </button>
        </form>
      </Reveal>

      {!aphiaId && searchResults && searchResults.data.results.length > 0 && (
        <div className="grid gap-2 mb-6">
          {searchResults.data.results.map((r) => (
            <Reveal key={r.aphiaId}>
              <button type="button" className="abyss-card text-left w-full" onClick={() => setAphiaId(r.aphiaId)}>
                <span className="italic font-semibold">{r.scientificName}</span>
                {r.authority && <span className="text-xs text-white/40 ml-2">{r.authority}</span>}
              </button>
            </Reveal>
          ))}
        </div>
      )}

      {isLoading && <p className="abyss-unavailable">Building provenance graph…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}

      {root && (
        <div className="abyss-provenance-tree">
          <div className="abyss-provenance-root">{root.label}</div>
          <div className="abyss-provenance-branches">
            {branches.map((node) => (
              <Reveal key={node.id}>
                <div className="abyss-provenance-node">
                  <p className="font-bold text-sm mb-1">{node.label}</p>
                  <div className="flex items-center gap-2 mb-2">
                    {node.confidence && <AbyssConfidenceBadge confidence={node.confidence} />}
                  </div>
                  <p className="text-xs text-white/50 mb-1">{node.source} · {node.sourceDataset}</p>
                  {node.license && <p className="text-xs text-white/40 mb-2">License: {node.license}</p>}
                  <div className="flex gap-2">
                    {node.citationUrl && (
                      <a href={node.citationUrl} target="_blank" rel="noreferrer" className="abyss-source-badge" style={{ fontSize: "0.6rem" }}>
                        Source <ExternalLink size={10} />
                      </a>
                    )}
                    {node.termsUrl && (
                      <a href={node.termsUrl} target="_blank" rel="noreferrer" className="abyss-source-badge" style={{ fontSize: "0.6rem" }}>
                        Terms <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AbyssProvenanceGraph;
