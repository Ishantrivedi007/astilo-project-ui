import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchDeepSpaceMonitor, type DeepSpaceMonitorFinding } from "../../lib/cosmosApi";

const POLL_MS = 120_000;

/** Real diff against each probe's latest archived science-data marker
 * (NASA CDAWeb for the Voyagers, NASA PDS for New Horizons) — not a live
 * telemetry simulation. Deep-space missions downlink and archive data in
 * batches (months for the Voyagers, years for New Horizons), so this
 * legitimately shows nothing new most sweeps. Same client-diffed poll
 * pattern as CosmosHubbleMonitor. */
const CosmosDeepSpaceMonitor = () => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<(DeepSpaceMonitorFinding & { detectedAt: string })[]>([]);
  const [sweepCount, setSweepCount] = useState(0);

  const monitorQuery = useQuery({
    queryKey: ["cosmos", "deep-space-monitor"],
    queryFn: () => fetchDeepSpaceMonitor(),
    refetchInterval: POLL_MS,
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

  const data = monitorQuery.data?.data;

  return (
    <div className="cosmos-card mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold inline-flex items-center gap-2">
          <Activity size={14} className={monitorQuery.isFetching ? "animate-pulse" : ""} />
          Live monitoring
        </h3>
        {data && <span className="cosmos-chip">Checked {data.probesChecked} probes</span>}
      </div>
      <p className="text-xs text-white/60">
        {data
          ? `Last checked ${new Date(data.checkedAt).toLocaleTimeString()}.`
          : "Checking probes…"}{" "}
        Diffs each probe's real archived science-data timestamp — CDAWeb for the Voyagers, PDS for New
        Horizons — against the last check. {sweepCount > 0 && `${sweepCount} sweep${sweepCount === 1 ? "" : "s"} so far this session.`}
      </p>

      {monitorQuery.isError && <p className="mt-2 cosmos-unavailable">Couldn't reach the monitor right now.</p>}

      {feed.length === 0 ? (
        <p className="mt-2 cosmos-unavailable">No new archived data detected yet this session.</p>
      ) : (
        <div className="cosmos-result-list mt-2">
          {feed.map((f, i) => (
            <button
              key={`${f.probeId}-${f.detectedAt}-${i}`}
              type="button"
              className="cosmos-card text-left w-full"
              onClick={() => navigate(`${AppRoute.cosmosDeepSpace}/${f.probeId}`)}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="cosmos-chip">{f.name}</span>
                <span className="text-xs text-white/40">detected {f.detectedAt}</span>
              </div>
              <p className="text-xs text-white/70">New archived data marker: {f.newDataMarker}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CosmosDeepSpaceMonitor;
