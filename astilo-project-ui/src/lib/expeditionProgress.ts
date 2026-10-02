/** Real, locally-tracked exploration progress backing Abyss's Expedition
 * Mode achievements (blueprint section 45: "Store locally. No external
 * service required."). Every value here reflects something the user
 * actually did in the app — max depth really reached in Depth Descent —
 * never a fabricated stat. Wrapped in try/catch since localStorage can
 * throw in private browsing / blocked-storage contexts. */

const MAX_DEPTH_KEY = "abyss_max_depth_reached_m";

export function recordDepthReached(depthMeters: number): void {
  try {
    const current = Number(localStorage.getItem(MAX_DEPTH_KEY) ?? "0");
    if (depthMeters > current) {
      localStorage.setItem(MAX_DEPTH_KEY, String(depthMeters));
    }
  } catch {
    // Storage unavailable — achievements simply won't persist this session.
  }
}

export function getMaxDepthReached(): number {
  try {
    return Number(localStorage.getItem(MAX_DEPTH_KEY) ?? "0");
  } catch {
    return 0;
  }
}
