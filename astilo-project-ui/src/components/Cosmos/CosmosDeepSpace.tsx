import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Rocket } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchDeepSpaceCatalog } from "../../lib/cosmosApi";
import CosmosDeepSpaceMonitor from "./CosmosDeepSpaceMonitor";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const CosmosDeepSpace = () => {
  const navigate = useNavigate();

  const catalogQuery = useQuery({
    queryKey: ["cosmos", "deep-space-catalog"],
    queryFn: () => fetchDeepSpaceCatalog(),
    refetchInterval: 60_000,
    retry: false,
  });

  const results = catalogQuery.data?.data.results ?? [];

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Deep Space Probes</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        The farthest active spacecraft
      </h1>
      <p className="cosmos-tagline">
        Voyager 1, Voyager 2, and New Horizons — real live distance and speed via JPL Horizons, plus
        real raw instrument science data from NASA's CDAWeb (Voyager Plasma Waves instrument) and NASA
        PDS (New Horizons SWAP instrument). This is real archived telemetry, not a live stream — deep
        space missions downlink and archive data in batches, and each reading says exactly how old it is.
      </p>

      <CosmosDeepSpaceMonitor />

      {catalogQuery.isLoading && <p className="mt-6 text-sm text-white/60">Querying JPL Horizons for live positions…</p>}
      {catalogQuery.isError && <p className="mt-6 cosmos-unavailable">Couldn't reach JPL Horizons right now — try again shortly.</p>}

      <div className="cosmos-result-list mt-3">
        {results.map((probe) => (
          <button
            key={probe.probeId}
            type="button"
            className="cosmos-card text-left w-full"
            onClick={() => navigate(`${AppRoute.cosmosDeepSpace}/${probe.probeId}`)}
          >
            <div className="mb-2 flex items-center gap-2">
              <Rocket size={16} />
              <h3 className="text-base font-bold">{probe.name}</h3>
            </div>
            <p className="text-xs text-white/50">{probe.status}</p>
            <dl className="cosmos-field-grid mt-2">
              <div className="cosmos-field">
                <dt>Distance from Earth</dt>
                <dd className={probe.distanceAu !== null ? "" : "cosmos-unavailable"}>
                  {probe.distanceAu !== null ? `${probe.distanceAu.toFixed(2)} AU` : "Data unavailable"}
                </dd>
              </div>
              <div className="cosmos-field">
                <dt>Current speed</dt>
                <dd className={probe.speedKmS !== null ? "" : "cosmos-unavailable"}>
                  {probe.speedKmS !== null ? `${probe.speedKmS.toFixed(2)} km/s` : "Data unavailable"}
                </dd>
              </div>
              <div className="cosmos-field">
                <dt>Launch date</dt>
                <dd>{probe.launchDate}</dd>
              </div>
            </dl>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <CosmosSourceBadge source="JPL Horizons · NASA CDAWeb · NASA PDS" />
      </div>
    </div>
  );
};

export default CosmosDeepSpace;
