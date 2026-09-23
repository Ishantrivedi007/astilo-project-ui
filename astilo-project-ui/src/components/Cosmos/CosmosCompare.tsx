import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import {
  fetchAsteroid,
  fetchComet,
  fetchGalaxy,
  fetchMoon,
  fetchNebula,
  fetchSpacecraft,
  fetchStar,
  isAmbiguousMatch,
  searchExoplanets,
  type AsteroidData,
  type ExoplanetData,
  type GalaxyData,
  type HorizonsVector,
  type StarData,
} from "../../lib/cosmosApi";
import "./Cosmos.scss";

type CompareType = "asteroid" | "exoplanet" | "star" | "galaxy" | "comet" | "nebula" | "moon" | "spacecraft";

const TYPE_LABEL: Record<CompareType, string> = {
  asteroid: "Asteroid",
  exoplanet: "Exoplanet",
  star: "Star",
  galaxy: "Galaxy",
  comet: "Comet",
  nebula: "Nebula",
  moon: "Moon",
  spacecraft: "Spacecraft",
};

const PLACEHOLDER_BY_TYPE: Record<CompareType, string> = {
  asteroid: "e.g. Apophis",
  exoplanet: "e.g. TRAPPIST-1 e",
  star: "e.g. Sirius",
  galaxy: "e.g. Andromeda Galaxy",
  comet: "e.g. 1P",
  nebula: "e.g. Orion Nebula",
  moon: "e.g. Europa",
  spacecraft: "e.g. Voyager 1",
};

/** Horizons returns raw ephemeris text, not structured physical
 * parameters — this derives real comparable fields from the actual
 * returned vector (distance from Sun, computed via Pythagorean magnitude
 * of the real x/y/z), rather than fabricating fields Horizons doesn't
 * provide. */
interface HorizonsSummary {
  name: string;
  distanceFromSunAu: number | null;
  resolvedAt: string | null;
}

function summarizeHorizonsResult(name: string, vectors: HorizonsVector[]): HorizonsSummary {
  const v = vectors[0];
  return {
    name,
    distanceFromSunAu: v ? Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) : null,
    resolvedAt: v ? String(v.jd) : null,
  };
}

const MOON_SPACECRAFT_FIELDS: FieldDef<HorizonsSummary>[] = [
  { label: "Distance from Sun", unit: "AU", get: (d) => d.distanceFromSunAu },
  { label: "Resolved at (Julian date)", get: (d) => d.resolvedAt },
];

/** Short window just to resolve one real ephemeris point for comparison —
 * same idea as CosmosSearch.tsx's HORIZONS_SEARCH_WINDOW, the full
 * trajectory lives in the Orbit Explorer. */
function horizonsCompareWindow() {
  const start = new Date().toISOString().slice(0, 10);
  const stop = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  return { start, stop };
}

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

const FIELD_SETS = {
  asteroid: ASTEROID_FIELDS,
  exoplanet: EXOPLANET_FIELDS,
  star: STAR_FIELDS,
  galaxy: GALAXY_FIELDS,
  comet: ASTEROID_FIELDS,
  nebula: GALAXY_FIELDS,
  moon: MOON_SPACECRAFT_FIELDS,
  spacecraft: MOON_SPACECRAFT_FIELDS,
};

function useSlot(type: CompareType) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useQuery({
    queryKey: ["cosmos", "compare", type, submitted],
    queryFn: async () => {
      if (type === "asteroid") return (await fetchAsteroid(submitted)).data;
      if (type === "comet") return (await fetchComet(submitted)).data;
      if (type === "star") return (await fetchStar(submitted)).data;
      if (type === "galaxy") return (await fetchGalaxy(submitted)).data;
      if (type === "nebula") return (await fetchNebula(submitted)).data;
      if (type === "moon" || type === "spacecraft") {
        const { start, stop } = horizonsCompareWindow();
        const res = type === "moon" ? await fetchMoon(submitted, start, stop) : await fetchSpacecraft(submitted, start, stop);
        if (isAmbiguousMatch(res)) throw new Error(`"${submitted}" matches more than one body — try a more specific name.`);
        return summarizeHorizonsResult(submitted, res.data.vectors ?? []);
      }
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
              placeholder={PLACEHOLDER_BY_TYPE[type]}
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
