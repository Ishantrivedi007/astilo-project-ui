import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { askNereus, buildKnowledgeBase, fetchKnowledgeBaseStatus, fetchNereusStatus, type NereusAnswer, type NereusMode } from "../../lib/abyssApi";
import { useNereusContext } from "../../lib/useNereusContext";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const MODES: { id: NereusMode; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "learn", label: "Learn" },
  { id: "scientist", label: "Scientist" },
  { id: "guide", label: "Guide" },
  { id: "quiz", label: "Quiz" },
  { id: "explain", label: "Explain" },
  { id: "compare", label: "Compare" },
];

interface Turn {
  question: string;
  result: NereusAnswer;
}

const AbyssNereus = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const liveContext = useNereusContext();
  const [mode, setMode] = useState<NereusMode>("ask");
  const [question, setQuestion] = useState("");
  const [depthOverride, setDepthOverride] = useState("");
  const [speciesOverride, setSpeciesOverride] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const { data: statusEnv } = useQuery({
    queryKey: ["abyss", "nereus", "status"],
    queryFn: () => fetchNereusStatus(),
    staleTime: 1000 * 30,
    retry: false,
  });

  const { data: kbStatusEnv } = useQuery({
    queryKey: ["abyss", "knowledge", "status"],
    queryFn: () => fetchKnowledgeBaseStatus(),
    staleTime: 1000 * 30,
    retry: false,
  });

  const buildKbMutation = useMutation({
    mutationFn: () => buildKnowledgeBase(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["abyss", "knowledge", "status"] }),
  });

  // The Context Engine (lib/nereusContext.ts) carries whatever the user was
  // last looking at elsewhere in Abyss; the override inputs below let the
  // user replace it for this question without losing that automatic context.
  const effectiveDepth = depthOverride ? Number(depthOverride) : liveContext.depth;
  const effectiveSpecies = speciesOverride || liveContext.selectedSpecies;

  const askMutation = useMutation({
    mutationFn: (q: string) =>
      askNereus(q, mode, {
        depth: effectiveDepth,
        selectedSpecies: effectiveSpecies,
        selectedSpeciesAphiaId: speciesOverride ? undefined : liveContext.selectedSpeciesAphiaId,
      }),
    onSuccess: (res, q) => setTurns((prev) => [...prev, { question: q, result: res.data }]),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || askMutation.isPending) return;
    askMutation.mutate(trimmed);
    setQuestion("");
  };

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Nereus</p>
        <h1 className="abyss-title">Astilo Ocean Intelligence.</h1>
        <p className="abyss-tagline">
          Runs entirely on a local model via Ollama — no paid API. Nereus always answers from real
          retrieved context (depth zones, WoRMS taxonomy), never from memory alone.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap items-center gap-2 mt-4 mb-2">
          {statusEnv && (
            <>
              <span className="abyss-source-badge" style={{ color: statusEnv.data.online ? "#5eead4" : "#fb7185" }}>
                {statusEnv.data.online ? `Online — ${statusEnv.data.model}` : "Offline"}
              </span>
              {!statusEnv.data.online && (
                <span className="abyss-unavailable">
                  Install Ollama and run `ollama pull {statusEnv.data.model}` to enable Nereus.
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {kbStatusEnv && (
            <span className="abyss-source-badge">
              {kbStatusEnv.data.built ? `RAG: ${kbStatusEnv.data.chunkCount} chunks indexed` : "RAG: not built"}
            </span>
          )}
          <button type="button" className="abyss-source-badge" onClick={() => buildKbMutation.mutate()} disabled={buildKbMutation.isPending}>
            {buildKbMutation.isPending ? "Building…" : kbStatusEnv?.data.built ? "Rebuild knowledge base" : "Build knowledge base"}
          </button>
        </div>
        {(liveContext.selectedSpecies || liveContext.depth !== undefined) && (
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-white/50">
            <span>Auto-context from your last page:</span>
            {liveContext.selectedSpecies && <span className="abyss-source-badge">{liveContext.selectedSpecies}</span>}
            {liveContext.depth !== undefined && <span className="abyss-source-badge">{liveContext.depth}m</span>}
          </div>
        )}
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap gap-2 mb-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="abyss-source-badge"
              style={mode === m.id ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            className="abyss-search-input"
            style={{ maxWidth: 220, padding: "0.5rem 0.8rem", borderRadius: "0.6rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.82rem" }}
            type="number"
            placeholder={liveContext.depth !== undefined ? `Override depth (auto: ${liveContext.depth}m)` : "Context: depth (m)"}
            value={depthOverride}
            onChange={(e) => setDepthOverride(e.target.value)}
          />
          <input
            className="abyss-search-input"
            style={{ maxWidth: 260, padding: "0.5rem 0.8rem", borderRadius: "0.6rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.82rem" }}
            type="text"
            placeholder={liveContext.selectedSpecies ? `Override species (auto: ${liveContext.selectedSpecies})` : "Context: species name"}
            value={speciesOverride}
            onChange={(e) => setSpeciesOverride(e.target.value)}
          />
        </div>
      </Reveal>

      <div className="flex flex-col gap-4 mb-4">
        {turns.map((turn, i) => (
          <Reveal key={i}>
            <div className="abyss-card">
              <p className="text-sm font-semibold mb-2">{turn.question}</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap mb-3">{turn.result.answer}</p>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <AbyssSourceBadge source={turn.result.offline ? "Nereus (offline)" : "Astilo Nereus"} />
                <AbyssConfidenceBadge confidence={turn.result.offline ? "UNKNOWN" : "AI_INFERRED"} />
              </div>
              {turn.result.sources.length > 0 && (
                <div className="flex flex-col gap-1">
                  {turn.result.sources.map((s, si) => (
                    <p key={si} className="abyss-unavailable" style={{ fontStyle: "normal" }}>
                      <strong style={{ color: "rgba(228,246,245,0.6)" }}>{s.label}:</strong> {s.text}{" "}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#67e8f9" }}>
                          source
                        </a>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="abyss-search-input"
          style={{ flex: 1, padding: "0.85rem 1.1rem", borderRadius: "0.85rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.95rem" }}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Nereus anything about the ocean…"
        />
        <button type="submit" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }} disabled={askMutation.isPending} aria-label="Ask Nereus">
          {askMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};

export default AbyssNereus;
