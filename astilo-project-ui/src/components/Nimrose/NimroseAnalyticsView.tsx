import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Chart, GlassPanel } from "../shared";
import { fetchNimroseProjects } from "../../lib/nimroseApi";
import { fetchBreakdown, fetchBurndown, fetchSprints, fetchVelocity } from "../../lib/kanbanApi";

// A warm amber/coral palette for Nimrose's charts specifically — passed as
// a per-chart override rather than changing the shared Chart component's
// theme, so Movies/Music/Store stats elsewhere in the app keep their own
// look. Ideal-vs-actual burndown gets its own two-tone pairing so the two
// lines stay readable against each other.
const WARM_PALETTE = ["#f59e0b", "#fb7185", "#f97316", "#e879f9", "#facc15", "#fb923c"];
const BURNDOWN_PALETTE = ["#fdba74", "#f43f5e"];

const interactive = {
  markers: { size: 4, strokeWidth: 2, hover: { sizeOffset: 3 } },
  dataLabels: { enabled: false },
  chart: { toolbar: { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }, zoom: { enabled: true } },
  tooltip: { shared: true, intersect: false, followCursor: true },
};

// Bars, not the base theme's translucent-fill/thick-stroke line look — solid
// fill so counts read as filled bars rather than color-outlined boxes.
const solidBar = { stroke: { width: 0 }, fill: { type: "solid", opacity: 1 } };

// Adds a "N tickets · NN% of total" tooltip/label instead of a bare count,
// so each bucket also communicates its share of the whole breakdown.
const withShare = (total: number) => ({
  dataLabels: {
    enabled: true,
    style: { colors: ["#fff"], fontWeight: 600 },
    formatter: (val: number) => (total > 0 ? `${val} (${Math.round((val / total) * 100)}%)` : `${val}`),
  },
  tooltip: {
    y: {
      formatter: (val: number) => (total > 0 ? `${val} ticket${val === 1 ? "" : "s"} · ${Math.round((val / total) * 100)}% of ${total}` : `${val}`),
    },
  },
});

const NimroseAnalyticsView = () => {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprintId, setSprintId] = useState<number | null>(null);

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const activeProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;

  const sprintsQuery = useQuery({
    queryKey: ["nimrose", "sprints", activeProjectId],
    queryFn: () => fetchSprints(activeProjectId!),
    enabled: !!activeProjectId,
  });
  const activeSprintId = sprintId ?? sprintsQuery.data?.find((s) => s.status === "active")?.id ?? sprintsQuery.data?.[0]?.id ?? null;

  const burndownQuery = useQuery({
    queryKey: ["nimrose", "analytics", "burndown", activeSprintId],
    queryFn: () => fetchBurndown(activeSprintId!),
    enabled: !!activeSprintId,
    retry: false,
  });

  const velocityQuery = useQuery({
    queryKey: ["nimrose", "analytics", "velocity", activeProjectId],
    queryFn: () => fetchVelocity(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const breakdownQuery = useQuery({
    queryKey: ["nimrose", "analytics", "breakdown", activeProjectId],
    queryFn: () => fetchBreakdown(activeProjectId!),
    enabled: !!activeProjectId,
  });

  if (!projectsQuery.isLoading && projectsQuery.data?.length === 0) {
    return (
      <div>
        <div className="nimrose-home-header">
          <div>
            <p className="nimrose-eyebrow">Projects</p>
            <h1 className="nimrose-page-title">Analytics</h1>
          </div>
        </div>
        <p className="nimrose-widget-empty">Create a project in Kanban first.</p>
      </div>
    );
  }

  const breakdown = breakdownQuery.data;
  const velocity = velocityQuery.data ?? [];

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Projects</p>
          <h1 className="nimrose-page-title">Analytics</h1>
        </div>
      </div>

      <div className="nimrose-kanban-toolbar">
        <select
          value={activeProjectId ?? ""}
          onChange={(e) => {
            setProjectId(Number(e.target.value));
            setSprintId(null);
          }}
          aria-label="Project"
        >
          {projectsQuery.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={activeSprintId ?? ""} onChange={(e) => setSprintId(Number(e.target.value))} aria-label="Sprint">
          {sprintsQuery.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="nimrose-analytics-grid">
        <GlassPanel title="Burndown" subtitle="Ideal vs. actual remaining story points" className="nimrose-analytics-panel nimrose-analytics-panel--wide">
          {burndownQuery.isError && (
            <p className="nimrose-widget-empty">
              {(burndownQuery.error as { response?: { status?: number } })?.response?.status === 400
                ? "Set this sprint's start and end dates in Sprints to see a burndown."
                : "Couldn't load burndown data."}
            </p>
          )}
          {burndownQuery.data && (
            <Chart
              type="line"
              height={280}
              series={[
                { name: "Ideal", data: burndownQuery.data.idealRemaining },
                { name: "Actual", data: burndownQuery.data.actualRemaining },
              ]}
              options={{
                ...interactive,
                colors: BURNDOWN_PALETTE,
                xaxis: { categories: burndownQuery.data.dates },
                stroke: { curve: "straight", width: [2, 3], dashArray: [4, 0] },
                yaxis: { title: { text: "Story points remaining" } },
                markers: { ...interactive.markers, strokeColors: BURNDOWN_PALETTE },
              }}
            />
          )}
        </GlassPanel>

        <GlassPanel title="Velocity" subtitle="Story points completed per sprint" className="nimrose-analytics-panel">
          {velocity.length === 0 ? (
            <p className="nimrose-widget-empty">No sprints yet.</p>
          ) : (
            <Chart
              type="bar"
              height={260}
              series={[{ name: "Points completed", data: velocity.map((v) => v.pointsCompleted) }]}
              options={{
                ...interactive,
                ...solidBar,
                colors: WARM_PALETTE,
                dataLabels: { enabled: true, style: { colors: ["#fff"] } },
                xaxis: { categories: velocity.map((v) => v.sprintName) },
                plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
              }}
            />
          )}
        </GlassPanel>

        <GlassPanel title="By type" className="nimrose-analytics-panel">
          {breakdown && Object.keys(breakdown.byType).length > 0 ? (
            <Chart
              type="donut"
              height={220}
              series={Object.values(breakdown.byType)}
              options={{
                colors: WARM_PALETTE,
                labels: Object.keys(breakdown.byType),
                legend: { position: "bottom" },
                stroke: { width: 2, colors: ["rgba(0,0,0,0)"] },
                plotOptions: { pie: { donut: { size: "62%" }, expandOnClick: true } },
                dataLabels: { enabled: true, dropShadow: { enabled: false } },
              }}
            />
          ) : (
            <p className="nimrose-widget-empty">No tickets yet.</p>
          )}
        </GlassPanel>

        <GlassPanel title="By priority" className="nimrose-analytics-panel">
          {breakdown && Object.keys(breakdown.byPriority).length > 0 ? (
            <Chart
              type="bar"
              height={220}
              series={[{ name: "Tickets", data: Object.values(breakdown.byPriority) }]}
              options={{
                ...interactive,
                ...solidBar,
                ...withShare(breakdown.total),
                colors: WARM_PALETTE,
                xaxis: { categories: Object.keys(breakdown.byPriority) },
                plotOptions: { bar: { horizontal: true, borderRadius: 5, distributed: true } },
                legend: { show: false },
              }}
            />
          ) : (
            <p className="nimrose-widget-empty">No tickets yet.</p>
          )}
        </GlassPanel>

        <GlassPanel title="By column" subtitle="Current snapshot, not a trend" className="nimrose-analytics-panel">
          {breakdown && Object.keys(breakdown.byColumn).length > 0 ? (
            <Chart
              type="bar"
              height={220}
              series={[{ name: "Tickets", data: Object.values(breakdown.byColumn) }]}
              options={{
                ...interactive,
                ...solidBar,
                ...withShare(breakdown.total),
                colors: WARM_PALETTE,
                xaxis: { categories: Object.keys(breakdown.byColumn) },
                plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: "55%" } },
                legend: { show: false },
              }}
            />
          ) : (
            <p className="nimrose-widget-empty">No tickets yet.</p>
          )}
        </GlassPanel>

        <GlassPanel title="By assignee" className="nimrose-analytics-panel">
          {breakdown && Object.keys(breakdown.byAssignee).length > 0 ? (
            <Chart
              type="bar"
              height={220}
              series={[{ name: "Tickets", data: Object.values(breakdown.byAssignee) }]}
              options={{
                ...interactive,
                ...solidBar,
                ...withShare(breakdown.total),
                colors: WARM_PALETTE,
                xaxis: { categories: Object.keys(breakdown.byAssignee) },
                plotOptions: { bar: { horizontal: true, borderRadius: 5, distributed: true } },
                legend: { show: false },
              }}
            />
          ) : (
            <p className="nimrose-widget-empty">No tickets yet.</p>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default NimroseAnalyticsView;
