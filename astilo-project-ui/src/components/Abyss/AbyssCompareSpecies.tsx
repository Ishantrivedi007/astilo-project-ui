import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchSpeciesProfile, searchSpecies, type SpeciesProfileData } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const SpeciesPicker = ({ label, onPick }: { label: string; onPick: (aphiaId: number) => void }) => {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const { data } = useQuery({
    queryKey: ["abyss", "compare-search", activeQuery],
    queryFn: () => searchSpecies(activeQuery, 5),
    enabled: activeQuery.trim().length > 0,
    retry: false,
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setActiveQuery(query.trim());
        }}
        className="flex gap-2 mb-2"
      >
        <input
          className="abyss-search-input"
          style={{ flex: 1, padding: "0.6rem 0.9rem", borderRadius: "0.7rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.85rem" }}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={label}
        />
      </form>
      <div className="grid gap-2">
        {data?.data.results.map((r) => (
          <button key={r.aphiaId} type="button" className="abyss-card text-left w-full" onClick={() => onPick(r.aphiaId)}>
            <span className="italic">{r.scientificName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ROWS: { label: string; get: (p: SpeciesProfileData) => React.ReactNode }[] = [
  { label: "Scientific name", get: (p) => <span className="italic">{p.taxonomy.data.scientificName}</span> },
  { label: "Kingdom", get: (p) => p.taxonomy.data.kingdom },
  { label: "Phylum", get: (p) => p.taxonomy.data.phylum },
  { label: "Class", get: (p) => p.taxonomy.data.className },
  { label: "Family", get: (p) => p.taxonomy.data.family },
  { label: "Status", get: (p) => p.taxonomy.data.status },
  { label: "OBIS occurrence records", get: (p) => p.occurrences.data.total.toLocaleString() },
];

const AbyssCompareSpecies = () => {
  const navigate = useNavigate();
  const [aphiaIdA, setAphiaIdA] = useState<number | null>(null);
  const [aphiaIdB, setAphiaIdB] = useState<number | null>(null);

  const { data: profileA } = useQuery({
    queryKey: ["abyss", "species", aphiaIdA],
    queryFn: () => fetchSpeciesProfile(aphiaIdA!),
    enabled: aphiaIdA !== null,
    retry: false,
  });
  const { data: profileB } = useQuery({
    queryKey: ["abyss", "species", aphiaIdB],
    queryFn: () => fetchSpeciesProfile(aphiaIdB!),
    enabled: aphiaIdB !== null,
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Compare Species</p>
        <h1 className="abyss-title">Side by side.</h1>
        <p className="abyss-tagline">Real factual attributes, no arbitrary "winner".</p>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <SpeciesPicker label="First species, e.g. Octopus vulgaris" onPick={setAphiaIdA} />
        <SpeciesPicker label="Second species, e.g. Architeuthis dux" onPick={setAphiaIdB} />
      </div>

      {profileA && profileB && (
        <Reveal>
          <div className="abyss-card abyss-table-wrap mt-6">
            <table className="abyss-table">
              <thead>
                <tr>
                  <th></th>
                  <th>
                    <AbyssSpeciesImage title={profileA.taxonomy.data.scientificName} height={100} />
                  </th>
                  <th>
                    <AbyssSpeciesImage title={profileB.taxonomy.data.scientificName} height={100} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{row.get(profileA)}</td>
                    <td>{row.get(profileB)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <AbyssSourceBadge source="WoRMS + OBIS" />
            <AbyssConfidenceBadge confidence="OBSERVED" />
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssCompareSpecies;
