import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { saveCosmosItem, searchNasaImages, type NasaImageData } from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const EXAMPLES = ["Pillars of Creation", "black hole", "nebula", "Saturn", "Andromeda Galaxy", "supernova"];

const CosmosImageLab = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<NasaImageData | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const imagesQuery = useQuery({
    queryKey: ["cosmos", "image-lab", submitted],
    queryFn: () => searchNasaImages(submitted, 40),
    enabled: !!submitted,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
    setSelected(null);
  };

  const results = imagesQuery.data?.data.results ?? [];

  const saveImage = async (img: NasaImageData) => {
    await saveCosmosItem({
      objectType: "image",
      externalId: img.nasaId,
      title: img.title,
      source: "NASA Image and Video Library",
      sourceDataset: "search",
      imageUrl: img.previewUrl ?? undefined,
      data: img,
    });
    setSavedIds((prev) => new Set(prev).add(img.nasaId));
  };

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Image Lab</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Browse telescope &amp; mission imagery
      </h1>
      <p className="cosmos-tagline">
        Searches NASA's Image and Video Library directly — every saved image keeps its source,
        mission/center, and original credit rather than just the picture.
      </p>

      <form className="cosmos-search-form" onSubmit={submit}>
        <input
          className="cosmos-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search images — nebula, black hole, Mars, JWST…"
        />
      </form>
      <div className="cosmos-search-examples">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="cosmos-chip"
            onClick={() => {
              setQuery(ex);
              setSubmitted(ex);
              setSelected(null);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {imagesQuery.isLoading && <p className="mt-6 text-sm text-white/60">Searching…</p>}
      {submitted && !imagesQuery.isLoading && results.length === 0 && (
        <p className="mt-6 cosmos-unavailable">No images found for "{submitted}".</p>
      )}

      <div className="cosmos-imagelab-grid">
        {results.map((img) => (
          <button key={img.nasaId} type="button" className="cosmos-imagelab-thumb" onClick={() => setSelected(img)}>
            {img.previewUrl ? <img src={img.previewUrl} alt={img.title} loading="lazy" /> : <div className="cosmos-imagelab-noimg" />}
          </button>
        ))}
      </div>

      {selected && (
        <div className="cosmos-modal-overlay" onClick={() => setSelected(null)}>
          <div className="cosmos-imagelab-detail glass-card" onClick={(e) => e.stopPropagation()}>
            {selected.previewUrl && <img src={selected.previewUrl} alt={selected.title} />}
            <div className="cosmos-imagelab-detail-body">
              <CosmosSourceBadge source="NASA Image and Video Library" />
              <h3>{selected.title}</h3>
              {selected.description && <p>{selected.description}</p>}
              <dl className="cosmos-field-grid">
                <div className="cosmos-field">
                  <dt>Center</dt>
                  <dd className={selected.center ? "" : "cosmos-unavailable"}>{selected.center || "Data unavailable"}</dd>
                </div>
                <div className="cosmos-field">
                  <dt>Date created</dt>
                  <dd className={selected.dateCreated ? "" : "cosmos-unavailable"}>{selected.dateCreated || "Data unavailable"}</dd>
                </div>
                <div className="cosmos-field">
                  <dt>NASA ID</dt>
                  <dd>{selected.nasaId}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.previewUrl && (
                  <a href={selected.previewUrl} target="_blank" rel="noreferrer" className="cosmos-chip">
                    <ExternalLink size={12} /> Open full image
                  </a>
                )}
                {isAuthenticated && (
                  <button type="button" className="cosmos-chip" disabled={savedIds.has(selected.nasaId)} onClick={() => saveImage(selected)}>
                    {savedIds.has(selected.nasaId) ? "Saved to Library" : "Save to Library"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmosImageLab;
