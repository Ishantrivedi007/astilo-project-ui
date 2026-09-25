import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckSquare, Clock3, ExternalLink, FileText, Globe, LayoutGrid } from "lucide-react";

import { GlassPanel, Chart } from "../shared";
import { fetchBrowserSpaces, fetchBrowserTabs } from "../../lib/browserApi";
import { fetchNimroseNotes, fetchNimroseTasks } from "../../lib/nimroseApi";
import { fetchResearchLinkedProjects } from "../../lib/researchWorkspaceApi";
import WorkspaceNotesPanel from "./workspace/WorkspaceNotesPanel";
import WorkspaceTasksPanel from "./workspace/WorkspaceTasksPanel";

const STATUS_LABELS: Record<string, string> = {
  inbox: "Inbox",
  planned: "Planned",
  in_progress: "In Progress",
  waiting: "Waiting",
  completed: "Completed",
};

const WorkspaceTabsPanel = ({ projectId }: { projectId: number }) => {
  const spacesQuery = useQuery({
    queryKey: ["nimrose", "browser-spaces", "project", projectId],
    queryFn: () => fetchBrowserSpaces({ projectId }),
  });

  const spaceIds = (spacesQuery.data ?? []).map((s) => s.id);
  const tabsQuery = useQuery({
    queryKey: ["nimrose", "browser-tabs", "project", projectId, spaceIds],
    queryFn: async () => (await Promise.all(spaceIds.map((id) => fetchBrowserTabs(id)))).flat(),
    enabled: !!spacesQuery.data,
  });

  const tabs = tabsQuery.data ?? [];

  return (
    <div className="nimrose-workspace-panel-body">
      {(spacesQuery.isLoading || tabsQuery.isLoading) && <p className="nimrose-widget-empty">Loading tabs…</p>}
      {!spacesQuery.isLoading && !tabsQuery.isLoading && tabs.length === 0 && (
        <p className="nimrose-widget-empty">No open tabs for this topic.</p>
      )}
      <ul className="nimrose-workspace-list">
        {tabs.map((tab) => (
          <li key={tab.id} className="nimrose-workspace-list-item">
            <Globe size={12} />
            <a className="nimrose-workspace-list-title" href={tab.url} target="_blank" rel="noreferrer">
              {tab.title || tab.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

const WorkspaceChartPanel = ({ projectId }: { projectId: number }) => {
  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", "project", projectId],
    queryFn: () => fetchNimroseTasks({ projectId }),
  });

  const tasks = tasksQuery.data ?? [];
  const byStatus = Object.keys(STATUS_LABELS).reduce<Record<string, number>>((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status).length;
    return acc;
  }, {});
  const total = tasks.length;

  if (!tasksQuery.isLoading && total === 0) {
    return <p className="nimrose-widget-empty">No tasks yet — progress will show up here once you add some.</p>;
  }

  return (
    <Chart
      type="donut"
      height={220}
      series={Object.values(byStatus)}
      options={{
        labels: Object.keys(byStatus).map((s) => STATUS_LABELS[s]),
        legend: { position: "bottom" },
        stroke: { width: 2, colors: ["rgba(0,0,0,0)"] },
        plotOptions: { pie: { donut: { size: "62%" }, expandOnClick: true } },
        dataLabels: { enabled: true, dropShadow: { enabled: false } },
      }}
    />
  );
};

type TimelineEntry = { type: "tab" | "note" | "task"; title: string; createdAt: string };

/** Reads from the exact same React Query cache keys WorkspaceTabsPanel /
 * WorkspaceNotesPanel / WorkspaceTasksPanel use, so switching to Timeline
 * mode reuses whatever's already been fetched (or triggers the same
 * fetches) instead of a separate backend endpoint — matches the plan's
 * "purely client-side, no new endpoint" call. */
const WorkspaceTimelinePanel = ({ projectId }: { projectId: number }) => {
  const spacesQuery = useQuery({
    queryKey: ["nimrose", "browser-spaces", "project", projectId],
    queryFn: () => fetchBrowserSpaces({ projectId }),
  });
  const spaceIds = (spacesQuery.data ?? []).map((s) => s.id);
  const tabsQuery = useQuery({
    queryKey: ["nimrose", "browser-tabs", "project", projectId, spaceIds],
    queryFn: async () => (await Promise.all(spaceIds.map((id) => fetchBrowserTabs(id)))).flat(),
    enabled: !!spacesQuery.data,
  });
  const notesQuery = useQuery({
    queryKey: ["nimrose", "notes", "project", projectId],
    queryFn: () => fetchNimroseNotes({ projectId }),
  });
  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", "project", projectId],
    queryFn: () => fetchNimroseTasks({ projectId }),
  });

  const loading = spacesQuery.isLoading || tabsQuery.isLoading || notesQuery.isLoading || tasksQuery.isLoading;

  const entries: TimelineEntry[] = [
    ...(tabsQuery.data ?? []).filter((t) => t.createdAt).map((t): TimelineEntry => ({ type: "tab", title: t.title || t.url, createdAt: t.createdAt! })),
    ...(notesQuery.data ?? []).filter((n) => n.createdAt).map((n): TimelineEntry => ({ type: "note", title: n.title, createdAt: n.createdAt! })),
    ...(tasksQuery.data ?? []).filter((t) => t.createdAt).map((t): TimelineEntry => ({ type: "task", title: t.title, createdAt: t.createdAt! })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const icons = { tab: Globe, note: FileText, task: CheckSquare };

  return (
    <div className="nimrose-workspace-panel-body">
      {loading && <p className="nimrose-widget-empty">Loading timeline…</p>}
      {!loading && entries.length === 0 && <p className="nimrose-widget-empty">Nothing accumulated for this topic yet.</p>}
      <ul className="nimrose-workspace-list">
        {entries.map((entry, i) => {
          const Icon = icons[entry.type];
          return (
            <li key={`${entry.type}-${i}`} className="nimrose-workspace-list-item">
              <Icon size={12} />
              <span className="nimrose-workspace-list-title">{entry.title}</span>
              <span className="nimrose-workspace-list-meta">{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const NimroseResearchWorkspaceView = () => {
  const [urlParams] = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => Number(urlParams.get("project")) || null);
  const [mode, setMode] = useState<"panels" | "timeline">("panels");

  const projectsQuery = useQuery({
    queryKey: ["nimrose", "research-projects"],
    queryFn: fetchResearchLinkedProjects,
  });

  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">{selectedProject ? selectedProject.researchTitle : "Research Workspace"}</h1>
        </div>
        {selectedProject && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={`nimrose-chip ${mode === "panels" ? "nimrose-chip--active" : ""}`}
              onClick={() => setMode("panels")}
            >
              <LayoutGrid size={12} /> Panels
            </button>
            <button
              type="button"
              className={`nimrose-chip ${mode === "timeline" ? "nimrose-chip--active" : ""}`}
              onClick={() => setMode("timeline")}
            >
              <Clock3 size={12} /> Timeline
            </button>
            <button type="button" className="nimrose-chip" onClick={() => setSelectedProjectId(null)}>
              <ArrowLeft size={12} /> All topics
            </button>
          </div>
        )}
      </div>

      {!selectedProject && (
        <>
          {projectsQuery.isLoading && <p className="nimrose-widget-empty">Loading research topics…</p>}
          {!projectsQuery.isLoading && projects.length === 0 && (
            <p className="nimrose-widget-empty">No research topics yet — start one from Cosmos.</p>
          )}
          <div className="nimrose-workspace-picker-grid">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="glass-card nimrose-workspace-picker-card"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <p className="nimrose-workspace-list-title">{project.researchTitle}</p>
                <span className="nimrose-workspace-list-meta">
                  <ExternalLink size={12} /> {project.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedProject && mode === "panels" && (
        <div className="nimrose-workspace-grid">
          <GlassPanel title="Browser tabs" className="nimrose-analytics-panel">
            <WorkspaceTabsPanel projectId={selectedProject.id} />
          </GlassPanel>
          <GlassPanel title="Notes" className="nimrose-analytics-panel">
            <WorkspaceNotesPanel projectId={selectedProject.id} />
          </GlassPanel>
          <GlassPanel title="Tasks" className="nimrose-analytics-panel">
            <WorkspaceTasksPanel projectId={selectedProject.id} />
          </GlassPanel>
          <GlassPanel title="Progress" className="nimrose-analytics-panel">
            <WorkspaceChartPanel projectId={selectedProject.id} />
          </GlassPanel>
        </div>
      )}

      {selectedProject && mode === "timeline" && (
        <GlassPanel title="Timeline" subtitle="How this topic accumulated tabs, notes, and tasks over time" className="nimrose-analytics-panel">
          <WorkspaceTimelinePanel projectId={selectedProject.id} />
        </GlassPanel>
      )}
    </div>
  );
};

export default NimroseResearchWorkspaceView;
