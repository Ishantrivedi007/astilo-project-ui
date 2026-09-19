import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Chart, GlassPanel } from "../shared";
import { fetchNimroseProjects } from "../../lib/nimroseApi";
import { fetchBreakdown, fetchBurndown, fetchSprints, fetchVelocity } from "../../lib/kanbanApi";

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
                xaxis: { categories: burndownQuery.data.dates },
                stroke: { curve: "straight", width: [2, 3], dashArray: [4, 0] },
                yaxis: { title: { text: "Story points remaining" } },
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
              options={{ xaxis: { categories: velocity.map((v) => v.sprintName) } }}
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
                labels: Object.keys(breakdown.byType),
                legend: { position: "bottom" },
                stroke: { width: 0 },
                plotOptions: { pie: { donut: { size: "68%" } } },
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
              options={{ xaxis: { categories: Object.keys(breakdown.byPriority) }, plotOptions: { bar: { horizontal: true } } }}
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
              options={{ xaxis: { categories: Object.keys(breakdown.byColumn) } }}
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
              options={{ xaxis: { categories: Object.keys(breakdown.byAssignee) }, plotOptions: { bar: { horizontal: true } } }}
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
