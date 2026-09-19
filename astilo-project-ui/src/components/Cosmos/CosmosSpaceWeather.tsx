import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchSpaceWeather } from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const CosmosSpaceWeather = () => {
  const navigate = useNavigate();
  const startDate = isoDaysAgo(7);
  const endDate = isoDaysAgo(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cosmos", "space-weather", startDate, endDate],
    queryFn: () => fetchSpaceWeather(startDate, endDate),
    retry: false,
  });

  const results = data?.data.results ?? [];

  return (
    <div className="cosmos-page">
      <button
        type="button"
        className="cosmos-chip mb-4 inline-flex items-center gap-1"
        onClick={() => navigate(AppRoute.cosmos)}
      >
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ NASA DONKI</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Space weather
      </h1>
      <p className="cosmos-tagline">Solar flares, CMEs and geomagnetic storms from the last 7 days.</p>

      {isLoading && <p className="mt-6 text-sm text-white/60">Loading space weather…</p>}
      {isError && (
        <p className="mt-6 cosmos-unavailable">
          Space weather unavailable right now — NASA's demo API key is heavily rate-limited; see
          the README for adding your own NASA_API_KEY.
        </p>
      )}
      {data && results.length === 0 && (
        <p className="mt-6 cosmos-unavailable">No notable space weather events in the last 7 days.</p>
      )}

      <div className="cosmos-result-list mt-6">
        {results.map((event, i) => (
          <div key={i} className="cosmos-card">
            <div className="mb-2 flex items-center gap-2">
              <CosmosSourceBadge source="NASA DONKI" />
              <span className="cosmos-chip">{String(event.messageType ?? "Event")}</span>
            </div>
            <p className="text-xs text-white/40">{String(event.issueTime ?? "")}</p>
            <p className="mt-1 text-sm text-white/80">{String(event.body ?? "").slice(0, 280)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CosmosSpaceWeather;
