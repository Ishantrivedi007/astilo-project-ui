import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchResearchItems } from "../../lib/researchApi";
import "./Research.scss";

const ResearchHome = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["research", "list"], queryFn: fetchResearchItems });

  const items = data ?? [];

  return (
    <div className="research-page">
      <p className="research-eyebrow">✦ Research</p>
      <h1 className="research-title">
        <FlaskConical size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Your research workspaces
      </h1>
      <p className="research-tagline">
        Every object you've researched from Cosmos, each with an automated summary, key points, a
        further-research checklist, and your own documents — start one from any object's "Research this
        object" button.
      </p>

      {isLoading && <p className="research-empty">Loading…</p>}
      {!isLoading && items.length === 0 && (
        <p className="research-empty">
          No research workspaces yet. Open Cosmos, find an object, and click "Research this object" to start one.
        </p>
      )}

      <div className="research-grid">
        {items.map((item) => {
          const stepsTotal = item.researchBrief?.nextSteps.length ?? 0;
          const stepsDone = item.researchBrief?.nextSteps.filter((s) => s.done).length ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              className="research-card"
              onClick={() => navigate(`${AppRoute.researchDetail}/${item.id}`)}
            >
              {item.imageUrl && <img className="research-card-thumb" src={item.imageUrl} alt={item.title} />}
              <p className="research-card-title">{item.title}</p>
              <p className="research-card-meta">
                {item.objectType} · {item.source ?? "Unknown source"}
              </p>
              <div className="research-card-stats">
                {stepsTotal > 0 && (
                  <span className="research-pill">
                    {stepsDone}/{stepsTotal} researched
                  </span>
                )}
                <span className="research-pill">{item.documentCount} document{item.documentCount === 1 ? "" : "s"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ResearchHome;
