import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { researchObject } from "../../lib/researchApi";
import type { CosmosObjectType } from "../../lib/cosmosApi";

interface ResearchButtonProps {
  objectType: CosmosObjectType;
  externalId: string;
  title: string;
  source: string;
  sourceDataset?: string;
  imageUrl?: string;
  data: unknown;
}

/** "Research this object" — the Cosmos<->Research integration. One click
 * spins up a full research workspace: an automated brief (real
 * Wikipedia-sourced summary, key points, further-research checklist), a
 * Nimrose project, a browser Space with a starting search tab, and a task.
 * Shows the summary right here too, then offers to open the full Research
 * page (not just a Note) for that object. */
const ResearchButton = ({ objectType, externalId, title, source, sourceDataset, imageUrl, data }: ResearchButtonProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);

  if (!isAuthenticated) return null;

  const run = async () => {
    setState("working");
    try {
      const result = await researchObject({ objectType, externalId, title, source, sourceDataset, imageUrl, data });
      setSummary(result.cosmosItem.researchBrief?.summary ?? null);
      setItemId(result.cosmosItem.id);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="cosmos-research-result">
        <button type="button" className="cosmos-chip" onClick={() => navigate(`${AppRoute.researchDetail}/${itemId}`)}>
          <span className="inline-flex items-center gap-1">
            <FlaskConical size={12} />
            Open full research page
          </span>
        </button>
        {summary && <p className="cosmos-research-summary">{summary}</p>}
      </div>
    );
  }

  return (
    <button type="button" className="cosmos-chip" disabled={state === "working"} onClick={run}>
      <span className="inline-flex items-center gap-1">
        <FlaskConical size={12} />
        {state === "working" ? "Setting up…" : "Research this object"}
      </span>
    </button>
  );
};

export default ResearchButton;
