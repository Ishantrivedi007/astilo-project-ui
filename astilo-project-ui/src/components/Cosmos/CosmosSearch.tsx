import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookmarkPlus, Loader2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import {
  fetchAsteroid,
  fetchGalaxy,
  fetchStar,
  saveCosmosItem,
  searchExoplanets,
  searchHighEnergyObservations,
  searchNasaImages,
  searchObservations,
  searchSupernovae,
  type AsteroidData,
  type CosmosObjectType,
  type ExoplanetData,
  type GalaxyData,
  type HighEnergyObservationRow,
  type NasaImageData,
  type ObservationData,
  type StarData,
  type SupernovaRemnantRow,
} from "../../lib/cosmosApi";
import CosmosField from "./CosmosField";
import CosmosImagePreview from "./CosmosImagePreview";
import CosmosSourceBadge from "./CosmosSourceBadge";
import ResearchButton from "./ResearchButton";
import AddToKanbanButton from "./AddToKanbanButton";
import VisualizeWorldButton from "./VisualizeWorldButton";
import "./Cosmos.scss";

type ResultGroup =
  | "asteroid"
  | "exoplanet"
  | "star"
  | "observation"
  | "image"
  | "high-energy"
  | "galaxy"
  | "supernova";

const TYPE_LABELS: Record<ResultGroup, string> = {
  asteroid: "Asteroids & comets",
  exoplanet: "Exoplanets",
  star: "Stars",
  observation: "Telescope observations",
  image: "NASA image & video library",
  "high-energy": "X-ray observations (HEASARC)",
  galaxy: "Galaxies",
  supernova: "Supernova remnants",
};

export const COLLECTIONS = [
  { value: "favorites", label: "Favorites" },
  { value: "research", label: "Research" },
  { value: "discoveries", label: "My Discoveries" },
  { value: "planets", label: "Planets" },
  { value: "exoplanets", label: "Exoplanets" },
  { value: "asteroids", label: "Asteroids" },
  { value: "telescope-images", label: "Telescope Images" },
] as const;

const SaveButton = ({
  objectType,
  externalId,
  title,
  source,
  sourceDataset,
  data,
}: {
  objectType: CosmosObjectType;
  externalId: string;
  title: string;
  source: string;
  sourceDataset?: string;
  data: unknown;
}) => {
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collection, setCollection] = useState<string>("favorites");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  if (!isAuthenticated) return null;

  const save = async (targetCollection: string) => {
    setCollection(targetCollection);
    setSaving(true);
    setOpen(false);
    try {
      await saveCosmosItem({ objectType, externalId, title, source, sourceDataset, data, collection: targetCollection });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <span className="cosmos-chip">
        <span className="inline-flex items-center gap-1">
          <BookmarkPlus size={12} />
          Saved to {COLLECTIONS.find((c) => c.value === collection)?.label ?? collection}
        </span>
      </span>
    );
  }

  const rect = anchorRef.current?.getBoundingClientRect();

  return (
    <span className="relative inline-block">
      <button
        ref={anchorRef}
        type="button"
        className="cosmos-chip"
        disabled={saving}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1">
          <BookmarkPlus size={12} />
          {saving ? "Saving…" : "Save"}
        </span>
      </button>
      {open &&
        createPortal(
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setOpen(false)} />
            <div
              className="cosmos-save-menu"
              style={{
                position: "fixed",
                top: rect ? Math.min(rect.bottom + 4, window.innerHeight - 180) : 60,
                left: rect ? rect.left : 60,
              }}
            >
              {COLLECTIONS.map((c) => (
                <button key={c.value} type="button" onClick={() => save(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </span>
  );
};

const DEFAULT_QUERY_BY_TYPE: Record<ResultGroup, string> = {
  asteroid: "Apophis",
  exoplanet: "TRAPPIST-1",
  star: "Sirius",
  observation: "M16",
  image: "nebula",
  "high-energy": "Cygnus X-1",
  galaxy: "Andromeda Galaxy",
  supernova: "Crab Nebula",
};

const CosmosSearch = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(params.get("q") ?? "");
  const typedQuery = params.get("q")?.trim() ?? "";
  const typeFilter = params.get("type") as ResultGroup | null;
  // A category tile (e.g. "Galaxies") links here with only ?type=, no
  // search term — fall back to a known-good example so the page shows real
  // data immediately instead of sitting blank until the user types something.
  const usingDefault = !typedQuery && !!typeFilter;
  const q = typedQuery || (typeFilter ? DEFAULT_QUERY_BY_TYPE[typeFilter] : "");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) setParams(typeFilter ? { q: trimmed, type: typeFilter } : { q: trimmed });
  };

  const showAsteroids = !typeFilter || typeFilter === "asteroid";
  const showExoplanets = !typeFilter || typeFilter === "exoplanet";
  const showStars = !typeFilter || typeFilter === "star";
  const showObservations = !typeFilter || typeFilter === "observation";
  const showImages = !typeFilter || typeFilter === "image";
  const showHighEnergy = !typeFilter || typeFilter === "high-energy";
  const showGalaxies = !typeFilter || typeFilter === "galaxy";
  const showSupernovae = !typeFilter || typeFilter === "supernova";

  const asteroidQuery = useQuery({
    queryKey: ["cosmos", "asteroid", q],
    queryFn: () => fetchAsteroid(q),
    enabled: showAsteroids && q.length > 1,
    retry: false,
  });

  const exoplanetQuery = useQuery({
    queryKey: ["cosmos", "exoplanet", q],
    queryFn: () => searchExoplanets({ name: q, limit: 24 }),
    enabled: showExoplanets && q.length > 1,
    retry: false,
  });

  const starQuery = useQuery({
    queryKey: ["cosmos", "star", q],
    queryFn: () => fetchStar(q),
    enabled: showStars && q.length > 1,
    retry: false,
  });

  const observationQuery = useQuery({
    queryKey: ["cosmos", "observation", q],
    queryFn: () => searchObservations(q, undefined, 24),
    enabled: showObservations && q.length > 1,
    retry: false,
  });

  const imageQuery = useQuery({
    queryKey: ["cosmos", "image", q],
    queryFn: () => searchNasaImages(q, 24),
    enabled: showImages && q.length > 1,
    retry: false,
  });

  const highEnergyQuery = useQuery({
    queryKey: ["cosmos", "high-energy", q],
    queryFn: () => searchHighEnergyObservations(q, "numaster", 24),
    enabled: showHighEnergy && q.length > 1,
    retry: false,
  });

  const galaxyQuery = useQuery({
    queryKey: ["cosmos", "galaxy", q],
    queryFn: () => fetchGalaxy(q),
    enabled: showGalaxies && q.length > 1,
    retry: false,
  });

  const supernovaQuery = useQuery({
    queryKey: ["cosmos", "supernova", q],
    queryFn: () => searchSupernovae(q, 24),
    enabled: showSupernovae && q.length > 1,
    retry: false,
  });

  const loading =
    asteroidQuery.isLoading ||
    exoplanetQuery.isLoading ||
    starQuery.isLoading ||
    observationQuery.isLoading ||
    imageQuery.isLoading ||
    highEnergyQuery.isLoading ||
    galaxyQuery.isLoading ||
    supernovaQuery.isLoading;

  const exoplanetResults = exoplanetQuery.data?.data.results ?? [];
  const observationResults = observationQuery.data?.data.results ?? [];
  const imageResults = imageQuery.data?.data.results ?? [];
  const highEnergyResults = highEnergyQuery.data?.data.results ?? [];
  const supernovaResults = supernovaQuery.data?.data.results ?? [];

  const nothingFound = useMemo(() => {
    if (!q) return false;
    return (
      !loading &&
      !asteroidQuery.data &&
      exoplanetResults.length === 0 &&
      !starQuery.data &&
      observationResults.length === 0 &&
      imageResults.length === 0 &&
      highEnergyResults.length === 0 &&
      !galaxyQuery.data &&
      supernovaResults.length === 0
    );
  }, [
    q,
    loading,
    asteroidQuery.data,
    exoplanetResults,
    starQuery.data,
    observationResults,
    imageResults,
    highEnergyResults,
    galaxyQuery.data,
    supernovaResults,
  ]);

  return (
    <div className="cosmos-page">
      <button
        type="button"
        className="cosmos-chip mb-4 inline-flex items-center gap-1"
        onClick={() => navigate(AppRoute.cosmos)}
      >
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Universal Cosmos search</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        {typeFilter ? TYPE_LABELS[typeFilter] : q ? `Results for "${q}"` : "Search the universe"}
      </h1>

      <form className="cosmos-search-form" onSubmit={submitSearch}>
        <input
          className="cosmos-search-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={typeFilter ? `Search within ${TYPE_LABELS[typeFilter].toLowerCase()}…` : "Search planets, stars, asteroids, exoplanets, missions…"}
          aria-label="Search the universe"
        />
      </form>

      {usingDefault && (
        <p className="cosmos-tagline">
          Showing an example ("{q}") — search above for a specific {TYPE_LABELS[typeFilter!].toLowerCase()}.
        </p>
      )}

      {!q && !typeFilter && (
        <p className="cosmos-tagline">
          Enter an object name from Cosmos Home to search across JPL, the NASA Exoplanet Archive,
          ESA Gaia, and MAST.
        </p>
      )}

      {loading && (
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-white/60">
          <Loader2 size={16} className="animate-spin" /> Querying live astronomy sources…
        </p>
      )}

      {nothingFound && (
        <p className="mt-6 cosmos-unavailable">
          No results found across JPL, the NASA Exoplanet Archive, Gaia, or MAST for "{q}".
        </p>
      )}

      {showAsteroids && asteroidQuery.data && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.asteroid}</h2>
          <AsteroidCard data={asteroidQuery.data.data} source={asteroidQuery.data.source} />
        </>
      )}

      {showExoplanets && exoplanetResults.length > 0 && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.exoplanet}</h2>
          <div className="cosmos-result-list">
            {exoplanetResults.map((p) => (
              <ExoplanetCard key={p.name} data={p} />
            ))}
          </div>
        </>
      )}

      {showStars && starQuery.data && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.star}</h2>
          <StarCard data={starQuery.data.data} source={starQuery.data.source} />
        </>
      )}

      {showObservations && observationResults.length > 0 && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.observation}</h2>
          <div className="cosmos-result-list">
            {observationResults.map((o, i) => (
              <ObservationCard key={`${o.observationId}-${i}`} data={o} />
            ))}
          </div>
        </>
      )}

      {showGalaxies && galaxyQuery.data && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.galaxy}</h2>
          <GalaxyCard data={galaxyQuery.data.data} source={galaxyQuery.data.source} />
        </>
      )}

      {showSupernovae && supernovaResults.length > 0 && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.supernova}</h2>
          <div className="cosmos-result-list">
            {supernovaResults.map((row, i) => (
              <SupernovaCard key={`${row.name}-${i}`} data={row} />
            ))}
          </div>
        </>
      )}

      {showHighEnergy && highEnergyResults.length > 0 && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS["high-energy"]}</h2>
          <p className="mb-2 text-xs text-white/40">
            NuSTAR pointed observations near {q} — X-ray sources (like black holes) have no
            optical image to search by, so these are mission observation logs, not photos.
          </p>
          <div className="cosmos-result-list">
            {highEnergyResults.map((row, i) => (
              <HighEnergyCard key={`${row.obsid}-${i}`} data={row} />
            ))}
          </div>
        </>
      )}

      {showImages && imageResults.length > 0 && (
        <>
          <h2 className="cosmos-section-title">{TYPE_LABELS.image}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {imageResults.map((img) => (
              <NasaImageCard key={img.nasaId} data={img} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AsteroidCard = ({ data, source }: { data: AsteroidData; source: string }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source={source} />
      {data.neo && <span className="cosmos-chip">NEO</span>}
      {data.potentiallyHazardous && <span className="cosmos-chip">Potentially hazardous</span>}
      <SaveButton
        objectType="asteroid"
        externalId={data.designation}
        title={data.name}
        source={source}
        sourceDataset="sbdb"
        data={data}
      />
      <ResearchButton objectType="asteroid" externalId={data.designation} title={data.name} source={source} sourceDataset="sbdb" data={data} />
      <AddToKanbanButton objectType="asteroid" title={data.name} source={source} sourceDataset="sbdb" />
    </div>
    <h3 className="mb-2 text-lg font-bold">{data.name}</h3>
    <dl className="cosmos-field-grid">
      <CosmosField label="Diameter" value={data.diameterKm} unit="km" />
      <CosmosField label="Absolute magnitude (H)" value={data.absoluteMagnitudeH} />
      <CosmosField label="Orbital period" value={data.orbitalPeriodDays} unit="days" />
      <CosmosField label="Semi-major axis" value={data.semiMajorAxisAu} unit="AU" />
      <CosmosField label="Eccentricity" value={data.eccentricity} />
      <CosmosField label="Inclination" value={data.inclinationDeg} unit="°" />
      <CosmosField label="Rotation period" value={data.rotationPeriodHours} unit="hr" />
      <CosmosField label="Albedo" value={data.albedo} />
    </dl>
    <CosmosImagePreview name={data.name} />
  </div>
);

const ExoplanetCard = ({ data }: { data: ExoplanetData }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source={data._provenance.source} />
      <SaveButton
        objectType="exoplanet"
        externalId={data.name}
        title={data.name}
        source={data._provenance.source}
        sourceDataset={data._provenance.sourceDataset}
        data={data}
      />
      <ResearchButton
        objectType="exoplanet"
        externalId={data.name}
        title={data.name}
        source={data._provenance.source}
        sourceDataset={data._provenance.sourceDataset}
        data={data}
      />
      <AddToKanbanButton
        objectType="exoplanet"
        title={data.name}
        source={data._provenance.source}
        sourceDataset={data._provenance.sourceDataset}
      />
      <VisualizeWorldButton
        name={data.name}
        equilibriumTemperatureK={data.equilibriumTemperatureK}
        radiusEarthRadii={data.radiusEarthRadii}
        massEarthMasses={data.massEarthMasses}
        hostStarTeffK={data.hostStarTeffK}
      />
    </div>
    <h3 className="mb-2 text-lg font-bold">{data.name}</h3>
    <p className="mb-2 text-sm text-white/60">Host star: {data.hostStar}</p>
    <dl className="cosmos-field-grid">
      <CosmosField label="Radius" value={data.radiusEarthRadii} unit="R⊕" />
      <CosmosField label="Mass" value={data.massEarthMasses} unit="M⊕" />
      <CosmosField label="Orbital period" value={data.orbitalPeriodDays} unit="days" />
      <CosmosField label="Semi-major axis" value={data.semiMajorAxisAu} unit="AU" />
      <CosmosField label="Eccentricity" value={data.eccentricity} />
      <CosmosField label="Equilibrium temp" value={data.equilibriumTemperatureK} unit="K" />
      <CosmosField label="Discovery method" value={data.discoveryMethod} />
      <CosmosField label="Discovery year" value={data.discoveryYear} />
      <CosmosField label="Host star Teff" value={data.hostStarTeffK} unit="K" />
      <CosmosField label="Distance" value={data.distanceParsecs} unit="pc" />
    </dl>
    <CosmosImagePreview name={data.hostStar} />
  </div>
);

const StarCard = ({ data, source }: { data: StarData; source: string }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source={source} />
      <SaveButton
        objectType="star"
        externalId={String(data.gaiaSourceId)}
        title={data.queriedName}
        source={source}
        sourceDataset="gaiadr3.gaia_source"
        data={data}
      />
      <ResearchButton
        objectType="star"
        externalId={String(data.gaiaSourceId)}
        title={data.queriedName}
        source={source}
        sourceDataset="gaiadr3.gaia_source"
        data={data}
      />
      <AddToKanbanButton objectType="star" title={data.queriedName} source={source} sourceDataset="gaiadr3.gaia_source" />
    </div>
    <h3 className="mb-2 text-lg font-bold">{data.queriedName}</h3>
    <dl className="cosmos-field-grid">
      <CosmosField label="Gaia G magnitude" value={data.gMagnitude} />
      <CosmosField label="Parallax" value={data.parallaxMas} unit="mas" />
      <CosmosField label="Proper motion (RA)" value={data.properMotionRaMasYr} unit="mas/yr" />
      <CosmosField label="Proper motion (Dec)" value={data.properMotionDecMasYr} unit="mas/yr" />
      <CosmosField label="Radial velocity" value={data.radialVelocityKmS} unit="km/s" />
      <CosmosField label="BP–RP color" value={data.bpRpColor} />
      <CosmosField label="Effective temperature" value={data.effectiveTempK} unit="K" />
    </dl>
    <CosmosImagePreview name={data.queriedName} />
  </div>
);

const ObservationCard = ({ data }: { data: ObservationData }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source="MAST" />
      {data.mission && <span className="cosmos-chip">{data.mission}</span>}
      <SaveButton
        objectType="observation"
        externalId={String(data.obsid ?? data.observationId)}
        title={data.target ?? data.observationId ?? "Observation"}
        source="MAST"
        data={data}
      />
    </div>
    <h3 className="mb-2 text-base font-bold">{data.target ?? "Unnamed target"}</h3>
    <dl className="cosmos-field-grid">
      <CosmosField label="Instrument" value={data.instrument} />
      <CosmosField label="Filters" value={data.filters} />
      <CosmosField label="Product type" value={data.productType} />
      <CosmosField label="RA" value={data.raDeg} unit="°" />
      <CosmosField label="Dec" value={data.decDeg} unit="°" />
    </dl>
    {data.previewImageUrl ? (
      <img
        src={data.previewImageUrl}
        alt={data.target ?? "Observation preview"}
        loading="lazy"
        className="mt-3 max-h-40 rounded-lg object-cover"
      />
    ) : (
      <p className="mt-3 cosmos-unavailable text-xs">
        No preview image in MAST's metadata for this observation.
      </p>
    )}
  </div>
);

/** SIMBAD's resolved common name (e.g. "Andromeda") is often just the
 * proper name without "Galaxy" — searching that alone on Wikipedia can
 * resolve to something else entirely (the mythological figure, for
 * Andromeda). Appending "Galaxy" when it's not already part of the name
 * disambiguates without guessing at anything not already known. */
const galaxyResearchTitle = (data: GalaxyData): string => {
  if (!data.commonName) return data.name;
  return /galaxy|nebula|cluster/i.test(data.commonName) ? data.commonName : `${data.commonName} Galaxy`;
};

const GalaxyCard = ({ data, source }: { data: GalaxyData; source: string }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source={source} />
      {data.objectType && <span className="cosmos-chip">{data.objectType}</span>}
      <SaveButton
        objectType="galaxy"
        externalId={data.name}
        title={galaxyResearchTitle(data)}
        source={source}
        sourceDataset="basic"
        data={data}
      />
      <ResearchButton objectType="galaxy" externalId={data.name} title={galaxyResearchTitle(data)} source={source} sourceDataset="basic" data={data} />
      <AddToKanbanButton objectType="galaxy" title={data.name} source={source} sourceDataset="basic" />
    </div>
    <h3 className="mb-2 text-lg font-bold">
      {data.name}
      {data.commonName && <span style={{ fontWeight: 400, opacity: 0.65 }}> — {data.commonName}</span>}
    </h3>
    <dl className="cosmos-field-grid">
      <CosmosField label="Morphological type" value={data.morphologicalType} />
      <CosmosField label="Redshift" value={data.redshift} />
      <CosmosField label="Angular size (major)" value={data.angularMajorAxisArcmin} unit="arcmin" />
      <CosmosField label="Angular size (minor)" value={data.angularMinorAxisArcmin} unit="arcmin" />
      <CosmosField label="RA" value={data.raDeg} unit="°" />
      <CosmosField label="Dec" value={data.decDeg} unit="°" />
    </dl>
    <CosmosImagePreview name={data.name} />
  </div>
);

const SupernovaCard = ({ data }: { data: SupernovaRemnantRow }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source="HEASARC · Green's SNR Catalog" />
      <SaveButton
        objectType="supernova"
        externalId={data.name}
        title={data.name}
        source="HEASARC"
        sourceDataset="Green's Supernova Remnant Catalog"
        data={data}
      />
      <ResearchButton
        objectType="supernova"
        externalId={data.name}
        title={data.name}
        source="HEASARC"
        sourceDataset="Green's Supernova Remnant Catalog"
        data={data}
      />
      <AddToKanbanButton
        objectType="supernova"
        title={data.name}
        source="HEASARC"
        sourceDataset="Green's Supernova Remnant Catalog"
      />
    </div>
    <h3 className="mb-2 text-base font-bold">{data.name}</h3>
    <dl className="cosmos-field-grid">
      <CosmosField label="Angular size (major)" value={data.major_diameter} unit="arcmin" />
      <CosmosField label="Angular size (minor)" value={data.minor_diameter} unit="arcmin" />
      <CosmosField label="Remnant type" value={data.type} />
      <CosmosField label="Flux at 1 GHz" value={data.flux_1_ghz} unit="mJy" />
      <CosmosField label="RA" value={data.ra} unit="°" />
      <CosmosField label="Dec" value={data.dec} unit="°" />
    </dl>
    <CosmosImagePreview name={data.name} />
  </div>
);

const HighEnergyCard = ({ data }: { data: HighEnergyObservationRow }) => (
  <div className="cosmos-card">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <CosmosSourceBadge source="HEASARC · NuSTAR" />
      <SaveButton
        objectType="observation"
        externalId={data.obsid}
        title={`${data.name} (${data.obsid})`}
        source="HEASARC"
        sourceDataset="NuSTAR Master Catalog"
        data={data}
      />
    </div>
    <h3 className="mb-2 text-base font-bold">{data.name}</h3>
    <dl className="cosmos-field-grid">
      <CosmosField label="Observation ID" value={data.obsid} />
      <CosmosField label="RA" value={data.ra} unit="°" />
      <CosmosField label="Dec" value={data.dec} unit="°" />
      <CosmosField label="Exposure (FPMA)" value={Math.round(data.exposure_a)} unit="s" />
      <CosmosField label="Start time (MJD)" value={data.time} />
    </dl>
  </div>
);

const NasaImageCard = ({ data }: { data: NasaImageData }) => (
  <div className="cosmos-card p-2">
    {data.previewUrl && (
      <img
        src={data.previewUrl}
        alt={data.title}
        loading="lazy"
        className="mb-2 aspect-square w-full rounded-lg object-cover"
      />
    )}
    <p className="line-clamp-2 text-xs font-semibold">{data.title}</p>
    <div className="mt-1 flex items-center justify-between">
      <CosmosSourceBadge source="NASA Images" />
      <SaveButton
        objectType="image"
        externalId={data.nasaId}
        title={data.title}
        source="NASA Image and Video Library"
        sourceDataset="search"
        data={data}
      />
    </div>
  </div>
);

export default CosmosSearch;
