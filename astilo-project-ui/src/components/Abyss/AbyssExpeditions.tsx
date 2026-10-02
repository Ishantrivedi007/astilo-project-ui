import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Lock } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchCodex } from "../../lib/abyssApi";
import { getMaxDepthReached } from "../../lib/expeditionProgress";
import { ACHIEVEMENTS, checkAchievements } from "../../lib/achievements";
import "./Abyss.scss";

/** Every achievement here checks against something the user actually did —
 * max depth really reached in Depth Descent (localStorage), real Codex
 * contents from the backend — never a fabricated or client-only "fake"
 * progress number. "Naturalist" is adapted from the blueprint's "explore
 * all major habitats" to "save 3+ different kinds of discoveries", since
 * Abyss doesn't yet have a separate Habitat Explorer to track against. */
const AbyssExpeditions = () => {
  const navigate = useNavigate();
  const maxDepth = getMaxDepthReached();

  const { data: codex, isError } = useQuery({
    queryKey: ["abyss", "codex"],
    queryFn: () => fetchCodex(),
    retry: false,
  });

  const speciesCount = codex?.filter((c) => c.objectType === "species").length ?? 0;
  const distinctTypes = new Set(codex?.map((c) => c.objectType)).size;

  useEffect(() => {
    if (!codex) return;
    const unlocked = checkAchievements({ maxDepth, speciesCount, distinctTypes });
    unlocked.forEach((a) => toast.success(`Achievement unlocked: ${a.label}`, { description: a.description }));
  }, [codex, maxDepth, speciesCount, distinctTypes]);

  const achievements = ACHIEVEMENTS.map((def) => ({
    ...def,
    progress: def.id === "taxonomist" ? speciesCount : def.id === "naturalist" ? distinctTypes : maxDepth,
  }));

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Expeditions</p>
        <h1 className="abyss-title">Your exploration record.</h1>
        <p className="abyss-tagline">
          Tracked locally from what you've actually done — real depth reached, real species saved.
          No external service, no fabricated progress.
        </p>
      </Reveal>

      {isError && (
        <p className="abyss-unavailable mt-4">Sign in to track Codex-based achievements (Taxonomist, Naturalist).</p>
      )}

      <div className="grid gap-3 mt-6">
        {achievements.map((a) => {
          const unlocked = a.progress >= a.target;
          const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
          return (
            <Reveal key={a.id}>
              <div className="abyss-card flex items-center gap-4">
                <div style={{ flexShrink: 0 }}>
                  {unlocked ? <Check size={22} color="#5eead4" /> : <Lock size={22} color="rgba(228,246,245,0.3)" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold">{a.label}</p>
                    <span className="abyss-unavailable">
                      {Math.min(a.progress, a.target).toLocaleString()} / {a.target.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-2">{a.description}</p>
                  <div className="abyss-pop-bar-track">
                    <div className="abyss-pop-bar-fill abyss-pop-bar-fill--up" style={{ left: 0, width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

export default AbyssExpeditions;
