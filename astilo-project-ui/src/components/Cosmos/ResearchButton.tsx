import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { researchObject } from "../../lib/researchApi";
import { fetchResearchSummary, type CosmosObjectType } from "../../lib/cosmosApi";

interface ResearchButtonProps {
  objectType: CosmosObjectType;
  externalId: string;
  title: string;
  source: string;
  sourceDataset?: string;
  imageUrl?: string;
  data: unknown;
}

/** "Research this object" — the Cosmos<->Nimrose integration. One click
 * spins up a real Nimrose research project (a note pre-filled with the
 * object's data, source, and a real Wikipedia-sourced summary, a browser
 * Space with a starting search tab, and a task), then offers to jump
 * straight into it. Shows the summary right here too, so the result is
 * visible without leaving Cosmos. */
const ResearchButton = ({ objectType, externalId, title, source, sourceDataset, imageUrl, data }: ResearchButtonProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [summary, setSummary] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  const run = async () => {
    setState("working");
    try {
      const [, summaryEnvelope] = await Promise.all([
        researchObject({ objectType, externalId, title, source, sourceDataset, imageUrl, data }),
        fetchResearchSummary(title).catch(() => null),
      ]);
      setSummary(summaryEnvelope?.data.extract ?? null);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="cosmos-research-result">
        <button type="button" className="cosmos-chip" onClick={() => navigate(`${AppRoute.nimrose}?section=notes`)}>
          <span className="inline-flex items-center gap-1">
            <FlaskConical size={12} />
            Open research in Nimrose
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
