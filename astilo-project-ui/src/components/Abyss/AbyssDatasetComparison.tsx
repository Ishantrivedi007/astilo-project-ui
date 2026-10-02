import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { compareDatasets } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssDatasetComparison = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("Octopus vulgaris");
  const [activeQuery, setActiveQuery] = useState("Octopus vulgaris");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "compare", activeQuery],
    queryFn: () => compareDatasets(activeQuery),
    enabled: activeQuery.trim().length > 0,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setActiveQuery(query.trim());
  };

  const result = data?.data;
  const maxTotal = result ? Math.max(result.obisTotal, result.gbifTotal, 1) : 1;

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Dataset Comparison</p>
        <h1 className="abyss-title">OBIS vs. GBIF.</h1>
        <p className="abyss-tagline">
          Two real, independently aggregated biodiversity databases rarely agree exactly. Neither
          is "wrong" — they draw from different contributing datasets.
        </p>
      </Reveal>

      <Reveal>
        <form onSubmit={submit} className="flex gap-2 mt-6 mb-6" style={{ maxWidth: 480 }}>
          <input
            className="abyss-search-input"
            style={{ flex: 1, padding: "0.7rem 1rem", borderRadius: "0.75rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.9rem" }}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scientific name, e.g. Octopus vulgaris"
          />
          <button type="submit" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }}>
            Compare
          </button>
        </form>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Querying both databases…</p>}
      {isError && <p className="abyss-unavailable">Comparison unavailable — backend may be offline.</p>}

      {result && (
        <Reveal>
          <div className="abyss-card">
            <p className="font-bold italic mb-4">{result.scientificName}</p>
            {[
              { label: "OBIS", total: result.obisTotal, note: null },
              { label: "GBIF", total: result.gbifTotal, note: result.gbifExcludedByLicense > 0 ? `${result.gbifExcludedByLicense} record(s) excluded by license policy` : null },
            ].map((row) => (
              <div key={row.label} className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <AbyssSourceBadge source={row.label} />
                  </span>
                  <span className="font-semibold">{row.total.toLocaleString()} records</span>
                </div>
                <div className="abyss-pop-bar-track">
                  <div className="abyss-pop-bar-fill abyss-pop-bar-fill--up" style={{ left: 0, width: `${(row.total / maxTotal) * 100}%` }} />
                </div>
                {row.note && <p className="abyss-unavailable mt-1">{row.note}</p>}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <AbyssConfidenceBadge confidence="OBSERVED" />
              <span className="abyss-unavailable">Both totals are live counts from each provider's own API.</span>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssDatasetComparison;
