import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookmarkPlus, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import {
  fetchFitsImage,
  fetchHubbleTarget,
  fetchSpectrum,
  saveCosmosItem,
  type ObservationData,
} from "../../lib/cosmosApi";
import Chart from "../shared/Chart";
import CosmosField from "./CosmosField";
import CosmosSourceBadge from "./CosmosSourceBadge";
import ResearchButton from "./ResearchButton";
import AddToKanbanButton from "./AddToKanbanButton";
import VisualizeWorldButton from "./VisualizeWorldButton";
import "./Cosmos.scss";

const CosmosHubbleDetail = () => {
  const navigate = useNavigate();
  const { targetId } = useParams<{ category: string; targetId: string }>();
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<ObservationData | null>(null);
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [showFitsImage, setShowFitsImage] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["cosmos", "hubble-target", targetId],
    queryFn: () => fetchHubbleTarget(targetId!),
    enabled: !!targetId,
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

  if (detailQuery.isLoading) {
    return (
      <div className="cosmos-page">
        <p className="text-sm text-white/60">Assembling the research page — MAST, SIMBAD, and more…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="cosmos-page">
        <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmosHubble)}>
          <ArrowLeft size={12} /> Hubble Catalog
        </button>
        <p className="cosmos-unavailable">Couldn't load a research page for this target.</p>
      </div>
    );
  }

  const { target, classification, distance, composition, physicalProperties, images, sourceEnvelopes } = detailQuery.data.data;

  const saveTarget = async () => {
    setSaving(true);
    try {
      await saveCosmosItem({
        objectType: "hubbleTarget",
        externalId: target.targetId,
        title: target.name,
        source: "Astilo Hubble Catalog",
        sourceDataset: target.category,
        imageUrl: images[0]?.previewImageUrl ?? undefined,
        data: detailQuery.data!.data,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmosHubble)}>
        <ArrowLeft size={12} /> Hubble Catalog
      </button>

      <p className="cosmos-eyebrow">✦ Hubble Research · {target.category.replace("_", " ")}</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        {target.name}
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {sourceEnvelopes.classification && <CosmosSourceBadge source="SIMBAD" />}
        {sourceEnvelopes.observations && <CosmosSourceBadge source="MAST" />}
        {sourceEnvelopes.composition && <CosmosSourceBadge source="Wikipedia" />}
        {sourceEnvelopes.exoplanet && <CosmosSourceBadge source="NASA Exoplanet Archive" />}
        {sourceEnvelopes.star && <CosmosSourceBadge source="ESA Gaia" />}
        {sourceEnvelopes.orbitalData && <CosmosSourceBadge source="JPL SBDB" />}
        {sourceEnvelopes.highEnergy && <CosmosSourceBadge source="HEASARC" />}
      </div>

      <h2 className="cosmos-section-title">Distance from Earth</h2>
      <dl className="cosmos-field-grid">
        <CosmosField label="Distance" value={distance.valueLy} unit="light-years" />
        <CosmosField label="Distance" value={distance.valuePc} unit="parsecs" />
        <CosmosField label="Method" value={distance.method} />
        <CosmosField label="Confidence" value={distance.confidence} />
      </dl>

      <h2 className="cosmos-section-title">Classification</h2>
      <dl className="cosmos-field-grid">
        <CosmosField label="Object type" value={classification.objectType} />
        <CosmosField label="Spectral type" value={classification.spectralType} />
        <CosmosField label="Morphological type" value={classification.morphologicalType} />
        <CosmosField label="Orbit class" value={classification.orbitClass} />
      </dl>

      {physicalProperties.exoplanet && (
        <>
          <h2 className="cosmos-section-title">Physical properties (exoplanet)</h2>
          <dl className="cosmos-field-grid">
            <CosmosField label="Radius" value={physicalProperties.exoplanet.radiusEarthRadii} unit="Earth radii" />
            <CosmosField label="Mass" value={physicalProperties.exoplanet.massEarthMasses} unit="Earth masses" />
            <CosmosField label="Equilibrium temperature" value={physicalProperties.exoplanet.equilibriumTemperatureK} unit="K" />
            <CosmosField label="Orbital period" value={physicalProperties.exoplanet.orbitalPeriodDays} unit="days" />
            <CosmosField label="Host star" value={physicalProperties.exoplanet.hostStar} />
            <CosmosField label="Host star spectral type" value={physicalProperties.exoplanet.hostStarSpectralType} />
          </dl>
        </>
      )}

      {physicalProperties.star && (
        <>
          <h2 className="cosmos-section-title">Physical properties (star)</h2>
          <dl className="cosmos-field-grid">
            <CosmosField label="Effective temperature" value={physicalProperties.star.effectiveTempK} unit="K" />
            <CosmosField label="G magnitude" value={physicalProperties.star.gMagnitude} />
            <CosmosField label="Radial velocity" value={physicalProperties.star.radialVelocityKmS} unit="km/s" />
          </dl>
        </>
      )}

      {physicalProperties.smallBody && (
        <>
          <h2 className="cosmos-section-title">Physical properties (small body)</h2>
          <dl className="cosmos-field-grid">
            <CosmosField label="Diameter" value={physicalProperties.smallBody.diameterKm} unit="km" />
            <CosmosField label="Rotation period" value={physicalProperties.smallBody.rotationPeriodHours} unit="hours" />
            <CosmosField label="Albedo" value={physicalProperties.smallBody.albedo} />
            <CosmosField label="Orbital period" value={physicalProperties.smallBody.orbitalPeriodDays} unit="days" />
          </dl>
        </>
      )}

      <h2 className="cosmos-section-title">Composition &amp; overview</h2>
      {composition.extract ? (
        <div className="cosmos-card">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            {composition.articleImages[0] && (
              <img
                src={composition.articleImages[0].url}
                alt={target.name}
                loading="lazy"
                className="h-full w-full rounded-lg object-cover"
                style={{ maxHeight: 160 }}
              />
            )}
            <p className="text-sm text-white/80">{composition.detailedExtract || composition.extract}</p>
          </div>
          {composition.pageUrl && (
            <a href={composition.pageUrl} target="_blank" rel="noreferrer" className="cosmos-chip mt-3 inline-flex items-center gap-1">
              <ExternalLink size={12} /> Full article
            </a>
          )}
        </div>
      ) : (
        <p className="cosmos-unavailable">No composition summary available for this target.</p>
      )}

      <h2 className="cosmos-section-title">Hubble imagery</h2>
      {images.length === 0 && <p className="cosmos-unavailable">No Hubble observations found for this target.</p>}
      <div className="cosmos-imagelab-grid">
        {images.map((obs, i) => (
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
              <img src={obs.previewImageUrl} alt={obs.target ?? target.name} loading="lazy" />
            ) : (
              <div className="cosmos-imagelab-noimg" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {isAuthenticated && (
          <button type="button" className="cosmos-chip inline-flex items-center gap-1" disabled={saving || saved} onClick={saveTarget}>
            <BookmarkPlus size={12} />
            {saved ? "Saved to Library" : saving ? "Saving…" : "Save to Library"}
          </button>
        )}
        <ResearchButton
          objectType="hubbleTarget"
          externalId={target.targetId}
          title={target.name}
          source="Astilo Hubble Catalog"
          sourceDataset={target.category}
          data={detailQuery.data.data}
        />
        <AddToKanbanButton objectType="hubbleTarget" title={target.name} source="Astilo Hubble Catalog" sourceDataset={target.category} />
        {target.category === "exoplanet" && physicalProperties.exoplanet && (
          <VisualizeWorldButton
            name={target.name}
            equilibriumTemperatureK={physicalProperties.exoplanet.equilibriumTemperatureK}
            radiusEarthRadii={physicalProperties.exoplanet.radiusEarthRadii}
            massEarthMasses={physicalProperties.exoplanet.massEarthMasses}
            hostStarTeffK={physicalProperties.exoplanet.hostStarTeffK}
          />
        )}
      </div>

      {selected && (
        <div className="cosmos-modal-overlay" onClick={() => setSelected(null)}>
          <div className="cosmos-imagelab-detail glass-card" onClick={(e) => e.stopPropagation()}>
            {selected.previewImageUrl && <img src={selected.previewImageUrl} alt={selected.target ?? target.name} />}
            <div className="cosmos-imagelab-detail-body">
              <CosmosSourceBadge source="MAST" />
              <h3>{selected.target ?? target.name}</h3>
              <dl className="cosmos-field-grid">
                <CosmosField label="Instrument" value={selected.instrument} />
                <CosmosField label="Product type" value={selected.productType} />
                <CosmosField label="Observation date" value={selected.observationDate} />
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
                  {fitsImageQuery.isLoading && <p className="text-sm text-white/60">Downloading &amp; normalizing FITS image (can take a moment)…</p>}
                  {fitsImageQuery.isError && <p className="cosmos-unavailable">No image data product available for this observation.</p>}
                  {fitsImageQuery.data && (
                    <>
                      <CosmosSourceBadge source="MAST · real FITS image" />
                      <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                        <img src={fitsImageQuery.data.data.imagePngBase64} alt={selected.target ?? target.name} className="w-full" />
                      </div>
                      <dl className="cosmos-field-grid mt-3">
                        <CosmosField label="Dimensions" value={`${fitsImageQuery.data.data.stats.width} × ${fitsImageQuery.data.data.stats.height} px`} />
                        <CosmosField
                          label="Pixel range"
                          value={
                            fitsImageQuery.data.data.stats.min !== null
                              ? `${fitsImageQuery.data.data.stats.min.toFixed(2)} – ${fitsImageQuery.data.data.stats.max?.toFixed(2)}`
                              : null
                          }
                        />
                        <CosmosField label="Filter" value={fitsImageQuery.data.data.header.filter} />
                        <CosmosField
                          label="Exposure time"
                          value={fitsImageQuery.data.data.header.exposureTime !== null ? `${fitsImageQuery.data.data.header.exposureTime}s` : null}
                        />
                        <CosmosField label="Source file" value={fitsImageQuery.data.data.productFilename} />
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

export default CosmosHubbleDetail;
