import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchNimroseProjects } from "../../lib/nimroseApi";
import { fetchBoardColumns, fetchSprints, fetchTickets, updateTicket, type TicketPriority } from "../../lib/kanbanApi";

const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];

const NimroseBacklogView = () => {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<number | null>(null);

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const activeProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;

  // "Backlog" here means whatever the project's first (lowest-position)
  // column is — not a hardcoded "backlog" slug, since columns are
  // user-defined and that first column could be renamed or reordered.
  const columnsQuery = useQuery({
    queryKey: ["nimrose", "board-columns", activeProjectId],
    queryFn: () => fetchBoardColumns(activeProjectId!),
    enabled: !!activeProjectId,
  });
  const firstColumn = columnsQuery.data?.[0];
  const secondColumn = columnsQuery.data?.[1];

  const ticketsQuery = useQuery({
    queryKey: ["nimrose", "tickets", activeProjectId, "backlog", firstColumn?.slug],
    queryFn: () => fetchTickets({ projectId: activeProjectId!, status: firstColumn!.slug }),
    enabled: !!activeProjectId && !!firstColumn,
  });

  const sprintsQuery = useQuery({
    queryKey: ["nimrose", "sprints", activeProjectId],
    queryFn: () => fetchSprints(activeProjectId!),
    enabled: !!activeProjectId,
  });
  const activeSprints = sprintsQuery.data?.filter((s) => s.status !== "completed") ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateTicket>[1] }) => updateTicket(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tickets"] }),
  });

  const tickets = ticketsQuery.data ?? [];

  if (!projectsQuery.isLoading && projectsQuery.data?.length === 0) {
    return (
      <div>
        <div className="nimrose-home-header">
          <div>
            <p className="nimrose-eyebrow">Projects</p>
            <h1 className="nimrose-page-title">Backlog</h1>
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
          <h1 className="nimrose-page-title">Backlog</h1>
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
        <span className="nimrose-widget-footnote">{tickets.length} ungroomed ticket{tickets.length === 1 ? "" : "s"}</span>
      </div>

      {tickets.length === 0 && <p className="nimrose-widget-empty">Backlog is empty — nice.</p>}

      <ul className="nimrose-full-task-list">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="glass-card nimrose-full-task-item">
            <div className="nimrose-full-task-body">
              <p>
                <span className="nimrose-ticket-key">{ticket.key}</span> {ticket.title}
              </p>
              <div className="nimrose-full-task-meta">
                <select
                  value={ticket.priority}
                  onChange={(e) => updateMutation.mutate({ id: ticket.id, patch: { priority: e.target.value as TicketPriority } })}
                  aria-label="Priority"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    updateMutation.mutate({
                      id: ticket.id,
                      patch: { sprintId: Number(e.target.value), status: secondColumn?.slug ?? firstColumn?.slug },
                    });
                  }}
                  aria-label="Assign to sprint"
                >
                  <option value="">Assign to sprint…</option>
                  {activeSprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NimroseBacklogView;
