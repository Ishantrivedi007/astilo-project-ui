import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { useConfirm } from "../shared";
import { fetchNimroseProjects } from "../../lib/nimroseApi";
import { createPhase, deletePhase, fetchPhases, fetchTickets, updatePhase, type PhaseStatus } from "../../lib/kanbanApi";
import { useNimrosePrompt } from "./NimrosePromptDialog";

const STATUS_ORDER: PhaseStatus[] = ["planned", "active", "completed"];

const NimrosePhasesView = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { prompt } = useNimrosePrompt();
  const [params] = useSearchParams();
  const [projectId, setProjectId] = useState<number | null>(null);

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const activeProjectId = projectId ?? (Number(params.get("project")) || projectsQuery.data?.[0]?.id) ?? null;

  useEffect(() => {
    const fromUrl = Number(params.get("project"));
    if (fromUrl) setProjectId(fromUrl);
  }, [params]);

  const phasesQuery = useQuery({
    queryKey: ["nimrose", "phases", activeProjectId],
    queryFn: () => fetchPhases(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const ticketsQuery = useQuery({
    queryKey: ["nimrose", "tickets", activeProjectId, "for-phases"],
    queryFn: () => fetchTickets({ projectId: activeProjectId! }),
    enabled: !!activeProjectId,
  });
  const tickets = ticketsQuery.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "phases"] });

  const createMutation = useMutation({
    mutationFn: (name: string) => createPhase({ projectId: activeProjectId!, name }),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updatePhase>[1] }) => updatePhase(id, patch),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: deletePhase,
    onSuccess: invalidate,
  });

  const highlightId = Number(params.get("phase")) || null;

  if (!projectsQuery.isLoading && projectsQuery.data?.length === 0) {
    return (
      <div>
        <div className="nimrose-home-header">
          <div>
            <p className="nimrose-eyebrow">Projects</p>
            <h1 className="nimrose-page-title">Phases</h1>
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
          <h1 className="nimrose-page-title">Phases</h1>
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
            const name = await prompt({ title: "New phase", placeholder: "e.g. Phase 2: Development" });
            if (name?.trim()) createMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> New phase
        </button>
      </div>

      {phasesQuery.data?.length === 0 && <p className="nimrose-widget-empty">No phases for this project yet.</p>}

      <div className="nimrose-sprint-list">
        {phasesQuery.data?.map((phase) => {
          const phaseTickets = tickets.filter((t) => t.phaseId === phase.id);
          return (
            <div key={phase.id} className={`glass-card nimrose-sprint-card ${highlightId === phase.id ? "nimrose-sprint-card--highlight" : ""}`}>
              <div className="nimrose-modal-header">
                <div>
                  <input
                    className="nimrose-notes-title-input"
                    style={{ fontSize: "1rem" }}
                    defaultValue={phase.name}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== phase.name) updateMutation.mutate({ id: phase.id, patch: { name } });
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={async () => {
                    const ok = await confirm({ title: "Delete phase?", message: `Delete "${phase.name}"? Tickets stay, just unassigned from it.`, confirmLabel: "Delete", danger: true });
                    if (ok) deleteMutation.mutate(phase.id);
                  }}
                  aria-label="Delete phase"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <textarea
                className="nimrose-notes-textarea"
                style={{ minHeight: "3rem" }}
                defaultValue={phase.description ?? ""}
                placeholder="What's this phase about?"
                onBlur={(e) => updateMutation.mutate({ id: phase.id, patch: { description: e.target.value } })}
              />

              <div className="nimrose-full-task-meta" style={{ margin: "0.6rem 0" }}>
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`nimrose-chip ${phase.status === s ? "nimrose-chip--active" : ""}`}
                    onClick={() => updateMutation.mutate({ id: phase.id, patch: { status: s } })}
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
                    defaultValue={phase.startDate ?? ""}
                    onBlur={(e) => updateMutation.mutate({ id: phase.id, patch: { startDate: e.target.value } })}
                  />
                </label>
                <label>
                  End
                  <input
                    type="date"
                    defaultValue={phase.endDate ?? ""}
                    onBlur={(e) => updateMutation.mutate({ id: phase.id, patch: { endDate: e.target.value } })}
                  />
                </label>
              </div>

              <p className="nimrose-widget-footnote" style={{ marginTop: "0.5rem" }}>
                {phaseTickets.length} ticket{phaseTickets.length === 1 ? "" : "s"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NimrosePhasesView;
