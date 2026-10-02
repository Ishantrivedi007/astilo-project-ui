import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { searchSpecies } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const AbyssSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const activeQuery = searchParams.get("q") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "search", activeQuery],
    queryFn: () => searchSpecies(activeQuery, 20),
    enabled: activeQuery.trim().length > 0,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) setSearchParams({ q: trimmed });
  };

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Species Search</p>
        <h1 className="abyss-title">Find a species.</h1>
        <p className="abyss-tagline">
          Searches WoRMS, the World Register of Marine Species — Abyss's taxonomy authority.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <form className="abyss-search-form" onSubmit={submit} style={{ display: "flex", gap: "0.5rem", maxWidth: 640, margin: "2rem 0" }}>
          <input
            className="abyss-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scientific or common name, e.g. Octopus vulgaris"
            aria-label="Search marine species"
            style={{
              flex: 1,
              padding: "0.85rem 1.1rem",
              borderRadius: "0.85rem",
              border: "1px solid rgba(94, 234, 212, 0.25)",
              background: "rgba(6, 24, 28, 0.65)",
              color: "#e4f6f5",
              fontSize: "0.95rem",
            }}
          />
          <button type="submit" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }} aria-label="Search">
            <SearchIcon size={18} />
          </button>
        </form>
      </Reveal>

      {isLoading && (
        <p className="abyss-unavailable flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Searching WoRMS…
        </p>
      )}
      {isError && <p className="abyss-unavailable">Search failed — the backend or WoRMS may be unavailable.</p>}
      {data && data.data.results.length === 0 && <p className="abyss-unavailable">No species matched "{activeQuery}".</p>}

      <div className="grid gap-3">
        {data?.data.results.map((r) => (
          <Reveal key={r.aphiaId}>
            <button
              type="button"
              className="abyss-card text-left w-full"
              style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              onClick={() => navigate(`${AppRoute.abyssSpecies}/${r.aphiaId}`)}
            >
              <div style={{ width: 84, flexShrink: 0 }}>
                <AbyssSpeciesImage title={r.scientificName} height={84} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-1">
                  <AbyssSourceBadge source="WoRMS" />
                  <AbyssConfidenceBadge confidence="OBSERVED" />
                </div>
                <p className="text-base font-bold italic">{r.scientificName}</p>
                <p className="text-xs text-white/50">
                  {[r.kingdom, r.phylum, r.className, r.order, r.family, r.genus].filter(Boolean).join(" · ")}
                </p>
                {r.authority && <p className="text-xs text-white/40 mt-1">{r.authority}</p>}
              </div>
            </button>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default AbyssSearch;
