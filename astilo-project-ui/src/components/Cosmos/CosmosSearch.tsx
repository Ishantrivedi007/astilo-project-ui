import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookmarkPlus, Loader2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import {
  fetchAsteroid,
  fetchStar,
  saveCosmosItem,
  searchExoplanets,
  searchObservations,
  type AsteroidData,
  type ExoplanetData,
  type ObservationData,
  type StarData,
} from "../../lib/cosmosApi";
import CosmosField from "./CosmosField";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

type ResultGroup = "asteroid" | "exoplanet" | "star" | "observation";

const TYPE_LABELS: Record<ResultGroup, string> = {
  asteroid: "Asteroids & comets",
  exoplanet: "Exoplanets",
  star: "Stars",
  observation: "Telescope observations",
};

const SaveButton = ({
  objectType,
  externalId,
  title,
  source,
  sourceDataset,
  data,
}: {
  objectType: "asteroid" | "exoplanet" | "star" | "observation";
  externalId: string;
  title: string;
  source: string;
  sourceDataset?: string;
  data: unknown;
}) => {
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <button
      type="button"
      className="cosmos-chip"
      disabled={saving || saved}
      onClick={async () => {
        setSaving(true);
        try {
          await saveCosmosItem({ objectType, externalId, title, source, sourceDataset, data });
          setSaved(true);
        } finally {
          setSaving(false);
        }
      }}
    >
      <span className="inline-flex items-center gap-1">
        <BookmarkPlus size={12} />
        {saved ? "Saved" : saving ? "Saving…" : "Save"}
      </span>
    </button>
  );
};

const CosmosSearch = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const typeFilter = params.get("type") as ResultGroup | null;

  const showAsteroids = !typeFilter || typeFilter === "asteroid";
  const showExoplanets = !typeFilter || typeFilter === "exoplanet";
  const showStars = !typeFilter || typeFilter === "star";
  const showObservations = !typeFilter || typeFilter === "observation";

  const asteroidQuery = useQuery({
    queryKey: ["cosmos", "asteroid", q],
    queryFn: () => fetchAsteroid(q),
    enabled: showAsteroids && q.length > 1,
    retry: false,
  });

  const exoplanetQuery = useQuery({
    queryKey: ["cosmos", "exoplanet", q],
    queryFn: () => searchExoplanets({ name: q, limit: 10 }),
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
    queryFn: () => searchObservations(q, undefined, 10),
    enabled: showObservations && q.length > 1,
    retry: false,
  });

  const loading =
    asteroidQuery.isLoading || exoplanetQuery.isLoading || starQuery.isLoading || observationQuery.isLoading;

  const exoplanetResults = exoplanetQuery.data?.data.results ?? [];
  const observationResults = observationQuery.data?.data.results ?? [];

  const nothingFound = useMemo(() => {
    if (!q) return false;
    return (
      !loading &&
      !asteroidQuery.data &&
      exoplanetResults.length === 0 &&
      !starQuery.data &&
      observationResults.length === 0
    );
  }, [q, loading, asteroidQuery.data, exoplanetResults, starQuery.data, observationResults]);

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
        {q ? `Results for "${q}"` : typeFilter ? TYPE_LABELS[typeFilter] : "Search the universe"}
      </h1>

      {!q && (
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
            {observationResults.slice(0, 10).map((o, i) => (
              <ObservationCard key={`${o.observationId}-${i}`} data={o} />
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
    {data.previewImageUrl && (
      <img
        src={data.previewImageUrl}
        alt={data.target ?? "Observation preview"}
        loading="lazy"
        className="mt-3 max-h-40 rounded-lg object-cover"
      />
    )}
  </div>
);

export default CosmosSearch;
