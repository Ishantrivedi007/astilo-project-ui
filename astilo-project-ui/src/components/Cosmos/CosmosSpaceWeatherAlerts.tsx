import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";

import { fetchSpaceWeatherPulse, type SpaceWeatherEvent } from "../../lib/cosmosApi";

const SEEN_KEY = "astilo.cosmos.spaceWeatherAlerts.seen";
const POLL_MS = 5 * 60_000;

const eventKey = (e: SpaceWeatherEvent) => `${e.messageType ?? ""}|${e.issueTime ?? ""}`;

const readSeen = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const writeSeen = (keys: Set<string>) => {
  try {
    // Keep the stored set bounded — only the most recent 200 keys matter.
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(keys).slice(-200)));
  } catch {
    /* localStorage unavailable — alerts just won't persist dismissal, not fatal */
  }
};

/** Live-computed space weather alerts, following the same pattern as
 * Nimrose's pulse widget: no persisted alert state or backend scheduler
 * (none exists in this app) — just a poll that diffs against what's
 * already been seen, tracked client-side. If the browser grants
 * Notification permission, genuinely new events also fire a real OS-level
 * notification (the standard free Web Notification API) while this tab is
 * open; the in-page list works either way. */
const CosmosSpaceWeatherAlerts = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [newEvents, setNewEvents] = useState<SpaceWeatherEvent[]>([]);

  const pulseQuery = useQuery({
    queryKey: ["cosmos", "space-weather-pulse"],
    queryFn: () => fetchSpaceWeatherPulse(24),
    refetchInterval: POLL_MS,
    retry: false,
  });

  useEffect(() => {
    const results = pulseQuery.data?.data.results;
    if (!results) return;

    const seen = readSeen();
    const fresh = results.filter((e) => !seen.has(eventKey(e)));
    if (fresh.length === 0) return;

    setNewEvents((prev) => [...fresh, ...prev].slice(0, 20));

    const nextSeen = new Set(seen);
    for (const e of results) nextSeen.add(eventKey(e));
    writeSeen(nextSeen);

    if (permission === "granted") {
      for (const e of fresh) {
        try {
          new Notification(e.messageType ?? "Space weather event", {
            body: (e.body ?? "").slice(0, 180),
          });
        } catch {
          /* Notification constructor can throw in some contexts (e.g. service worker required) — non-fatal */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseQuery.data]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return (
    <div className="cosmos-card">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Space weather alerts</h3>
        {permission === "granted" ? (
          <span className="cosmos-chip">
            <Bell size={12} /> Enabled
          </span>
        ) : permission === "denied" ? (
          <span className="cosmos-unavailable text-xs">
            <BellOff size={12} className="inline" /> Notifications blocked in browser settings
          </span>
        ) : (
          <button type="button" className="cosmos-chip" onClick={requestPermission}>
            <Bell size={12} /> Enable notifications
          </button>
        )}
      </div>
      <p className="text-xs text-white/50">
        Polls NASA DONKI every 5 minutes for events in the last 24h while this page is open.
      </p>
      {newEvents.length === 0 ? (
        <p className="mt-2 cosmos-unavailable">No new events since you last checked.</p>
      ) : (
        <div className="cosmos-result-list mt-2">
          {newEvents.map((e, i) => (
            <div key={`${eventKey(e)}-${i}`} className="cosmos-card">
              <div className="mb-1 flex items-center gap-2">
                <span className="cosmos-chip">{e.messageType ?? "Event"}</span>
                <span className="text-xs text-white/40">{e.issueTime ?? ""}</span>
              </div>
              <p className="text-xs text-white/70">{(e.body ?? "").slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CosmosSpaceWeatherAlerts;
