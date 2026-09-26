import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Satellite } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchHubbleMonitor, fetchHubblePosition, type HubbleMonitorFinding, type HubblePositionData } from "../../lib/cosmosApi";

const MONITOR_POLL_MS = 60_000;
const POSITION_POLL_MS = 20_000;
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** A live-updating dashboard feed for the Hubble tab, made of two genuinely
 * real (not simulated) live data sources:
 *
 * 1. A rotating diff against MAST's own observation counts for the curated
 *    catalog, polled every minute — reports a target as "new" only when
 *    MAST's archive count for it has actually grown.
 * 2. Hubble's real current orbital position (lat/lon/altitude), resolved
 *    as the NORAD-tracked satellite "HST" via CelesTrak TLE + SGP4 — the
 *    same mechanism CosmosSatelliteTracker uses for the ISS — polled every
 *    20s, with the distance moved computed client-side against the
 *    previous poll (real orbital velocity, ~7.6 km/s, so this is a
 *    genuinely large number every poll, not padding).
 *
 * Neither of these is "where the telescope is pointing" — no public API
 * exposes that. Follows the same client-diffed poll pattern as
 * CosmosSpaceWeatherAlerts. */
const CosmosHubbleMonitor = () => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<(HubbleMonitorFinding & { detectedAt: string })[]>([]);
  const [sweepCount, setSweepCount] = useState(0);
  const [lastMoveKm, setLastMoveKm] = useState<number | null>(null);
  const [lastMoveSeconds, setLastMoveSeconds] = useState<number | null>(null);
  const prevPosition = useRef<HubblePositionData | null>(null);

  const monitorQuery = useQuery({
    queryKey: ["cosmos", "hubble-monitor"],
    queryFn: () => fetchHubbleMonitor(12),
    refetchInterval: MONITOR_POLL_MS,
    retry: false,
  });

  const positionQuery = useQuery({
    queryKey: ["cosmos", "hubble-position"],
    queryFn: () => fetchHubblePosition(),
    refetchInterval: POSITION_POLL_MS,
    retry: false,
  });

  useEffect(() => {
    const data = monitorQuery.data?.data;
    if (!data) return;
    setSweepCount((n) => n + 1);
    if (data.findings.length === 0) return;
    const detectedAt = new Date().toLocaleTimeString();
    setFeed((prev) => [...data.findings.map((f) => ({ ...f, detectedAt })), ...prev].slice(0, 20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorQuery.data]);

  useEffect(() => {
    const pos = positionQuery.data?.data;
    if (!pos) return;
    const prev = prevPosition.current;
    if (prev) {
      const surfaceKm = haversineKm(prev.latitude, prev.longitude, pos.latitude, pos.longitude);
      const altDeltaKm = pos.altitudeKm - prev.altitudeKm;
      const totalKm = Math.sqrt(surfaceKm * surfaceKm + altDeltaKm * altDeltaKm);
      const seconds = (new Date(pos.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      setLastMoveKm(totalKm);
      setLastMoveSeconds(seconds);
    }
    prevPosition.current = pos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionQuery.data]);

  const data = monitorQuery.data?.data;
  const progressPct = data ? Math.min(100, Math.round((data.targetsEverChecked / data.totalTargetsInCatalog) * 100)) : 0;
  const pos = positionQuery.data?.data;
  const latestFinding = feed[0];

  return (
    <div className="cosmos-card mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold inline-flex items-center gap-2">
          <Activity size={14} className={monitorQuery.isFetching ? "animate-pulse" : ""} />
          Live monitoring
        </h3>
        {data && (
          <span className="cosmos-chip">
            Swept {data.targetsEverChecked}/{data.totalTargetsInCatalog} targets ({progressPct}%)
          </span>
        )}
      </div>

      {data && (
        <p className="text-xs text-white/60">
          Last checked {new Date(data.checkedAt).toLocaleTimeString()} — checked{" "}
          {data.checkedTargetIds.length} target{data.checkedTargetIds.length === 1 ? "" : "s"} this sweep.{" "}
          {latestFinding
            ? `Latest: ${latestFinding.name} (+${latestFinding.newObservations} new observation${latestFinding.newObservations === 1 ? "" : "s"}) at ${latestFinding.detectedAt}.`
            : "No new observations found yet this session."}
        </p>
      )}
      <p className="mt-1 text-xs text-white/50">
        Checks a rotating slice of the catalog against MAST's live observation counts every minute —
        a real diff against the archive, not a simulated feed. {sweepCount > 0 && `${sweepCount} sweep${sweepCount === 1 ? "" : "s"} so far this session.`}
      </p>

      {monitorQuery.isError && <p className="mt-2 cosmos-unavailable">Couldn't reach the monitor right now.</p>}

      <div className="cosmos-field-grid mt-3">
        <div className="cosmos-field">
          <dt>
            <Satellite size={11} className="inline mr-1" />
            Telescope position (live)
          </dt>
          <dd className={pos ? "" : "cosmos-unavailable"}>
            {pos ? `${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}°` : "Loading…"}
          </dd>
        </div>
        <div className="cosmos-field">
          <dt>Altitude</dt>
          <dd className={pos ? "" : "cosmos-unavailable"}>{pos ? `${pos.altitudeKm.toFixed(1)} km` : "Loading…"}</dd>
        </div>
        <div className="cosmos-field">
          <dt>Moved since last update</dt>
          <dd className={lastMoveKm !== null ? "" : "cosmos-unavailable"}>
            {lastMoveKm !== null && lastMoveSeconds !== null
              ? `${lastMoveKm.toFixed(0)} km in ${lastMoveSeconds.toFixed(0)}s (~${(lastMoveKm / (lastMoveSeconds || 1)).toFixed(2)} km/s)`
              : "Waiting for next poll…"}
          </dd>
        </div>
      </div>
      <p className="mt-1 text-xs text-white/50">
        Real orbital position — resolved as the NORAD-tracked satellite "HST" via live TLE + SGP4
        propagation, the same mechanism the Satellite Tracker uses for the ISS. This is where Hubble
        physically is in orbit, not where it's pointing — no public API exposes aiming direction.
      </p>

      {feed.length === 0 ? (
        <p className="mt-3 cosmos-unavailable">No new observations detected yet this session.</p>
      ) : (
        <div className="cosmos-result-list mt-3">
          {feed.map((f, i) => (
            <button
              key={`${f.targetId}-${f.detectedAt}-${i}`}
              type="button"
              className="cosmos-card text-left w-full"
              onClick={() => navigate(`${AppRoute.cosmosHubble}/${f.category}/${f.targetId}`)}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="cosmos-chip">{f.category.replace("_", " ")}</span>
                <span className="text-xs text-white/40">detected {f.detectedAt}</span>
              </div>
              <p className="text-sm font-bold">{f.name}</p>
              <p className="text-xs text-white/70">
                +{f.newObservations} new observation{f.newObservations === 1 ? "" : "s"} ({f.previousCount} → {f.currentCount})
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CosmosHubbleMonitor;
