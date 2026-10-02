import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchMysteryPuzzle, guessMysteryPuzzle, searchSpecies } from "../../lib/abyssApi";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssMysteryLab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ correct: boolean; answerScientificName: string; answerAphiaId?: number } | null>(null);

  const { data: puzzleEnv, isLoading, isError } = useQuery({
    queryKey: ["abyss", "mystery", "puzzle"],
    queryFn: () => fetchMysteryPuzzle(),
    retry: false,
  });

  const guessMutation = useMutation({
    mutationFn: async (scientificName: string) => {
      const res = await guessMysteryPuzzle(puzzleEnv!.data.puzzleId, scientificName);
      const search = await searchSpecies(res.data.answerScientificName, 1).catch(() => null);
      return { ...res.data, answerAphiaId: search?.data.results[0]?.aphiaId };
    },
    onSuccess: (data) => setResult(data),
  });

  const nextPuzzle = () => {
    setResult(null);
    queryClient.invalidateQueries({ queryKey: ["abyss", "mystery", "puzzle"] });
  };

  const puzzle = puzzleEnv?.data;

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Mystery Species Laboratory</p>
        <h1 className="abyss-title">Investigate the evidence.</h1>
        <p className="abyss-tagline">
          A reasoning puzzle built from real, WoRMS-resolvable species — but which clues are
          available and which species is correct are randomized each round, so this is always a
          simulation, never an identification of a real specimen.
        </p>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-6">Loading puzzle…</p>}
      {isError && <p className="abyss-unavailable mt-6">Puzzle unavailable — backend may be offline.</p>}

      {puzzle && (
        <Reveal>
          <div className="abyss-card mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Case #{puzzle.puzzleId} — {puzzle.zoneLabel}</p>
              <AbyssConfidenceBadge confidence="SIMULATED" />
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {puzzle.evidence.map((e) => (
                <span key={e.type} className="abyss-source-badge" style={!e.available ? { opacity: 0.35 } : undefined}>
                  {e.available ? <Check size={11} /> : <X size={11} />}
                  {e.type}
                </span>
              ))}
            </div>

            {!result && (
              <div className="grid gap-2 sm:grid-cols-2">
                {puzzle.options.map((opt) => (
                  <button
                    key={opt.scientificName}
                    type="button"
                    className="abyss-nav-tile"
                    onClick={() => guessMutation.mutate(opt.scientificName)}
                    disabled={guessMutation.isPending}
                  >
                    <span className="italic">{opt.scientificName}</span>
                    <span className="text-xs text-white/50">{opt.commonName}</span>
                  </button>
                ))}
              </div>
            )}

            {result && (
              <div>
                <p className={`text-lg font-bold mb-2 ${result.correct ? "text-emerald-300" : "text-amber-300"}`}>
                  {result.correct ? "Correct!" : "Not quite."}
                </p>
                <p className="text-sm text-white/70 mb-3">
                  The species was <span className="italic font-semibold">{result.answerScientificName}</span>.
                </p>
                <div className="flex gap-2">
                  {result.answerAphiaId && (
                    <button type="button" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }} onClick={() => navigate(`${AppRoute.abyssSpecies}/${result.answerAphiaId}`)}>
                      View real profile
                    </button>
                  )}
                  <button type="button" className="abyss-source-badge" onClick={nextPuzzle}>
                    Next case
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssMysteryLab;
