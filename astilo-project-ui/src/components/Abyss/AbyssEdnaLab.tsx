import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchEdnaSample, searchSpecies, type EdnaMatch } from "../../lib/abyssApi";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const STEPS = ["Collect water", "Filter", "Extract DNA", "Amplify", "Sequence", "Compare", "Identify"];

const AbyssEdnaLab = () => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EdnaMatch[] | null>(null);
  const [aphiaIds, setAphiaIds] = useState<Record<string, number>>({});

  const runWorkflow = async () => {
    setRunning(true);
    setMatches(null);
    setStepIndex(-1);
    for (let i = 0; i < STEPS.length; i++) {
      setStepIndex(i);
      await new Promise((r) => setTimeout(r, 450));
    }
    try {
      const res = await fetchEdnaSample();
      setSampleId(res.data.sampleId);
      setMatches(res.data.matches);

      const lookups = res.data.matches
        .filter((m) => m.scientificName)
        .map(async (m) => {
          const search = await searchSpecies(m.scientificName!, 1).catch(() => null);
          const aphiaId = search?.data.results[0]?.aphiaId;
          if (aphiaId) setAphiaIds((prev) => ({ ...prev, [m.scientificName!]: aphiaId }));
        });
      await Promise.all(lookups);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ eDNA Detective</p>
        <h1 className="abyss-title">Environmental DNA.</h1>
        <p className="abyss-tagline">
          A simulated educational workflow — Astilo has no real sequencer. Match percentages are
          randomly generated each run; the candidate species named are always real and
          independently verifiable via WoRMS.
        </p>
      </Reveal>

      <Reveal>
        <div className="abyss-card mt-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {STEPS.map((step, i) => (
              <span
                key={step}
                className="abyss-source-badge"
                style={i <= stepIndex ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              >
                {i < stepIndex || (!running && matches) ? <Check size={11} /> : null}
                {step}
              </span>
            ))}
          </div>
          <button type="button" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }} onClick={runWorkflow} disabled={running}>
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Running…
              </>
            ) : (
              <span>Run eDNA workflow</span>
            )}
          </button>
        </div>
      </Reveal>

      {matches && (
        <Reveal>
          <div className="abyss-card mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Sample {sampleId}</p>
              <AbyssConfidenceBadge confidence="SIMULATED" />
            </div>
            <div className="abyss-table-wrap">
              <table className="abyss-table">
                <thead>
                  <tr>
                    <th>Species match</th>
                    <th>Confidence</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => (
                    <tr key={i}>
                      <td className={m.scientificName ? "italic" : undefined}>{m.scientificName ?? "Unknown"}</td>
                      <td>{m.matchPercent}%</td>
                      <td>
                        {m.scientificName && aphiaIds[m.scientificName] && (
                          <button type="button" className="abyss-source-badge" onClick={() => navigate(`${AppRoute.abyssSpecies}/${aphiaIds[m.scientificName!]}`)}>
                            View real profile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssEdnaLab;
