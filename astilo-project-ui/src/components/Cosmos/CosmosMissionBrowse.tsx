import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { browseMission, fetchFitsImage, fetchSpectrum, saveCosmosItem, type ObservationData } from "../../lib/cosmosApi";
import Chart from "../shared/Chart";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

// These are the missions mast.py's own docstring documents as supported —
// real MAST obs_collection values, not an invented list. The input below
// still accepts any mission name; these are just starting-point chips.
const MISSION_EXAMPLES = ["JWST", "HST", "TESS", "KEPLER", "GALEX", "SPITZER"];

const CosmosMissionBrowse = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mission, setMission] = useState("");
  const [instrument, setInstrument] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitted, setSubmitted] = useState<{
    mission: string;
    instrument: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [selected, setSelected] = useState<ObservationData | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [showFitsImage, setShowFitsImage] = useState(false);

  const browseQuery = useQuery({
    queryKey: ["cosmos", "mission-browse", submitted],
    queryFn: () =>
      browseMission(
        submitted!.mission,
        40,
        submitted!.instrument || undefined,
        submitted!.startDate || undefined,
        submitted!.endDate || undefined
      ),
    enabled: !!submitted,
    retry: false,
  });

  const spectrumQuery = useQuery({
    queryKey: ["cosmos", "spectrum", selected?.obsid],
    queryFn: () => fetchSpectrum(selected!.obsid!),
    enabled: showSpectrum && !!selected?.obsid,
    retry: false,
  });

  const fitsImageQuery = useQuery({
    queryKey: ["cosmos", "fits-image", selected?.obsid],
    queryFn: () => fetchFitsImage(selected!.obsid!),
    enabled: showFitsImage && !!selected?.obsid,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission.trim()) return;
    setSubmitted({ mission: mission.trim(), instrument: instrument.trim(), startDate, endDate });
    setSelected(null);
  };

  const results = browseQuery.data?.data.results ?? [];

  const saveObservation = async (obs: ObservationData) => {
    const id = String(obs.obsid ?? obs.observationId);
    await saveCosmosItem({
      objectType: "observation",
      externalId: id,
      title: obs.target ?? obs.observationId ?? "Observation",
      source: "MAST",
      imageUrl: obs.previewImageUrl ?? undefined,
      data: obs,
    });
    setSavedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Observatories</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Browse a mission's latest observations
      </h1>
      <p className="cosmos-tagline">
        Pulls directly from MAST's Mast.Caom.Filtered service for a whole mission — no target name
        needed. Type any mission MAST recognizes; the chips below are just a starting point.
      </p>

      <form className="cosmos-search-form" onSubmit={submit}>
        <input
          className="cosmos-search-input"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="Mission — JWST, HST, TESS, KEPLER…"
        />
      </form>
      <div className="cosmos-search-examples">
        <span>Try:</span>
        {MISSION_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="cosmos-chip"
            onClick={() => {
              setMission(ex);
              setSubmitted({ mission: ex, instrument, startDate, endDate });
              setSelected(null);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="cosmos-orbit-dates mt-3">
        <input
          className="cosmos-search-input"
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          placeholder="Instrument (optional) — NIRCAM, WFC3/UVIS…"
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
        <button type="button" className="cosmos-chip" onClick={submit} disabled={!mission.trim()}>
          Apply filters
        </button>
      </div>

      {browseQuery.isLoading && <p className="mt-6 text-sm text-white/60">Querying MAST…</p>}
      {browseQuery.isError && (
        <p className="mt-6 cosmos-unavailable">Couldn't reach MAST for "{submitted?.mission}" — try again shortly.</p>
      )}
      {submitted && !browseQuery.isLoading && !browseQuery.isError && results.length === 0 && (
        <p className="mt-6 cosmos-unavailable">No observations found for mission "{submitted.mission}" with these filters.</p>
      )}

      <div className="cosmos-imagelab-grid">
        {results.map((obs, i) => (
          <button
            key={`${obs.obsid}-${i}`}
            type="button"
            className="cosmos-imagelab-thumb"
            onClick={() => {
              setSelected(obs);
              setShowSpectrum(false);
              setShowFitsImage(false);
            }}
          >
            {obs.previewImageUrl ? (
              <img src={obs.previewImageUrl} alt={obs.target ?? "Observation"} loading="lazy" />
            ) : (
              <div className="cosmos-imagelab-noimg" />
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="cosmos-modal-overlay" onClick={() => setSelected(null)}>
          <div className="cosmos-imagelab-detail glass-card" onClick={(e) => e.stopPropagation()}>
            {selected.previewImageUrl && <img src={selected.previewImageUrl} alt={selected.target ?? "Observation"} />}
            <div className="cosmos-imagelab-detail-body">
              <CosmosSourceBadge source="MAST" />
              <h3>{selected.target ?? "Unnamed target"}</h3>
              <dl className="cosmos-field-grid">
                <div className="cosmos-field">
                  <dt>Instrument</dt>
                  <dd className={selected.instrument ? "" : "cosmos-unavailable"}>{selected.instrument || "Data unavailable"}</dd>
                </div>
                <div className="cosmos-field">
                  <dt>Product type</dt>
                  <dd className={selected.productType ? "" : "cosmos-unavailable"}>{selected.productType || "Data unavailable"}</dd>
                </div>
                <div className="cosmos-field">
                  <dt>Observation date</dt>
                  <dd className={selected.observationDate ? "" : "cosmos-unavailable"}>{selected.observationDate ?? "Data unavailable"}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.previewImageUrl && (
                  <a href={selected.previewImageUrl} target="_blank" rel="noreferrer" className="cosmos-chip">
                    <ExternalLink size={12} /> Open full image
                  </a>
                )}
                {selected.productType === "spectrum" && selected.obsid && (
                  <button type="button" className="cosmos-chip" onClick={() => setShowSpectrum(true)}>
                    View spectrum
                  </button>
                )}
                {selected.productType === "image" && selected.obsid && (
                  <button type="button" className="cosmos-chip" onClick={() => setShowFitsImage(true)}>
                    View FITS image &amp; analysis
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    type="button"
                    className="cosmos-chip"
                    disabled={savedIds.has(String(selected.obsid ?? selected.observationId))}
                    onClick={() => saveObservation(selected)}
                  >
                    {savedIds.has(String(selected.obsid ?? selected.observationId)) ? "Saved to Library" : "Save to Library"}
                  </button>
                )}
              </div>

              {showSpectrum && (
                <div className="mt-4">
                  {spectrumQuery.isLoading && <p className="text-sm text-white/60">Downloading &amp; parsing FITS spectrum…</p>}
                  {spectrumQuery.isError && <p className="cosmos-unavailable">No spectrum data product available for this observation.</p>}
                  {spectrumQuery.data && (
                    <>
                      <CosmosSourceBadge source="MAST · real FITS spectrum" />
                      <div className="mt-2">
                        <Chart
                          type="line"
                          height={220}
                          series={[
                            {
                              name: `Flux (${spectrumQuery.data.data.fluxUnit ?? "unknown unit"})`,
                              data: spectrumQuery.data.data.wavelength.map((w, i) => ({
                                x: w ?? 0,
                                y: spectrumQuery.data!.data.flux[i],
                              })),
                            },
                          ]}
                          options={{
                            xaxis: { title: { text: `Wavelength (${spectrumQuery.data.data.wavelengthUnit ?? "unknown unit"})` }, type: "numeric" },
                            yaxis: { title: { text: "Flux" } },
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {showFitsImage && (
                <div className="mt-4">
                  {fitsImageQuery.isLoading && <p className="text-sm text-white/60">Downloading &amp; normalizing FITS image (can take a moment for large mosaics)…</p>}
                  {fitsImageQuery.isError && <p className="cosmos-unavailable">No image data product available for this observation.</p>}
                  {fitsImageQuery.data && (
                    <>
                      <CosmosSourceBadge source="MAST · real FITS image" />
                      <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                        <img src={fitsImageQuery.data.data.imagePngBase64} alt={selected.target ?? "FITS image"} className="w-full" />
                      </div>
                      <dl className="cosmos-field-grid mt-3">
                        <div className="cosmos-field">
                          <dt>Dimensions</dt>
                          <dd>{fitsImageQuery.data.data.stats.width} × {fitsImageQuery.data.data.stats.height} px</dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Pixel range</dt>
                          <dd className={fitsImageQuery.data.data.stats.min !== null ? "" : "cosmos-unavailable"}>
                            {fitsImageQuery.data.data.stats.min !== null
                              ? `${fitsImageQuery.data.data.stats.min.toFixed(2)} – ${fitsImageQuery.data.data.stats.max?.toFixed(2)}`
                              : "Data unavailable"}
                          </dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Mean · Std dev</dt>
                          <dd className={fitsImageQuery.data.data.stats.mean !== null ? "" : "cosmos-unavailable"}>
                            {fitsImageQuery.data.data.stats.mean !== null
                              ? `${fitsImageQuery.data.data.stats.mean.toFixed(3)} · ${fitsImageQuery.data.data.stats.std?.toFixed(3)}`
                              : "Data unavailable"}
                          </dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Filter</dt>
                          <dd className={fitsImageQuery.data.data.header.filter ? "" : "cosmos-unavailable"}>
                            {fitsImageQuery.data.data.header.filter || "Data unavailable"}
                          </dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Exposure time</dt>
                          <dd className={fitsImageQuery.data.data.header.exposureTime !== null ? "" : "cosmos-unavailable"}>
                            {fitsImageQuery.data.data.header.exposureTime !== null ? `${fitsImageQuery.data.data.header.exposureTime}s` : "Data unavailable"}
                          </dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Source file</dt>
                          <dd className={fitsImageQuery.data.data.productFilename ? "" : "cosmos-unavailable"}>
                            {fitsImageQuery.data.data.productFilename || "Data unavailable"}
                          </dd>
                        </div>
                      </dl>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmosMissionBrowse;
