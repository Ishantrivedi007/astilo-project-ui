import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Navigation } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import {
  fetchSatellitePasses,
  fetchSatellitePosition,
  isAmbiguousMatch,
  searchSatellites,
  type AmbiguousMatch,
  type SatellitePass,
  type SatellitePositionData,
} from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

// CelesTrak's own published groups — clickable presets only, not a
// restriction; the group field itself is free text, and any group
// CelesTrak publishes (see celestrak.org/NORAD/elements/index.php) works.
const GROUP_EXAMPLES = ["stations", "active", "starlink", "weather", "gps-ops"];

const MAP_W = 400;
const MAP_H = 200;

const project = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * MAP_W,
  y: ((90 - lat) / 180) * MAP_H,
});

const CosmosSatelliteTracker = () => {
  const navigate = useNavigate();
  const [group, setGroup] = useState("stations");
  const [nameInput, setNameInput] = useState("ISS");
  const [tracked, setTracked] = useState("ISS");
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "denied" | "unsupported">("idle");
  const [observer, setObserver] = useState<{ lat: number; lon: number } | null>(null);

  const searchQuery = useQuery({
    queryKey: ["cosmos", "satellite-search", nameInput, group],
    queryFn: () => searchSatellites(nameInput, group),
    enabled: nameInput.trim().length > 1,
    retry: false,
  });

  const positionQuery = useQuery({
    queryKey: ["cosmos", "satellite", tracked, group],
    queryFn: () => fetchSatellitePosition(tracked, group),
    enabled: !!tracked,
    refetchInterval: 5000,
    retry: false,
  });

  const passesQuery = useQuery({
    queryKey: ["cosmos", "satellite-passes", tracked, group, observer?.lat, observer?.lon],
    queryFn: () => fetchSatellitePasses(tracked, group, observer!.lat, observer!.lon),
    enabled: !!observer,
    retry: false,
  });

  const findPasses = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoStatus("idle");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 15000 }
    );
  };

  const result = positionQuery.data?.data;
  const ambiguous: AmbiguousMatch | null = result && isAmbiguousMatch(result) ? result : null;
  const position = result && !isAmbiguousMatch(result) ? (result as SatellitePositionData) : null;

  useEffect(() => {
    if (!position) return;
    const point = project(position.latitude, position.longitude);
    setTrail((prev) => [...prev.slice(-29), point]);
  }, [position?.latitude, position?.longitude]);

  useEffect(() => {
    setTrail([]);
  }, [tracked, group]);

  const submitTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) setTracked(nameInput.trim());
  };

  const marker = position ? project(position.latitude, position.longitude) : null;

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Satellite Tracker</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Live satellite positions
      </h1>
      <p className="cosmos-tagline">
        Position is computed live from CelesTrak's continuously-updated orbital elements (SGP4
        propagation) — not a fixed satellite, any name in the selected group can be tracked.
      </p>

      <form className="cosmos-orbit-controls" onSubmit={submitTrack}>
        <div className="cosmos-orbit-dates">
          <input
            className="cosmos-search-input"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="CelesTrak group — stations, active, starlink…"
          />
        </div>
        <div className="cosmos-search-examples">
          <span>Try:</span>
          {GROUP_EXAMPLES.map((g) => (
            <button key={g} type="button" className={`cosmos-chip${group === g ? " cosmos-chip--active" : ""}`} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
        <div className="cosmos-orbit-dates">
          <input
            className="cosmos-search-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Satellite name — ISS, Starlink-1234…"
          />
          <button type="submit" className="cosmos-chip">
            Track
          </button>
        </div>
      </form>

      {nameInput.trim().length > 1 && searchQuery.data && searchQuery.data.results.length > 0 && nameInput !== tracked && (
        <div className="cosmos-search-examples">
          <span>Matches:</span>
          {searchQuery.data.results.slice(0, 8).map((s) => (
            <button key={s.name} type="button" className="cosmos-chip" onClick={() => { setNameInput(s.name); setTracked(s.name); }}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {positionQuery.isLoading && <p className="mt-4 text-sm text-white/60">Fetching live position…</p>}
      {positionQuery.isError && (
        <p className="mt-4 cosmos-unavailable">
          Couldn't reach CelesTrak for "{tracked}" — the tracker will keep retrying every 5s.
        </p>
      )}

      {ambiguous && (
        <div className="cosmos-card mt-4">
          <p className="mb-2 text-sm text-white/70">"{tracked}" matches more than one satellite — pick one:</p>
          <div className="flex flex-wrap gap-2">
            {ambiguous.candidates.map((c) => (
              <button key={c} type="button" className="cosmos-chip" onClick={() => { setNameInput(c); setTracked(c); }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {position && (
        <>
          <div className="mb-2 mt-4 flex flex-wrap items-center gap-2">
            <CosmosSourceBadge source="CelesTrak · SGP4" />
            <span className="cosmos-chip">{position.name}</span>
          </div>
          <div className="cosmos-orbit-canvas-wrap cosmos-satellite-canvas">
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="cosmos-orbit-canvas">
              {/* Lat/lon graticule as world-map reference — real geography (fixed
                  reference lines), not fabricated coastline data. */}
              {[-60, -30, 0, 30, 60].map((lat) => (
                <line key={`lat-${lat}`} x1={0} y1={project(lat, -180).y} x2={MAP_W} y2={project(lat, -180).y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
              ))}
              {[-120, -60, 0, 60, 120].map((lon) => (
                <line key={`lon-${lon}`} x1={project(0, lon).x} y1={0} x2={project(0, lon).x} y2={MAP_H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
              ))}
              <line x1={0} y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2} stroke="rgba(255,255,255,0.18)" strokeWidth={0.7} />

              {trail.length > 1 && (
                <polyline
                  points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}
              {marker && <circle cx={marker.x} cy={marker.y} r={2.5} fill="#f87171" />}
            </svg>
          </div>
          <dl className="cosmos-field-grid mt-3">
            <div className="cosmos-field">
              <dt>Latitude</dt>
              <dd>{position.latitude.toFixed(3)}°</dd>
            </div>
            <div className="cosmos-field">
              <dt>Longitude</dt>
              <dd>{position.longitude.toFixed(3)}°</dd>
            </div>
            <div className="cosmos-field">
              <dt>Altitude</dt>
              <dd>{position.altitudeKm.toFixed(1)} km</dd>
            </div>
            <div className="cosmos-field">
              <dt>As of</dt>
              <dd>{position.timestamp}</dd>
            </div>
          </dl>

          <h2 className="cosmos-section-title">Next visible passes</h2>
          <p className="text-xs text-white/50">
            Computed live from your real location via SGP4 propagation + topocentric elevation —
            no default/fallback location is ever used.
          </p>
          {!observer && (
            <button type="button" className="cosmos-chip mt-2" onClick={findPasses} disabled={geoStatus === "locating"}>
              <Navigation size={12} /> {geoStatus === "locating" ? "Locating…" : "Find next passes from my location"}
            </button>
          )}
          {geoStatus === "denied" && (
            <p className="mt-2 cosmos-unavailable">Location permission denied — enable it in your browser to see passes.</p>
          )}
          {geoStatus === "unsupported" && (
            <p className="mt-2 cosmos-unavailable">Geolocation isn't supported in this browser.</p>
          )}

          {observer && (
            <>
              <p className="mt-2 text-xs text-white/40">
                From {observer.lat.toFixed(3)}°, {observer.lon.toFixed(3)}°
                <button type="button" className="cosmos-chip ml-2" onClick={() => setObserver(null)}>
                  Change location
                </button>
              </p>
              {passesQuery.isLoading && <p className="mt-2 text-sm text-white/60">Computing passes…</p>}
              {passesQuery.isError && <p className="mt-2 cosmos-unavailable">Couldn't compute passes for "{tracked}".</p>}
              {passesQuery.data && passesQuery.data.passes.length === 0 && (
                <p className="mt-2 cosmos-unavailable">No passes above 10° elevation in the next 48 hours.</p>
              )}
              {passesQuery.data && passesQuery.data.passes.length > 0 && (
                <div className="cosmos-result-list mt-2">
                  {passesQuery.data.passes.map((p: SatellitePass, i: number) => (
                    <div key={i} className="cosmos-card">
                      <dl className="cosmos-field-grid">
                        <div className="cosmos-field">
                          <dt>Rise</dt>
                          <dd>{new Date(p.riseTime).toLocaleString()}</dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Max elevation</dt>
                          <dd>
                            {p.maxElevationDeg.toFixed(1)}° at {new Date(p.maxElevationTime).toLocaleTimeString()}
                          </dd>
                        </div>
                        <div className="cosmos-field">
                          <dt>Set</dt>
                          <dd className={p.setTime ? "" : "cosmos-unavailable"}>
                            {p.setTime ? new Date(p.setTime).toLocaleString() : "Still above horizon at search window end"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CosmosSatelliteTracker;
