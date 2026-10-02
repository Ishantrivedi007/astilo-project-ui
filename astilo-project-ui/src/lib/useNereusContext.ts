import { useSyncExternalStore } from "react";
import { getNereusContext, subscribeNereusContext, type NereusContextState } from "./nereusContext";

/** Reads Nereus's current cross-page context, re-rendering when any page
 * updates it (see nereusContext.ts). */
export function useNereusContext(): NereusContextState {
  return useSyncExternalStore(subscribeNereusContext, getNereusContext);
}
