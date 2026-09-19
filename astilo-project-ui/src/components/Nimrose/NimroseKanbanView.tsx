import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Paperclip, Plus, Trash2 } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import {
  createNimroseProject,
  deleteNimroseProject,
  fetchNimroseProjects,
  updateNimroseProject,
} from "../../lib/nimroseApi";
import { useConfirm } from "../shared";
import {
  createBoardColumn,
  createSprint,
  createTicket,
  deleteBoardColumn,
  fetchAssignableUsers,
  fetchBoardColumns,
  fetchSprints,
  fetchTickets,
  TICKET_TYPE_ICON,
  TICKET_TYPE_LABEL,
  updateBoardColumn,
  updateTicket,
  type NimroseTicket,
  type TicketStatus,
} from "../../lib/kanbanApi";
import NimroseTicketModal from "./NimroseTicketModal";
import { useNimrosePrompt } from "./NimrosePromptDialog";
import UserAvatar from "./UserAvatar";

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

type Preset = "all" | "mine" | "unassigned" | "critical";
type SortMode = "manual" | "priority" | "dueDate" | "points";

interface SavedFilter {
  id: string;
  name: string;
  search: string;
  preset: Preset;
  type: string;
  priority: string;
  assignee: string;
  sortMode: SortMode;
}

const savedFiltersKey = (projectId: number) => `nimrose-kanban-filters-${projectId}`;

const readSavedFilters = (projectId: number): SavedFilter[] => {
  try {
    const raw = localStorage.getItem(savedFiltersKey(projectId));
    return raw ? (JSON.parse(raw) as SavedFilter[]) : [];
  } catch {
    return [];
  }
};

const writeSavedFilters = (projectId: number, filters: SavedFilter[]) => {
  try {
    localStorage.setItem(savedFiltersKey(projectId), JSON.stringify(filters));
  } catch {
    /* ignore */
  }
};

const sortTickets = (tickets: NimroseTicket[], mode: SortMode) => {
  if (mode === "manual") return tickets;
  const sorted = [...tickets];
  if (mode === "priority") sorted.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  if (mode === "dueDate") sorted.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  if (mode === "points") sorted.sort((a, b) => (b.storyPoints ?? 0) - (a.storyPoints ?? 0));
  return sorted;
};

const isOverdue = (ticket: NimroseTicket, doneSlugs: Set<string>) =>
  !!ticket.dueDate && !doneSlugs.has(ticket.status) && ticket.dueDate < new Date().toISOString().slice(0, 10);

const NimroseKanbanView = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prompt, alertInfo } = useNimrosePrompt();
  const confirm = useConfirm();
  const [urlParams] = useSearchParams();

  const [projectId, setProjectId] = useState<number | null>(() => Number(urlParams.get("project")) || null);
  const [sprintId, setSprintId] = useState<number | "backlog" | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [preset, setPreset] = useState<Preset>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [openTicketId, setOpenTicketId] = useState<number | null>(() => Number(urlParams.get("ticket")) || null);
  const [draftByColumn, setDraftByColumn] = useState<Record<string, string>>({});
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [groupBy, setGroupBy] = useState<"none" | "assignee">("none");

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const activeProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;
  const activeProject = projectsQuery.data?.find((p) => p.id === activeProjectId) ?? null;

  useEffect(() => {
    setSavedFilters(activeProjectId ? readSavedFilters(activeProjectId) : []);
  }, [activeProjectId]);

  // Re-applies a notification's deep link even if Kanban was already open
  // (component doesn't remount, so the initial-state read above only fires
  // once) — e.g. clicking a second ticket notification while already here.
  useEffect(() => {
    const p = Number(urlParams.get("project"));
    const t = Number(urlParams.get("ticket"));
    if (p) setProjectId(p);
    if (t) setOpenTicketId(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams]);

  const sprintsQuery = useQuery({
    queryKey: ["nimrose", "sprints", activeProjectId],
    queryFn: () => fetchSprints(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const columnsQuery = useQuery({
    queryKey: ["nimrose", "board-columns", activeProjectId],
    queryFn: () => fetchBoardColumns(activeProjectId!),
    enabled: !!activeProjectId,
  });
  const columns = columnsQuery.data ?? [];
  const doneSlugs = useMemo(() => new Set(columns.filter((c) => c.isDone).map((c) => c.slug)), [columns]);

  const ticketsQuery = useQuery({
    queryKey: ["nimrose", "tickets", activeProjectId, sprintId],
    queryFn: () =>
      fetchTickets({
        projectId: activeProjectId!,
        sprintId: typeof sprintId === "number" ? sprintId : undefined,
      }),
    enabled: !!activeProjectId,
  });

  const usersQuery = useQuery({ queryKey: ["users", "basic"], queryFn: fetchAssignableUsers });
  const avatarByName = useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.name, u.avatar])),
    [usersQuery.data]
  );

  const invalidateTickets = () => {
    queryClient.invalidateQueries({ queryKey: ["nimrose", "tickets"] });
    // Status/assignee changes create a real notification server-side —
    // refresh the bell immediately instead of waiting for its own poll.
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => createNimroseProject(name),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "projects"] });
      setProjectId(project.id);
    },
  });

  const renameProjectMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateNimroseProject(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "projects"] }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => deleteNimroseProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "projects"] });
      setProjectId(null);
    },
  });

  const createSprintMutation = useMutation({
    mutationFn: (name: string) => createSprint({ projectId: activeProjectId!, name, status: "active" }),
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "sprints", activeProjectId] });
      setSprintId(sprint.id);
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: invalidateTickets,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TicketStatus }) => updateTicket(id, { status }),
    onSuccess: invalidateTickets,
  });

  const addColumnMutation = useMutation({
    mutationFn: (name: string) => createBoardColumn(activeProjectId!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "board-columns", activeProjectId] }),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: number) => deleteBoardColumn(activeProjectId!, columnId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "board-columns", activeProjectId] }),
    onError: async () => {
      await alertInfo("Move its tickets to another column first, then delete it.", "Can't delete column");
    },
  });

  const wipLimitMutation = useMutation({
    mutationFn: ({ columnId, wipLimit }: { columnId: number; wipLimit: number | null }) =>
      updateBoardColumn(activeProjectId!, columnId, { wipLimit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "board-columns", activeProjectId] }),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: ({ ticketIds, assignee }: { ticketIds: number[]; assignee: string | null }) =>
      Promise.all(ticketIds.map((id) => updateTicket(id, { assignee }))),
    onSuccess: invalidateTickets,
  });

  const allTickets = ticketsQuery.data ?? [];

  const visibleTickets = useMemo(() => {
    let list = allTickets;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q));
    }
    if (preset === "mine" && user?.name) list = list.filter((t) => t.assignee === user.name);
    if (preset === "unassigned") list = list.filter((t) => !t.assignee);
    if (preset === "critical") list = list.filter((t) => t.priority === "critical");
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (assigneeFilter.trim()) {
      const a = assigneeFilter.trim().toLowerCase();
      list = list.filter((t) => (t.assignee ?? "").toLowerCase().includes(a));
    }
    if (sprintId === "backlog") list = list.filter((t) => !t.sprintId);
    return list;
  }, [allTickets, search, preset, typeFilter, priorityFilter, assigneeFilter, user?.name, sprintId]);

  const byColumnIn = (list: NimroseTicket[], slug: TicketStatus) => sortTickets(list.filter((t) => t.status === slug), sortMode);

  const lanes: { label: string; tickets: NimroseTicket[] }[] =
    groupBy === "assignee"
      ? Object.entries(
          visibleTickets.reduce((acc, t) => {
            const key = t.assignee || "Unassigned";
            (acc[key] ??= []).push(t);
            return acc;
          }, {} as Record<string, NimroseTicket[]>)
        )
          .sort(([a], [b]) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)))
          .map(([label, tickets]) => ({ label, tickets }))
      : [{ label: "", tickets: visibleTickets }];

  const activeSprint = typeof sprintId === "number" ? sprintsQuery.data?.find((s) => s.id === sprintId) : null;
  const sprintTickets = typeof sprintId === "number" ? allTickets : [];
  const sprintDone = sprintTickets.filter((t) => doneSlugs.has(t.status)).length;
  const sprintPointsTotal = sprintTickets.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const sprintPointsDone = sprintTickets
    .filter((t) => doneSlugs.has(t.status))
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  const addTicket = (status: TicketStatus) => {
    const title = (draftByColumn[status] ?? "").trim();
    if (!title || !activeProjectId) return;
    createTicketMutation.mutate({
      projectId: activeProjectId,
      title,
      status,
      sprintId: typeof sprintId === "number" ? sprintId : undefined,
    });
    setDraftByColumn((prev) => ({ ...prev, [status]: "" }));
  };

  if (!projectsQuery.isLoading && projectsQuery.data?.length === 0) {
    return (
      <div>
        <div className="nimrose-home-header">
          <div>
            <p className="nimrose-eyebrow">Projects</p>
            <h1 className="nimrose-page-title">Kanban</h1>
          </div>
        </div>
        <p className="nimrose-widget-empty" style={{ marginBottom: "0.6rem" }}>
          Create a project to start a board.
        </p>
        <button
          type="button"
          className="nimrose-chip"
          onClick={async () => {
            const name = await prompt({ title: "New project", placeholder: "e.g. Astilo Redesign" });
            if (name?.trim()) createProjectMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> New project
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Projects</p>
          <h1 className="nimrose-page-title">Kanban</h1>
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
              {p.name} ({p.keyPrefix})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="nimrose-chip"
          onClick={async () => {
            const name = await prompt({ title: "New project", placeholder: "e.g. Astilo Redesign" });
            if (name?.trim()) createProjectMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> Project
        </button>
        {activeProject && (
          <>
            <button
              type="button"
              className="nimrose-chip"
              onClick={async () => {
                const name = await prompt({ title: "Rename project", defaultValue: activeProject.name });
                if (name?.trim()) renameProjectMutation.mutate({ id: activeProject.id, name: name.trim() });
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="nimrose-chip"
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete project?",
                  message: `Delete "${activeProject.name}" and all of its tickets, sprints, and columns? This can't be undone.`,
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) deleteProjectMutation.mutate(activeProject.id);
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </>
        )}

        <select
          value={sprintId ?? "all"}
          onChange={(e) =>
            setSprintId(e.target.value === "all" ? null : e.target.value === "backlog" ? "backlog" : Number(e.target.value))
          }
          aria-label="Sprint"
        >
          <option value="all">All tickets</option>
          <option value="backlog">No sprint</option>
          {sprintsQuery.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.status})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="nimrose-chip"
          onClick={async () => {
            const name = await prompt({ title: "New sprint", placeholder: "e.g. Sprint 1" });
            if (name?.trim()) createSprintMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> Sprint
        </button>
        <button
          type="button"
          className="nimrose-chip"
          disabled={!activeProjectId}
          onClick={async () => {
            const name = await prompt({ title: "New column", placeholder: "e.g. Testing, QA" });
            if (name?.trim()) addColumnMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> Column
        </button>

        <input
          className="nimrose-kanban-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets…"
          aria-label="Search tickets"
        />

        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort tickets">
          <option value="manual">Manual order</option>
          <option value="priority">Sort: Priority</option>
          <option value="dueDate">Sort: Due date</option>
          <option value="points">Sort: Story points</option>
        </select>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "none" | "assignee")} aria-label="Group into swimlanes">
          <option value="none">No swimlanes</option>
          <option value="assignee">Swimlanes: Assignee</option>
        </select>
        <select
          value=""
          disabled={visibleTickets.length === 0 || bulkAssignMutation.isPending}
          onChange={async (e) => {
            const value = e.target.value;
            e.target.value = "";
            if (!value) return;
            const label = value === "__unassign__" ? "Unassigned" : value;
            const ok = await confirm({
              title: "Assign all shown tickets?",
              message: `Assign all ${visibleTickets.length} currently-shown tickets to "${label}"? This can't be bulk-undone.`,
              confirmLabel: "Assign",
            });
            if (!ok) return;
            const ids = visibleTickets.map((t) => t.id);
            bulkAssignMutation.mutate({ ticketIds: ids, assignee: value === "__unassign__" ? null : value });
          }}
          aria-label={`Assign all ${visibleTickets.length} visible tickets to`}
          title="Bulk-assign every ticket currently shown by the filters above"
        >
          <option value="">
            {bulkAssignMutation.isPending ? "Assigning…" : `Assign all ${visibleTickets.length} shown to…`}
          </option>
          <option value="__unassign__">Unassigned</option>
          {usersQuery.data?.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name}
              {u.id === user?.id ? " (me)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="nimrose-status-tabs">
        {(["all", "mine", "unassigned", "critical"] as Preset[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`nimrose-chip ${preset === p ? "nimrose-chip--active" : ""}`}
            onClick={() => setPreset(p)}
          >
            {p === "all" ? "All" : p === "mine" ? "My Tickets" : p === "unassigned" ? "Unassigned" : "Critical"}
          </button>
        ))}

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
          <option value="">Any type</option>
          {(Object.keys(TICKET_TYPE_LABEL) as (keyof typeof TICKET_TYPE_LABEL)[]).map((t) => (
            <option key={t} value={t}>
              {TICKET_TYPE_ICON[t]} {TICKET_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filter by priority">
          <option value="">Any priority</option>
          {["low", "medium", "high", "critical"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          placeholder="Assignee contains…"
          aria-label="Filter by assignee"
          className="nimrose-kanban-search"
          style={{ maxWidth: 160 }}
        />
      </div>

      <div className="nimrose-status-tabs">
        {savedFilters.map((f) => (
          <span key={f.id} className="nimrose-saved-filter-chip">
            <button
              type="button"
              onClick={() => {
                setSearch(f.search);
                setPreset(f.preset);
                setTypeFilter(f.type);
                setPriorityFilter(f.priority);
                setAssigneeFilter(f.assignee);
                setSortMode(f.sortMode);
              }}
            >
              {f.name}
            </button>
            <button
              type="button"
              aria-label={`Delete filter ${f.name}`}
              onClick={() => {
                if (!activeProjectId) return;
                const next = savedFilters.filter((sf) => sf.id !== f.id);
                setSavedFilters(next);
                writeSavedFilters(activeProjectId, next);
              }}
            >
              <Trash2 size={10} />
            </button>
          </span>
        ))}
        <button
          type="button"
          className="nimrose-chip"
          onClick={async () => {
            if (!activeProjectId) return;
            const name = await prompt({ title: "Save filter as…", placeholder: "e.g. My critical bugs" });
            if (!name?.trim()) return;
            const next = [
              ...savedFilters,
              {
                id: crypto.randomUUID(),
                name: name.trim(),
                search,
                preset,
                type: typeFilter,
                priority: priorityFilter,
                assignee: assigneeFilter,
                sortMode,
              },
            ];
            setSavedFilters(next);
            writeSavedFilters(activeProjectId, next);
          }}
        >
          <Plus size={12} /> Save current filter
        </button>
      </div>

      {activeSprint && (
        <div className="nimrose-sprint-progress glass-card">
          <div>
            <p className="nimrose-sprint-name">{activeSprint.name}</p>
            {activeSprint.goal && <p className="nimrose-widget-footnote">{activeSprint.goal}</p>}
          </div>
          <div className="nimrose-sprint-bar-wrap">
            <div className="nimrose-sprint-bar">
              <div
                className="nimrose-sprint-bar-fill"
                style={{ width: `${sprintTickets.length ? (sprintDone / sprintTickets.length) * 100 : 0}%` }}
              />
            </div>
            <p className="nimrose-widget-footnote">
              {sprintDone}/{sprintTickets.length} tickets · {sprintPointsDone}/{sprintPointsTotal} points
            </p>
          </div>
        </div>
      )}

      {lanes.map((lane) => (
        <div key={lane.label || "__all__"}>
          {groupBy === "assignee" && (
            <p className="nimrose-swimlane-label">
              {lane.label} <span className="nimrose-widget-footnote">({lane.tickets.length})</span>
            </p>
          )}
          <div className="nimrose-kanban-board">
            {columns.map((col) => {
              const colTickets = byColumnIn(lane.tickets, col.slug);
              const overLimit = !!col.wipLimit && colTickets.length > col.wipLimit;
              return (
                <div
                  key={col.slug}
                  className={`nimrose-kanban-column ${dragOverColumn === `${lane.label}:${col.slug}` ? "nimrose-kanban-column--over" : ""} ${overLimit ? "nimrose-kanban-column--over-limit" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColumn(`${lane.label}:${col.slug}`);
                  }}
                  onDragLeave={() => setDragOverColumn((c) => (c === `${lane.label}:${col.slug}` ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverColumn(null);
                    const id = Number(e.dataTransfer.getData("text/plain"));
                    if (id) moveMutation.mutate({ id, status: col.slug });
                  }}
                >
                  <div className="nimrose-kanban-column-header">
                    <span>{col.name}</span>
                    <button
                      type="button"
                      className="nimrose-kanban-wip"
                      title="Set a soft WIP limit for this column"
                      onClick={async () => {
                        const value = await prompt({
                          title: `WIP limit for ${col.name}`,
                          placeholder: "e.g. 3 (leave blank for no limit)",
                          defaultValue: col.wipLimit ? String(col.wipLimit) : "",
                        });
                        if (value === null) return;
                        const parsed = value.trim() ? Number(value.trim()) : null;
                        wipLimitMutation.mutate({ columnId: col.id, wipLimit: Number.isFinite(parsed) ? parsed : null });
                      }}
                    >
                      {colTickets.length}
                      {col.wipLimit ? `/${col.wipLimit}` : ""}
                    </button>
                    <button
                      type="button"
                      className="nimrose-kanban-column-delete"
                      onClick={() => deleteColumnMutation.mutate(col.id)}
                      aria-label={`Delete ${col.name} column`}
                      title={`Delete ${col.name}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div className="nimrose-kanban-cards">
                    {colTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        overdue={isOverdue(ticket, doneSlugs)}
                        avatarUrl={ticket.assignee ? avatarByName.get(ticket.assignee) : undefined}
                        onOpen={() => setOpenTicketId(ticket.id)}
                      />
                    ))}
                  </div>

                  <form
                    className="nimrose-kanban-add"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addTicket(col.slug);
                    }}
                  >
                    <input
                      value={draftByColumn[col.slug] ?? ""}
                      onChange={(e) => setDraftByColumn((prev) => ({ ...prev, [col.slug]: e.target.value }))}
                      placeholder="+ Add ticket"
                      aria-label={`Add ticket to ${col.name}`}
                    />
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {openTicketId && <NimroseTicketModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />}
    </div>
  );
};

const TicketCard = ({
  ticket,
  overdue,
  avatarUrl,
  onOpen,
}: {
  ticket: NimroseTicket;
  overdue: boolean;
  avatarUrl?: string | null;
  onOpen: () => void;
}) => (
  <div
    className={`nimrose-ticket-card ${overdue ? "nimrose-ticket-card--overdue" : ""}`}
    draggable
    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(ticket.id))}
    onClick={onOpen}
  >
    <div className="nimrose-ticket-card-top">
      <span className="nimrose-ticket-key">{ticket.key}</span>
      <span className={`nimrose-priority nimrose-priority--${ticket.priority}`}>{ticket.priority}</span>
    </div>
    <p className="nimrose-ticket-card-title">
      <span aria-hidden>{TICKET_TYPE_ICON[ticket.type] ?? "☑"}</span> {ticket.title}
    </p>
    {ticket.labels.length > 0 && (
      <div className="nimrose-ticket-card-labels">
        {ticket.labels.map((l) => (
          <span key={l} className="nimrose-chip">
            {l}
          </span>
        ))}
      </div>
    )}
    <div className="nimrose-ticket-card-footer">
      {ticket.storyPoints != null && <span className="nimrose-chip">{ticket.storyPoints} pts</span>}
      {ticket.dueDate && (
        <span className={overdue ? "nimrose-ticket-due nimrose-ticket-due--overdue" : "nimrose-ticket-due"}>
          {overdue ? "Overdue " : "Due "}
          {ticket.dueDate}
        </span>
      )}
      {ticket.commentCount > 0 && (
        <span className="nimrose-ticket-card-comments">
          <MessageSquare size={11} /> {ticket.commentCount}
        </span>
      )}
      {ticket.attachmentCount > 0 && (
        <span className="nimrose-ticket-card-comments">
          <Paperclip size={11} /> {ticket.attachmentCount}
        </span>
      )}
      {ticket.assignee && (
        <span className="nimrose-ticket-avatar-wrap">
          <UserAvatar name={ticket.assignee} avatarUrl={avatarUrl} size={20} />
        </span>
      )}
    </div>
  </div>
);

export default NimroseKanbanView;
