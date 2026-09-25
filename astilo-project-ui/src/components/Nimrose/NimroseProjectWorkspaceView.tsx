import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchNimroseCalendarEvents, fetchNimroseProjects, fetchNimroseTasks } from "../../lib/nimroseApi";
import WorkspaceActivityPanel from "./workspace/WorkspaceActivityPanel";
import WorkspaceCodePanel from "./workspace/WorkspaceCodePanel";
import WorkspaceFilesPanel from "./workspace/WorkspaceFilesPanel";
import WorkspaceNotesPanel from "./workspace/WorkspaceNotesPanel";
import WorkspaceTasksPanel from "./workspace/WorkspaceTasksPanel";
import WorkspaceTeamPanel from "./workspace/WorkspaceTeamPanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendar" },
  { id: "code", label: "Code" },
  { id: "docs", label: "Docs" },
  { id: "files", label: "Files" },
  { id: "analytics", label: "Analytics" },
  { id: "team", label: "Team" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const OverviewTab = ({ projectId }: { projectId: number }) => {
  const tasksQuery = useQuery({ queryKey: ["nimrose", "tasks", "project", projectId], queryFn: () => fetchNimroseTasks({ projectId }) });
  const eventsQuery = useQuery({ queryKey: ["nimrose", "calendar-events", "project", projectId], queryFn: () => fetchNimroseCalendarEvents({ projectId }) });
  const tasks = tasksQuery.data ?? [];
  const openTasks = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="nimrose-workspace-picker-grid">
      <div className="glass-card nimrose-workspace-picker-card">
        <p className="nimrose-workspace-list-title">Tasks</p>
        <span className="nimrose-workspace-list-meta">{openTasks} open / {tasks.length} total</span>
      </div>
      <div className="glass-card nimrose-workspace-picker-card">
        <p className="nimrose-workspace-list-title">Calendar</p>
        <span className="nimrose-workspace-list-meta">{(eventsQuery.data ?? []).length} upcoming events</span>
      </div>
    </div>
  );
};

const CalendarTab = ({ projectId }: { projectId: number }) => {
  const eventsQuery = useQuery({ queryKey: ["nimrose", "calendar-events", "project", projectId], queryFn: () => fetchNimroseCalendarEvents({ projectId }) });
  const events = eventsQuery.data ?? [];
  return (
    <div className="nimrose-workspace-panel-body">
      {eventsQuery.isLoading && <p className="nimrose-widget-empty">Loading events…</p>}
      {!eventsQuery.isLoading && events.length === 0 && <p className="nimrose-widget-empty">No events yet.</p>}
      <ul className="nimrose-workspace-list">
        {events.map((event) => (
          <li key={event.id} className="nimrose-workspace-list-item">
            <span className="nimrose-workspace-list-title">{event.title}</span>
            <span className="nimrose-workspace-list-meta">{new Date(event.startAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const OpenInFullViewTab = ({ section, projectId, label }: { section: string; projectId: number; label: string }) => {
  const navigate = useNavigate();
  return (
    <div className="nimrose-workspace-panel-body">
      <p className="nimrose-widget-empty">{label} has its own full-featured view.</p>
      <button type="button" className="nimrose-chip" onClick={() => navigate(`${AppRoute.nimrose}?section=${section}&project=${projectId}`)}>
        <ExternalLink size={12} /> Open {label}
      </button>
    </div>
  );
};

const NimroseProjectWorkspaceView = () => {
  const [urlParams] = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => Number(urlParams.get("project")) || null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Projects</p>
          <h1 className="nimrose-page-title">{selectedProject ? selectedProject.name : "Project Workspace"}</h1>
        </div>
        {selectedProject && (
          <button type="button" className="nimrose-chip" onClick={() => setSelectedProjectId(null)}>
            <ArrowLeft size={12} /> All projects
          </button>
        )}
      </div>

      {!selectedProject && (
        <>
          {projectsQuery.isLoading && <p className="nimrose-widget-empty">Loading projects…</p>}
          {!projectsQuery.isLoading && projects.length === 0 && <p className="nimrose-widget-empty">No projects yet — create one in Kanban.</p>}
          <div className="nimrose-workspace-picker-grid">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="glass-card nimrose-workspace-picker-card"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <p className="nimrose-workspace-list-title">{project.name}</p>
                <span className="nimrose-workspace-list-meta">{project.keyPrefix ?? ""}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedProject && (
        <>
          <div className="nimrose-status-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`nimrose-chip ${activeTab === tab.id ? "nimrose-chip--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="glass-card nimrose-workspace-panel">
            {activeTab === "overview" && <OverviewTab projectId={selectedProject.id} />}
            {activeTab === "tasks" && <WorkspaceTasksPanel projectId={selectedProject.id} />}
            {activeTab === "kanban" && <OpenInFullViewTab section="kanban" projectId={selectedProject.id} label="Kanban" />}
            {activeTab === "calendar" && <CalendarTab projectId={selectedProject.id} />}
            {activeTab === "code" && <WorkspaceCodePanel projectId={selectedProject.id} />}
            {activeTab === "docs" && <WorkspaceNotesPanel projectId={selectedProject.id} />}
            {activeTab === "files" && <WorkspaceFilesPanel projectId={selectedProject.id} />}
            {activeTab === "analytics" && <OpenInFullViewTab section="analytics" projectId={selectedProject.id} label="Analytics" />}
            {activeTab === "team" && <WorkspaceTeamPanel projectId={selectedProject.id} />}
            {activeTab === "activity" && <WorkspaceActivityPanel projectId={selectedProject.id} />}
          </div>
        </>
      )}
    </div>
  );
};

export default NimroseProjectWorkspaceView;
