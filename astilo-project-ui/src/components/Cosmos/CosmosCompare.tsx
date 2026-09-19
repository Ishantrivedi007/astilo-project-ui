import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import {
  fetchAsteroid,
  fetchGalaxy,
  fetchStar,
  searchExoplanets,
  type AsteroidData,
  type ExoplanetData,
  type GalaxyData,
  type StarData,
} from "../../lib/cosmosApi";
import "./Cosmos.scss";

type CompareType = "asteroid" | "exoplanet" | "star" | "galaxy";

const TYPE_LABEL: Record<CompareType, string> = {
  asteroid: "Asteroid / comet",
  exoplanet: "Exoplanet",
  star: "Star",
  galaxy: "Galaxy",
};

interface FieldDef<T> {
  label: string;
  unit?: string;
  get: (d: T) => string | number | null | undefined;
}

const ASTEROID_FIELDS: FieldDef<AsteroidData>[] = [
  { label: "Diameter", unit: "km", get: (d) => d.diameterKm },
  { label: "Absolute magnitude (H)", get: (d) => d.absoluteMagnitudeH },
  { label: "Orbital period", unit: "days", get: (d) => d.orbitalPeriodDays },
  { label: "Semi-major axis", unit: "AU", get: (d) => d.semiMajorAxisAu },
  { label: "Eccentricity", get: (d) => d.eccentricity },
  { label: "Inclination", unit: "°", get: (d) => d.inclinationDeg },
  { label: "Rotation period", unit: "hr", get: (d) => d.rotationPeriodHours },
  { label: "Albedo", get: (d) => d.albedo },
  { label: "Potentially hazardous", get: (d) => (d.potentiallyHazardous == null ? null : d.potentiallyHazardous ? "Yes" : "No") },
];

const EXOPLANET_FIELDS: FieldDef<ExoplanetData>[] = [
  { label: "Host star", get: (d) => d.hostStar },
  { label: "Radius", unit: "R⊕", get: (d) => d.radiusEarthRadii },
  { label: "Mass", unit: "M⊕", get: (d) => d.massEarthMasses },
  { label: "Orbital period", unit: "days", get: (d) => d.orbitalPeriodDays },
  { label: "Semi-major axis", unit: "AU", get: (d) => d.semiMajorAxisAu },
  { label: "Eccentricity", get: (d) => d.eccentricity },
  { label: "Equilibrium temperature", unit: "K", get: (d) => d.equilibriumTemperatureK },
  { label: "Discovery method", get: (d) => d.discoveryMethod },
  { label: "Discovery year", get: (d) => d.discoveryYear },
  { label: "Distance", unit: "pc", get: (d) => d.distanceParsecs },
];

const STAR_FIELDS: FieldDef<StarData>[] = [
  { label: "Gaia G magnitude", get: (d) => d.gMagnitude },
  { label: "Parallax", unit: "mas", get: (d) => d.parallaxMas },
  { label: "Proper motion (RA)", unit: "mas/yr", get: (d) => d.properMotionRaMasYr },
  { label: "Proper motion (Dec)", unit: "mas/yr", get: (d) => d.properMotionDecMasYr },
  { label: "Radial velocity", unit: "km/s", get: (d) => d.radialVelocityKmS },
  { label: "BP–RP color", get: (d) => d.bpRpColor },
  { label: "Effective temperature", unit: "K", get: (d) => d.effectiveTempK },
];

const GALAXY_FIELDS: FieldDef<GalaxyData>[] = [
  { label: "Object type", get: (d) => d.objectType },
  { label: "Morphological type", get: (d) => d.morphologicalType },
  { label: "Redshift", get: (d) => d.redshift },
  { label: "Angular size (major)", unit: "arcmin", get: (d) => d.angularMajorAxisArcmin },
  { label: "Angular size (minor)", unit: "arcmin", get: (d) => d.angularMinorAxisArcmin },
];

const FIELD_SETS = { asteroid: ASTEROID_FIELDS, exoplanet: EXOPLANET_FIELDS, star: STAR_FIELDS, galaxy: GALAXY_FIELDS };

function useSlot(type: CompareType) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useQuery({
    queryKey: ["cosmos", "compare", type, submitted],
    queryFn: async () => {
      if (type === "asteroid") return (await fetchAsteroid(submitted)).data;
      if (type === "star") return (await fetchStar(submitted)).data;
      if (type === "galaxy") return (await fetchGalaxy(submitted)).data;
      const res = await searchExoplanets({ name: submitted, limit: 1 });
      return res.data.results[0] ?? null;
    },
    enabled: !!submitted,
    retry: false,
  });

  return { query, setQuery, submit: () => setSubmitted(query.trim()), result };
}

const CosmosCompare = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<CompareType>("exoplanet");
  const left = useSlot(type);
  const right = useSlot(type);

  const fields = FIELD_SETS[type] as FieldDef<unknown>[];
  const nameOf = (d: unknown) => (d as { name?: string; queriedName?: string })?.name ?? (d as { queriedName?: string })?.queriedName ?? "";

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Compare</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Compare two objects
      </h1>
      <p className="cosmos-tagline">Side by side — missing values show clearly as unavailable, never guessed.</p>

      <div className="cosmos-search-examples" style={{ margin: "1rem 0" }}>
        {(Object.keys(TYPE_LABEL) as CompareType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`cosmos-chip ${type === t ? "cosmos-chip--active" : ""}`}
            onClick={() => setType(t)}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="cosmos-compare-inputs">
        {[left, right].map((slot, i) => (
          <form
            key={i}
            onSubmit={(e) => {
              e.preventDefault();
              slot.submit();
            }}
          >
            <input
              className="cosmos-search-input"
              value={slot.query}
              onChange={(e) => slot.setQuery(e.target.value)}
              placeholder={type === "asteroid" ? "e.g. Apophis" : type === "exoplanet" ? "e.g. TRAPPIST-1 e" : type === "star" ? "e.g. Sirius" : "e.g. Andromeda Galaxy"}
            />
          </form>
        ))}
      </div>

      {(left.result.isError || right.result.isError) && (
        <p className="mt-3 cosmos-unavailable">Couldn't find one of those objects — check the spelling.</p>
      )}

      {(left.result.data || right.result.data) && (
        <div className="cosmos-compare-table-wrap">
          <table className="cosmos-compare-table">
            <thead>
              <tr>
                <th></th>
                <th>{left.result.data ? nameOf(left.result.data) : "—"}</th>
                <th>
                  <ArrowLeftRight size={13} />
                </th>
                <th>{right.result.data ? nameOf(right.result.data) : "—"}</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => {
                const lv = left.result.data ? f.get(left.result.data) : undefined;
                const rv = right.result.data ? f.get(right.result.data) : undefined;
                return (
                  <tr key={f.label}>
                    <th>{f.label}</th>
                    <td className={lv == null || lv === "" ? "cosmos-unavailable" : ""}>
                      {lv == null || lv === "" ? "Data unavailable" : `${lv}${f.unit ? ` ${f.unit}` : ""}`}
                    </td>
                    <td></td>
                    <td className={rv == null || rv === "" ? "cosmos-unavailable" : ""}>
                      {rv == null || rv === "" ? "Data unavailable" : `${rv}${f.unit ? ` ${f.unit}` : ""}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CosmosCompare;
