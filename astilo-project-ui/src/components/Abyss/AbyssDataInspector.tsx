import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Workflow } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchGbifOccurrences, fetchSpeciesProfile, searchSpecies } from "../../lib/abyssApi";
import "./Abyss.scss";

type Tab = "normalized" | "worms" | "obis" | "gbif";

const AbyssDataInspector = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [aphiaId, setAphiaId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("normalized");

  const { data: searchResults } = useQuery({
    queryKey: ["abyss", "inspector-search", activeQuery],
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

  const { data: gbifEnv } = useQuery({
    queryKey: ["abyss", "gbif-occurrences", profile?.taxonomy.data.scientificName],
    queryFn: () => fetchGbifOccurrences(profile!.taxonomy.data.scientificName, 20),
    enabled: Boolean(profile) && tab === "gbif",
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
        <p className="abyss-eyebrow">~ Data Inspector</p>
        <h1 className="abyss-title">Astilo normalized record.</h1>
        <p className="abyss-tagline">
          See exactly what each provider returned, raw, next to Astilo's normalized version — for
          when you want to verify a fact against its original source.
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
            Inspect
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

      {profile && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              {(["normalized", "worms", "obis", "gbif"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="abyss-source-badge"
                  style={tab === t ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
                  onClick={() => setTab(t)}
                >
                  {t === "normalized" ? "Astilo Normalized" : t.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="abyss-source-badge"
              onClick={() => navigate(`${AppRoute.abyssProvenanceGraph}`)}
            >
              <Workflow size={11} /> View provenance graph
            </button>
          </div>

          <Reveal>
            <div className="abyss-card">
              {tab === "normalized" && (
                <pre style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", color: "rgba(228,246,245,0.8)", maxHeight: 500, overflow: "auto" }}>
                  {JSON.stringify(
                    {
                      taxonomy: profile.taxonomy.data,
                      classification: profile.classification.data,
                      distribution: profile.distribution.data,
                      occurrenceTotal: profile.occurrences.data.total,
                    },
                    null,
                    2,
                  )}
                </pre>
              )}
              {tab === "worms" && (
                <pre style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", color: "rgba(228,246,245,0.8)", maxHeight: 500, overflow: "auto" }}>
                  {JSON.stringify(profile.taxonomy.raw, null, 2)}
                </pre>
              )}
              {tab === "obis" && (
                <pre style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", color: "rgba(228,246,245,0.8)", maxHeight: 500, overflow: "auto" }}>
                  {JSON.stringify(profile.occurrences.raw, null, 2)}
                </pre>
              )}
              {tab === "gbif" && (
                <pre style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", color: "rgba(228,246,245,0.8)", maxHeight: 500, overflow: "auto" }}>
                  {gbifEnv ? JSON.stringify(gbifEnv.raw, null, 2) : "Loading GBIF data…"}
                </pre>
              )}
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
};

export default AbyssDataInspector;
