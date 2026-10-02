/** Shared achievement definitions for Abyss's Expedition Mode, backed by
 * the same real, locally-tracked stats as expeditionProgress.ts (max depth
 * actually reached, real Codex contents) — never fabricated progress.
 * checkAchievements() is idempotent and only reports an achievement once,
 * so callers can safely fire a toast on every newly-unlocked result without
 * re-notifying on every render. */

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  target: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "into-darkness", label: "Into Darkness", description: "Reach 1,000 m", target: 1000 },
  { id: "abysswalker", label: "Abysswalker", description: "Reach 4,000 m", target: 4000 },
  { id: "hadal-explorer", label: "Hadal Explorer", description: "Reach 6,000 m", target: 6000 },
  { id: "taxonomist", label: "Taxonomist", description: "Save 10 species to your Codex", target: 10 },
  { id: "naturalist", label: "Naturalist", description: "Save 3 different kinds of discoveries", target: 3 },
];

const UNLOCKED_KEY = "abyss_unlocked_achievements";

function getUnlocked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(UNLOCKED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveUnlocked(set: Set<string>): void {
  try {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set]));
  } catch {
    // Storage unavailable — unlocks just won't persist this session.
  }
}

export function isUnlocked(id: string): boolean {
  return getUnlocked().has(id);
}

export interface AchievementStats {
  maxDepth: number;
  speciesCount: number;
  distinctTypes: number;
}

/** Marks any achievement satisfied by `stats` as unlocked, and returns only
 * the ones that newly crossed their threshold on this call. Stats the
 * caller doesn't have yet (e.g. a page with no Codex data) can be passed as
 * 0 — that only skips those achievements this call, it never un-unlocks
 * one a different page already earned. */
export function checkAchievements(stats: AchievementStats): AchievementDef[] {
  const satisfied: Record<string, boolean> = {
    "into-darkness": stats.maxDepth >= 1000,
    "abysswalker": stats.maxDepth >= 4000,
    "hadal-explorer": stats.maxDepth >= 6000,
    "taxonomist": stats.speciesCount >= 10,
    "naturalist": stats.distinctTypes >= 3,
  };

  const unlocked = getUnlocked();
  const newlyUnlocked: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (satisfied[def.id] && !unlocked.has(def.id)) {
      unlocked.add(def.id);
      newlyUnlocked.push(def);
    }
  }
  if (newlyUnlocked.length > 0) saveUnlocked(unlocked);
  return newlyUnlocked;
}
