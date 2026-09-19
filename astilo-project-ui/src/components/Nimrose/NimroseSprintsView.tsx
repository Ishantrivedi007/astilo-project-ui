import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { useConfirm } from "../shared";
import { fetchNimroseProjects } from "../../lib/nimroseApi";
import {
  createSprint,
  deleteSprint,
  fetchBoardColumns,
  fetchSprints,
  fetchTickets,
  updateSprint,
  type SprintStatus,
} from "../../lib/kanbanApi";
import { useNimrosePrompt } from "./NimrosePromptDialog";

const STATUS_ORDER: SprintStatus[] = ["planned", "active", "completed"];

const NimroseSprintsView = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { prompt } = useNimrosePrompt();
  const [projectId, setProjectId] = useState<number | null>(null);

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const activeProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;

  const sprintsQuery = useQuery({
    queryKey: ["nimrose", "sprints", activeProjectId],
    queryFn: () => fetchSprints(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const ticketsQuery = useQuery({
    queryKey: ["nimrose", "tickets", activeProjectId, "for-sprints"],
    queryFn: () => fetchTickets({ projectId: activeProjectId! }),
    enabled: !!activeProjectId,
  });

  const columnsQuery = useQuery({
    queryKey: ["nimrose", "board-columns", activeProjectId],
    queryFn: () => fetchBoardColumns(activeProjectId!),
    enabled: !!activeProjectId,
  });
  const doneSlugs = useMemo(
    () => new Set((columnsQuery.data ?? []).filter((c) => c.isDone).map((c) => c.slug)),
    [columnsQuery.data]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "sprints"] });

  const createMutation = useMutation({
    mutationFn: (name: string) => createSprint({ projectId: activeProjectId!, name }),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateSprint>[1] }) => updateSprint(id, patch),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteSprint,
    onSuccess: invalidate,
  });

  const tickets = ticketsQuery.data ?? [];

  if (!projectsQuery.isLoading && projectsQuery.data?.length === 0) {
    return (
      <div>
        <div className="nimrose-home-header">
          <div>
            <p className="nimrose-eyebrow">Projects</p>
            <h1 className="nimrose-page-title">Sprints</h1>
          </div>
        </div>
        <p className="nimrose-widget-empty">Create a project in Kanban first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Projects</p>
          <h1 className="nimrose-page-title">Sprints</h1>
        </div>
      </div>

      <div className="nimrose-kanban-toolbar">
        <select value={activeProjectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value))} aria-label="Project">
          {projectsQuery.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="nimrose-chip"
          onClick={async () => {
            const name = await prompt({ title: "New sprint", placeholder: "e.g. Sprint 2" });
            if (name?.trim()) createMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> New sprint
        </button>
      </div>

      {sprintsQuery.data?.length === 0 && <p className="nimrose-widget-empty">No sprints for this project yet.</p>}

      <div className="nimrose-sprint-list">
        {sprintsQuery.data?.map((sprint) => {
          const sprintTickets = tickets.filter((t) => t.sprintId === sprint.id);
          const done = sprintTickets.filter((t) => doneSlugs.has(t.status)).length;
          const pointsTotal = sprintTickets.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
          const pointsDone = sprintTickets
            .filter((t) => doneSlugs.has(t.status))
            .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

          return (
            <div key={sprint.id} className="glass-card nimrose-sprint-card">
              <div className="nimrose-modal-header">
                <div>
                  <p className="nimrose-sprint-name">{sprint.name}</p>
                  {sprint.goal && <p className="nimrose-widget-footnote">{sprint.goal}</p>}
                </div>
                <button type="button" className="nimrose-icon-btn" onClick={async () => {
                  const ok = await confirm({ title: "Delete sprint?", message: `Delete "${sprint.name}"? Tickets stay, just unassigned from it.`, confirmLabel: "Delete", danger: true });
                  if (ok) deleteMutation.mutate(sprint.id);
                }} aria-label="Delete sprint">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="nimrose-full-task-meta" style={{ marginBottom: "0.6rem" }}>
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`nimrose-chip ${sprint.status === s ? "nimrose-chip--active" : ""}`}
                    onClick={() => updateMutation.mutate({ id: sprint.id, patch: { status: s } })}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="nimrose-sprint-dates">
                <label>
                  Start
                  <input
                    type="date"
                    defaultValue={sprint.startDate ?? ""}
                    onBlur={(e) => updateMutation.mutate({ id: sprint.id, patch: { startDate: e.target.value } })}
                  />
                </label>
                <label>
                  End
                  <input
                    type="date"
                    defaultValue={sprint.endDate ?? ""}
                    onBlur={(e) => updateMutation.mutate({ id: sprint.id, patch: { endDate: e.target.value } })}
                  />
                </label>
                {!sprint.startDate || !sprint.endDate ? (
                  <span className="nimrose-widget-footnote">Set both dates to see a burndown in Analytics.</span>
                ) : null}
              </div>

              <div className="nimrose-sprint-bar-wrap">
                <div className="nimrose-sprint-bar">
                  <div
                    className="nimrose-sprint-bar-fill"
                    style={{ width: `${sprintTickets.length ? (done / sprintTickets.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="nimrose-widget-footnote">
                  {done}/{sprintTickets.length} tickets · {pointsDone}/{pointsTotal} points
                  {sprint.status === "completed" && sprintTickets.length - done > 0 &&
                    ` · ${sprintTickets.length - done} carried over`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NimroseSprintsView;
