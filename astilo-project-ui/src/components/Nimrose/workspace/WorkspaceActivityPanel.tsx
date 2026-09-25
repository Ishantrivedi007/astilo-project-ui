import { useQuery } from "@tanstack/react-query";

import { fetchProjectActivity } from "../../../lib/nimroseApi";

const ACTION_LABELS: Record<string, string> = {
  task_created: "created task",
  task_status_changed: "changed task status",
  task_deleted: "deleted task",
  note_created: "created note",
  note_updated: "updated note",
  note_deleted: "deleted note",
  ticket_created: "created ticket",
  ticket_status_changed: "moved ticket",
  sprint_created: "created sprint",
  phase_created: "created phase",
  member_added: "added member",
  member_removed: "removed member",
  attachment_added: "uploaded file",
};

const WorkspaceActivityPanel = ({ projectId }: { projectId: number }) => {
  const activityQuery = useQuery({
    queryKey: ["nimrose", "project-activity", projectId],
    queryFn: () => fetchProjectActivity(projectId),
  });

  const entries = activityQuery.data ?? [];

  return (
    <div className="nimrose-workspace-panel-body">
      {activityQuery.isLoading && <p className="nimrose-widget-empty">Loading activity…</p>}
      {!activityQuery.isLoading && entries.length === 0 && <p className="nimrose-widget-empty">No activity yet.</p>}
      <ul className="nimrose-workspace-list">
        {entries.map((entry) => (
          <li key={entry.id} className="nimrose-workspace-list-item">
            <span className="nimrose-workspace-list-title">
              <strong>{entry.actorName ?? "Someone"}</strong> {ACTION_LABELS[entry.action] ?? entry.action}
              {entry.detail ? ` — ${entry.detail}` : ""}
            </span>
            {entry.createdAt && <span className="nimrose-workspace-list-meta">{new Date(entry.createdAt).toLocaleString()}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceActivityPanel;
