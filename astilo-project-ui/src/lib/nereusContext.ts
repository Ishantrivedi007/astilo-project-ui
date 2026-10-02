/** Nereus's Context Engine (blueprint section 53) — a tiny external store so
 * any Abyss page can tell Nereus "this is what the user is currently
 * looking at" without prop-drilling or adding Zustand/Redux (this codebase
 * uses plain state + TanStack Query elsewhere). AbyssNereus reads this via
 * useNereusContext() and pre-fills its context inputs, while still letting
 * the user override them manually. */

export interface NereusContextState {
  module?: string;
  depth?: number;
  selectedSpecies?: string;
  selectedSpeciesAphiaId?: number;
}

let state: NereusContextState = {};
const listeners = new Set<() => void>();

export function setNereusContext(patch: Partial<NereusContextState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function clearNereusContext(keys: (keyof NereusContextState)[]) {
  const next = { ...state };
  for (const key of keys) delete next[key];
  state = next;
  listeners.forEach((l) => l());
}

export function getNereusContext(): NereusContextState {
  return state;
}

export function subscribeNereusContext(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
