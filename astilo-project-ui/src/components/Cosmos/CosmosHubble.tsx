import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { browseHubbleCatalog, type HubbleCatalogEntry } from "../../lib/cosmosApi";
import CosmosHubbleMonitor from "./CosmosHubbleMonitor";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "planet", label: "Planets" },
  { value: "moon", label: "Moons" },
  { value: "asteroid", label: "Asteroids" },
  { value: "comet", label: "Comets" },
  { value: "star", label: "Stars" },
  { value: "exoplanet", label: "Exoplanets" },
  { value: "nebula", label: "Nebulae" },
  { value: "galaxy", label: "Galaxies" },
  { value: "supernova", label: "Supernovae" },
  { value: "black_hole", label: "Black Holes" },
];

const CosmosHubble = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["cosmos", "hubble-catalog", category, submittedQuery],
    queryFn: () => browseHubbleCatalog(submittedQuery ? undefined : category ?? undefined, submittedQuery || undefined),
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const results: HubbleCatalogEntry[] = catalogQuery.data?.data.results ?? [];

  const openTarget = (entry: HubbleCatalogEntry) => {
    navigate(`${AppRoute.cosmosHubble}/${entry.category}/${encodeURIComponent(entry.targetId)}`);
  };

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Hubble</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Hubble research catalog
      </h1>
      <p className="cosmos-tagline">
        A curated set of well-known targets Hubble has observed, browsable by category — planets,
        moons, asteroids, comets, stars, exoplanets, nebulae, galaxies, supernovae, and black holes.
        Open any target for a full research page: FITS imagery, composition, distance from Earth,
        and classification, pulled live from MAST, SIMBAD, the NASA Exoplanet Archive, Gaia, JPL, and
        Wikipedia. Search for a name outside this list to look it up and classify it live via SIMBAD.
      </p>

      <CosmosHubbleMonitor />

      <form className="cosmos-search-form" onSubmit={submit}>
        <input
          className="cosmos-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any object by name — e.g. Betelgeuse, M87…"
        />
      </form>

      <div className="cosmos-search-examples">
        <span>Category:</span>
        <button
          type="button"
          className="cosmos-chip"
          style={{ opacity: !category ? 1 : 0.6 }}
          onClick={() => {
            setCategory(null);
            setQuery("");
            setSubmittedQuery("");
          }}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className="cosmos-chip"
            style={{ opacity: category === c.value ? 1 : 0.6 }}
            onClick={() => {
              setCategory(c.value);
              setQuery("");
              setSubmittedQuery("");
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {catalogQuery.isLoading && <p className="mt-6 text-sm text-white/60">Loading the Hubble catalog…</p>}
      {catalogQuery.isError && <p className="mt-6 cosmos-unavailable">Couldn't load the catalog right now — try again shortly.</p>}
      {catalogQuery.data && results.length === 0 && (
        <p className="mt-6 cosmos-unavailable">
          {submittedQuery ? `No object found matching "${submittedQuery}".` : "No targets in this category yet."}
        </p>
      )}

      <div className="cosmos-imagelab-grid">
        {results.map((entry) => (
          <button key={entry.targetId} type="button" className="cosmos-imagelab-thumb" onClick={() => openTarget(entry)}>
            {entry.thumbnailUrl ? (
              <img src={entry.thumbnailUrl} alt={entry.name} loading="lazy" />
            ) : (
              <div className="cosmos-imagelab-noimg" />
            )}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {results.map((entry) => (
            <button key={entry.targetId} type="button" className="cosmos-chip" onClick={() => openTarget(entry)}>
              {entry.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <CosmosSourceBadge source="Astilo Hubble Catalog · MAST · SIMBAD" />
        <p className="cosmos-unavailable mt-2" style={{ fontStyle: "normal" }}>
          This is a curated set of well-known Hubble-observed targets, not a live feed of where the
          telescope is currently pointed — Hubble doesn't publish real-time pointing data. Search any
          object name to look it up and classify it live via SIMBAD, even if it isn't in this list yet.
        </p>
      </div>
    </div>
  );
};

export default CosmosHubble;
