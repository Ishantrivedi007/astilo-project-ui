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

/** "Research this object" — the Cosmos<->Nimrose integration. One click
 * spins up a real Nimrose research project (note pre-filled with the
 * object's data + source, a browser Space with a starting search tab, and
 * a task), then offers to jump straight into it. */
const ResearchButton = ({ objectType, externalId, title, source, sourceDataset, imageUrl, data }: ResearchButtonProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<"idle" | "working" | "done">("idle");

  if (!isAuthenticated) return null;

  const run = async () => {
    setState("working");
    try {
      await researchObject({ objectType, externalId, title, source, sourceDataset, imageUrl, data });
      setState("done");
    } catch {
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <button type="button" className="cosmos-chip" onClick={() => navigate(`${AppRoute.nimrose}?section=notes`)}>
        <span className="inline-flex items-center gap-1">
          <FlaskConical size={12} />
          Open research in Nimrose
        </span>
      </button>
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
