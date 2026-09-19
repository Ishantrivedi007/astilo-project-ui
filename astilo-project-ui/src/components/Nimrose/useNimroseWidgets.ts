import { useCallback, useEffect, useState } from "react";

export interface WidgetDef {
  id: string;
  label: string;
}

const STORAGE_KEY = "nimrose-home-widgets-v1";

const DEFAULT_WIDGETS: WidgetDef[] = [
  { id: "today", label: "Today" },
  { id: "focus", label: "Focus timer" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Recent notes" },
  { id: "music", label: "Music player" },
  { id: "quickLinks", label: "Quick links" },
  { id: "calendar", label: "Calendar events" },
  { id: "projects", label: "Projects" },
  { id: "browserTabs", label: "Recent browser tabs" },
  { id: "notifications", label: "Notifications" },
];

interface StoredState {
  order: string[];
  hidden: string[];
}

const readStored = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as StoredState;
    // Merge in any widgets added since this was saved (new app version).
    const known = new Set(parsed.order);
    const merged = [...parsed.order, ...DEFAULT_WIDGETS.map((w) => w.id).filter((id) => !known.has(id))];
    return { order: merged, hidden: parsed.hidden ?? [] };
  } catch {
    return { order: DEFAULT_WIDGETS.map((w) => w.id), hidden: [] };
  }
};

/** Drives the Nimrose Home widget grid: which widgets exist, their order,
 * and which are hidden — all persisted locally per browser/device. */
export function useNimroseWidgets() {
  const [state, setState] = useState<StoredState>(() => readStored());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // best-effort — a full/blocked localStorage shouldn't break the page
    }
  }, [state]);

  const widgetsById = Object.fromEntries(DEFAULT_WIDGETS.map((w) => [w.id, w]));

  const visibleWidgets = state.order.filter((id) => !state.hidden.includes(id) && widgetsById[id]);
  const hiddenWidgets = state.order.filter((id) => state.hidden.includes(id) && widgetsById[id]);

  const toggleHidden = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id) ? prev.hidden.filter((h) => h !== id) : [...prev.hidden, id],
    }));
  }, []);

  const reorder = useCallback((newOrder: string[]) => {
    setState((prev) => {
      // Only the visible slice is reorderable via drag; splice it back into
      // the full order so hidden widgets keep their relative position.
      const hiddenSet = new Set(prev.hidden);
      const hiddenInOrder = prev.order.filter((id) => hiddenSet.has(id));
      return { ...prev, order: [...newOrder, ...hiddenInOrder] };
    });
  }, []);

  return {
    allWidgets: DEFAULT_WIDGETS,
    widgetsById,
    visibleWidgets,
    hiddenWidgets,
    toggleHidden,
    reorder,
  };
}
