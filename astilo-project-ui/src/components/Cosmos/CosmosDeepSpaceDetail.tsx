import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchDeepSpaceProbe, fetchDeepSpaceProbeImages, type DeepSpaceImage } from "../../lib/cosmosApi";
import Chart from "../shared/Chart";
import CosmosField from "./CosmosField";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const CosmosDeepSpaceDetail = () => {
  const navigate = useNavigate();
  const { probeId } = useParams<{ probeId: string }>();
  const [imagesOpened, setImagesOpened] = useState(false);
  const [selected, setSelected] = useState<DeepSpaceImage | null>(null);

  const detailQuery = useQuery({
    queryKey: ["cosmos", "deep-space-probe", probeId],
    queryFn: () => fetchDeepSpaceProbe(probeId!),
    enabled: !!probeId,
    retry: false,
  });

  const imagesQuery = useQuery({
    queryKey: ["cosmos", "deep-space-images", probeId],
    queryFn: () => fetchDeepSpaceProbeImages(probeId!),
    enabled: !!probeId && imagesOpened,
    retry: false,
  });

  if (detailQuery.isLoading) {
    return (
      <div className="cosmos-page">
        <p className="text-sm text-white/60">Querying JPL Horizons and the science archives…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="cosmos-page">
        <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmosDeepSpace)}>
          <ArrowLeft size={12} /> Deep Space Probes
        </button>
        <p className="cosmos-unavailable">Couldn't load this probe right now.</p>
      </div>
    );
  }

  const { probe, position, science } = detailQuery.data.data;
  const pos = position.data;
  const sci = science.data;

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmosDeepSpace)}>
        <ArrowLeft size={12} /> Deep Space Probes
      </button>

      <p className="cosmos-eyebrow">✦ Deep Space</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        {probe.name}
      </h1>
      <p className="cosmos-tagline">{probe.status}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CosmosSourceBadge source="JPL Horizons" />
        <CosmosSourceBadge source={science.source} />
      </div>

      <h2 className="cosmos-section-title">Live position</h2>
      <dl className="cosmos-field-grid">
        <CosmosField label="Distance from Earth" value={pos ? pos.distanceAu.toFixed(3) : null} unit="AU" />
        <CosmosField label="Distance from Earth" value={pos ? (pos.distanceKm / 1e6).toFixed(1) : null} unit="million km" />
        <CosmosField label="Current speed" value={pos?.speedKmS.toFixed(2) ?? null} unit="km/s (relative to Earth)" />
        <CosmosField label="Radial velocity" value={pos?.radialVelocityKmS.toFixed(2) ?? null} unit="km/s" />
        <CosmosField label="One-way light time" value={pos ? (pos.lightTimeSeconds / 3600).toFixed(2) : null} unit="hours" />
        <CosmosField label="Position as of" value={pos?.timestamp ?? null} />
        <CosmosField label="Launch date" value={probe.launchDate} />
      </dl>
      <p className="mt-1 text-xs text-white/50">
        Real orbital-mechanics computation via JPL Horizons — not where the probe is pointing/aiming,
        which no public API exposes.
      </p>

      <h2 className="cosmos-section-title">Raw instrument science data</h2>
      {sci.available ? (
        <div className="cosmos-card">
          {sci.dataCoverageEnd && (
            <p className="text-xs text-white/50 mb-2">
              CDAWeb archive covers this instrument through <strong>{new Date(sci.dataCoverageEnd).toLocaleDateString()}</strong> —
              real telemetry, released in batches rather than streamed live.
              {sci.totalRecordsInWindow ? ` ${sci.totalRecordsInWindow} real records in the 48h window ending then.` : ""}
            </p>
          )}
          {sci.recentReadings && sci.recentReadings.length > 0 && sci.frequenciesHz && (
            <>
              <p className="text-xs text-white/50 mb-2">
                {sci.valueDescription?.replace(/^-+>\s*/, "") ?? "Electric field"} strength, measured in{" "}
                <strong>{sci.valueUnits ?? "unknown units"}</strong> (volts per meter — how strong the local
                electric field is at each frequency). This instrument samples {sci.frequenciesHz.length} frequency
                channels at once, from {sci.frequenciesHz[0]} Hz up to {sci.frequenciesHz[sci.frequenciesHz.length - 1].toLocaleString()} Hz,
                every ~16 seconds. Values are written in scientific notation — e.g. <code>1.80e-6</code> means
                1.80 × 10⁻⁶ {sci.valueUnits ?? ""} (0.0000018 {sci.valueUnits ?? ""}), since real field strengths here
                are extremely small.
              </p>
              <p className="text-xs text-white/50 mb-1">
                Latest reading ({new Date(sci.recentReadings[0].timestamp ?? "").toLocaleString()}):
              </p>
              <Chart
                type="line"
                height={200}
                series={[{
                  name: `Field strength (${sci.valueUnits ?? "V/m"})`,
                  data: sci.frequenciesHz.map((f, i) => ({ x: f, y: sci.recentReadings![0].values[i] })),
                }]}
                options={{
                  xaxis: { title: { text: "Frequency (Hz)" }, type: "numeric" },
                  yaxis: { title: { text: `Field strength (${sci.valueUnits ?? "V/m"})` } },
                }}
              />
              <p className="text-xs text-white/50 mt-3 mb-1">Previous readings in this window (newest first) — value per frequency channel:</p>
              <div className="cosmos-result-list">
                {sci.recentReadings.slice(1, 6).map((reading, i) => (
                  <div key={i} className="cosmos-card">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs text-white/40">{reading.timestamp ? new Date(reading.timestamp).toLocaleString() : "Unknown time"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-4">
                      {reading.values.map((v, j) => (
                        <p key={j} className="text-xs text-white/70">
                          <span className="text-white/40">{sci.frequenciesHz![j]} Hz:</span> {v.toExponential(2)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {sci.encounters && sci.encounters.length > 0 && (
            <>
              <p className="text-xs text-white/50 mb-2">
                New Horizons' SWAP (Solar Wind Around Pluto) instrument, across its real encounters —
                its archive runs on a multi-year release cycle, so these are real recorded readings, not
                current ones. Fields marked "N/A" units are raw instrument counts (uncalibrated telemetry),
                not a physical unit — shown honestly rather than converted to something not in the label.
              </p>
              {sci.encounters.map((enc, ei) => {
                const label = enc.collection.includes("pluto") ? "Pluto encounter (2015)" : "Arrokoth / KEM1 encounter (2019)";
                return (
                  <div key={enc.collection} className={ei > 0 ? "mt-4" : ""}>
                    <p className="text-xs font-semibold text-white/70 mb-1">
                      {label} — "{enc.tableName}" table
                    </p>
                    <p className="text-xs text-white/40 mb-2 break-all">{enc.productLid}</p>
                    <div className="cosmos-result-list">
                      {enc.rows.slice(0, 3).map((row, ri) => (
                        <div key={ri} className="cosmos-card">
                          <dl className="cosmos-field-grid">
                            {Object.entries(row).slice(0, 8).map(([key, value]) => {
                              const info = enc.fieldInfo[key];
                              return (
                                <CosmosField
                                  key={key}
                                  label={info ? info.description : key}
                                  value={value as string | number}
                                  unit={info?.units && info.units !== "N/A" ? info.units : undefined}
                                />
                              );
                            })}
                          </dl>
                        </div>
                      ))}
                    </div>
                    <a href={enc.labelUrl} target="_blank" rel="noreferrer" className="cosmos-chip mt-2 inline-flex items-center gap-1">
                      <ExternalLink size={12} /> View full PDS4 label
                    </a>
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : (
        <div className="cosmos-card">
          <p className="cosmos-unavailable">
            {sci.reason || "No science data available for this window right now."}
          </p>
          {sci.pdsSearchUrl && (
            <a href={sci.pdsSearchUrl} target="_blank" rel="noreferrer" className="cosmos-chip mt-2 inline-flex items-center gap-1">
              <ExternalLink size={12} /> Browse the PDS archive directly
            </a>
          )}
        </div>
      )}

      <h2 className="cosmos-section-title">Photos it actually took</h2>
      {!imagesOpened ? (
        <button type="button" className="cosmos-chip" onClick={() => setImagesOpened(true)}>
          Load images
        </button>
      ) : (
        <>
          {imagesQuery.isLoading && <p className="text-sm text-white/60">Decoding real imagery — can take a moment for full-resolution frames…</p>}
          {imagesQuery.isError && <p className="cosmos-unavailable">Couldn't load images right now.</p>}
          {imagesQuery.data && imagesQuery.data.data.results.length === 0 && (
            <p className="cosmos-unavailable">No images available right now.</p>
          )}
          <div className="cosmos-imagelab-grid">
            {imagesQuery.data?.data.results.map((img, i) => {
              const thumb = img.imagePngBase64 ?? img.imageUrl;
              return (
                <button key={img.productLid ?? img.opusId ?? i} type="button" className="cosmos-imagelab-thumb" onClick={() => setSelected(img)}>
                  {thumb ? <img src={thumb} alt={img.target ?? probe.name} loading="lazy" /> : <div className="cosmos-imagelab-noimg" />}
                  {img.target && <span className="cosmos-imagelab-caption">{img.target}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected && (
        <div className="cosmos-modal-overlay" onClick={() => setSelected(null)}>
          <div className="cosmos-imagelab-detail glass-card" onClick={(e) => e.stopPropagation()}>
            <img src={selected.imagePngBase64 ?? selected.imageUrl} alt={selected.target ?? probe.name} />
            <div className="cosmos-imagelab-detail-body">
              <CosmosSourceBadge source={selected.source} />
              <h3>{selected.target ?? "Unknown target"}</h3>
              <dl className="cosmos-field-grid">
                <CosmosField label="Observation time" value={selected.observationTime} />
                {selected.exposureMs !== undefined && <CosmosField label="Exposure" value={selected.exposureMs} unit="ms" />}
                {selected.exposureSeconds !== undefined && <CosmosField label="Exposure" value={selected.exposureSeconds} unit="s" />}
                {selected.stats && (
                  <>
                    <CosmosField label="Dimensions" value={`${selected.stats.width} × ${selected.stats.height} px`} />
                    <CosmosField
                      label="Pixel range"
                      value={selected.stats.min !== null ? `${selected.stats.min.toFixed(1)} – ${selected.stats.max?.toFixed(1)}` : null}
                    />
                  </>
                )}
              </dl>
              {selected.labelUrl && (
                <a href={selected.labelUrl} target="_blank" rel="noreferrer" className="cosmos-chip mt-3 inline-flex items-center gap-1">
                  <ExternalLink size={12} /> View full PDS4 label
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmosDeepSpaceDetail;
