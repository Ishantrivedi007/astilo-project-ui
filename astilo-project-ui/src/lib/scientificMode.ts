/** Abyss's global Scientific Mode toggle (blueprint section 70): "Normal
 * users see beautiful exploration. Advanced users see actual data." A tiny
 * persisted external store, same pattern as nereusContext.ts — no
 * Zustand/Redux, consistent with this codebase's conventions. */

const STORAGE_KEY = "abyss_scientific_mode";
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let state = readStored();

export function setScientificMode(enabled: boolean): void {
  state = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage unavailable — the toggle just won't persist across reloads.
  }
  listeners.forEach((l) => l());
}

export function getScientificMode(): boolean {
  return state;
}

export function subscribeScientificMode(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
