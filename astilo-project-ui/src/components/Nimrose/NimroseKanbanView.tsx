import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Paperclip, Plus, Trash2 } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import {
  createNimroseProject,
  fetchNimroseProjects,
} from "../../lib/nimroseApi";
import {
  createBoardColumn,
  createSprint,
  createTicket,
  deleteBoardColumn,
  fetchBoardColumns,
  fetchSprints,
  fetchTickets,
  updateTicket,
  type NimroseTicket,
  type TicketStatus,
} from "../../lib/kanbanApi";
import NimroseTicketModal from "./NimroseTicketModal";
import { useNimrosePrompt } from "./NimrosePromptDialog";

const TYPE_ICON: Record<string, string> = {
  feature: "✦",
  bug: "🐞",
  task: "☑",
  improvement: "⬆",
  research: "🔍",
  design: "🎨",
  documentation: "📄",
};

type Preset = "all" | "mine" | "unassigned" | "critical";

const NimroseKanbanView = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prompt, alertInfo } = useNimrosePrompt();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprintId, setSprintId] = useState<number | "backlog" | null>(null);
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<Preset>("all");
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);
  const [draftByColumn, setDraftByColumn] = useState<Record<string, string>>({});
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const activeProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;

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

  const invalidateTickets = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tickets"] });

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => createNimroseProject(name),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "projects"] });
      setProjectId(project.id);
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
    if (sprintId === "backlog") list = list.filter((t) => !t.sprintId);
    return list;
  }, [allTickets, search, preset, user?.name, sprintId]);

  const byColumn = (slug: TicketStatus) => visibleTickets.filter((t) => t.status === slug);

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

        <input
          className="nimrose-kanban-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets…"
          aria-label="Search tickets"
        />
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

      <div className="nimrose-kanban-board">
        {columns.map((col) => (
          <div
            key={col.slug}
            className={`nimrose-kanban-column ${dragOverColumn === col.slug ? "nimrose-kanban-column--over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.slug);
            }}
            onDragLeave={() => setDragOverColumn((c) => (c === col.slug ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              const id = Number(e.dataTransfer.getData("text/plain"));
              if (id) moveMutation.mutate({ id, status: col.slug });
            }}
          >
            <div className="nimrose-kanban-column-header">
              <span>{col.name}</span>
              <span className="nimrose-widget-footnote">{byColumn(col.slug).length}</span>
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
              {byColumn(col.slug).map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onOpen={() => setOpenTicketId(ticket.id)} />
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
        ))}

        <div className="nimrose-kanban-column nimrose-kanban-column--add">
          <button
            type="button"
            className="nimrose-chip"
            onClick={async () => {
              const name = await prompt({ title: "New column", placeholder: "e.g. Testing, QA" });
              if (name?.trim()) addColumnMutation.mutate(name.trim());
            }}
          >
            <Plus size={12} /> Add column
          </button>
        </div>
      </div>

      {openTicketId && <NimroseTicketModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />}
    </div>
  );
};

const TicketCard = ({ ticket, onOpen }: { ticket: NimroseTicket; onOpen: () => void }) => (
  <div
    className="nimrose-ticket-card"
    draggable
    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(ticket.id))}
    onClick={onOpen}
  >
    <div className="nimrose-ticket-card-top">
      <span className="nimrose-ticket-key">{ticket.key}</span>
      <span className={`nimrose-priority nimrose-priority--${ticket.priority}`}>{ticket.priority}</span>
    </div>
    <p className="nimrose-ticket-card-title">
      <span aria-hidden>{TYPE_ICON[ticket.type] ?? "☑"}</span> {ticket.title}
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
      {ticket.assignee && <span className="nimrose-ticket-avatar">{ticket.assignee.slice(0, 1).toUpperCase()}</span>}
    </div>
  </div>
);

export default NimroseKanbanView;
