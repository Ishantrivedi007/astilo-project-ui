import { useSyncExternalStore } from "react";
import { getScientificMode, subscribeScientificMode } from "./scientificMode";

export function useScientificMode(): boolean {
  return useSyncExternalStore(subscribeScientificMode, getScientificMode);
}
