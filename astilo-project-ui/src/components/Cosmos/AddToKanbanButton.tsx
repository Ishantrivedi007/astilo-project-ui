import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KanbanSquare } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { createNimroseProject, fetchNimroseProjects } from "../../lib/nimroseApi";
import { createTicket } from "../../lib/kanbanApi";
import type { CosmosObjectType } from "../../lib/cosmosApi";

const COSMOS_PROJECT_NAME = "Cosmos Objects";

interface AddToKanbanButtonProps {
  objectType: CosmosObjectType;
  title: string;
  source: string;
  sourceDataset?: string;
}

/** Adds the object as a ticket on a dedicated "Cosmos Objects" Kanban
 * board — created on first use, reused after that — so a search result can
 * become a real tracked ticket without leaving Cosmos. */
const AddToKanbanButton = ({ objectType, title, source, sourceDataset }: AddToKanbanButtonProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<"idle" | "working" | "done">("idle");

  if (!isAuthenticated) return null;

  const run = async () => {
    setState("working");
    try {
      const projects = await fetchNimroseProjects();
      const project = projects.find((p) => p.name === COSMOS_PROJECT_NAME) ?? (await createNimroseProject(COSMOS_PROJECT_NAME));
      await createTicket({
        projectId: project.id,
        title,
        description: `From Cosmos — ${source}${sourceDataset ? ` (${sourceDataset})` : ""}.`,
        type: "research",
        labels: ["cosmos", objectType],
      });
      setState("done");
    } catch {
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <button type="button" className="cosmos-chip" onClick={() => navigate(`${AppRoute.nimrose}?section=kanban`)}>
        <span className="inline-flex items-center gap-1">
          <KanbanSquare size={12} />
          Open in Kanban
        </span>
      </button>
    );
  }

  return (
    <button type="button" className="cosmos-chip" disabled={state === "working"} onClick={run}>
      <span className="inline-flex items-center gap-1">
        <KanbanSquare size={12} />
        {state === "working" ? "Adding…" : "Add to Kanban"}
      </span>
    </button>
  );
};

export default AddToKanbanButton;
