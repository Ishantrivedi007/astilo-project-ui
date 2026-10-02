import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchRegionalCoverage } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssCoverageExplorer = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "coverage", "regions"],
    queryFn: () => fetchRegionalCoverage(),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const regions = data?.data.regions ?? [];
  const maxRecords = Math.max(...regions.map((r) => r.records ?? 0), 1);

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Observation Gap Finder</p>
        <h1 className="abyss-title">Where do we know the least?</h1>
        <p className="abyss-tagline">
          Real OBIS occurrence counts per ocean region — not a fabricated "knowledge score". Fewer
          records doesn't mean less life, just less sampling.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-4">
          <AbyssSourceBadge source="OBIS statistics" />
          <AbyssConfidenceBadge confidence="OBSERVED" />
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Querying OBIS for each region (this can take a moment)…</p>}
      {isError && <p className="abyss-unavailable">Coverage data unavailable — backend may be offline.</p>}

      <div className="grid gap-3">
        {regions.map((r) => (
          <Reveal key={r.id}>
            <div className="abyss-card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold">{r.label}</p>
                <span className="abyss-unavailable">
                  {r.yearRange ? `${r.yearRange[0]}–${r.yearRange[1]}` : "—"}
                </span>
              </div>
              <div className="abyss-pop-bar-track" style={{ marginBottom: "0.6rem" }}>
                <div
                  className="abyss-pop-bar-fill abyss-pop-bar-fill--up"
                  style={{ left: 0, width: `${((r.records ?? 0) / maxRecords) * 100}%` }}
                />
              </div>
              <dl className="abyss-field-grid">
                <div className="abyss-field"><dt>Records</dt><dd>{r.records?.toLocaleString() ?? "—"}</dd></div>
                <div className="abyss-field"><dt>Species</dt><dd>{r.species?.toLocaleString() ?? "—"}</dd></div>
                <div className="abyss-field"><dt>Datasets</dt><dd>{r.datasets?.toLocaleString() ?? "—"}</dd></div>
              </dl>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default AbyssCoverageExplorer;
