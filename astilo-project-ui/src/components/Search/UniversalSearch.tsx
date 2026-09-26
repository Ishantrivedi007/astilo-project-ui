import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  Bell,
  BookOpen,
  CheckSquare,
  History,
  Home,
  KanbanSquare,
  NotebookText,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { MODULE_NAV } from "../../app/moduleNav";
import { useAuth } from "../../auth/AuthProvider";
import { fetchGlobalSearch } from "../../lib/searchApi";
import { createNimroseNote, createNimroseTask, fetchNimroseProjects } from "../../lib/nimroseApi";
import { createTicket } from "../../lib/kanbanApi";
import { useNimrosePrompt } from "../Nimrose/NimrosePromptDialog";

export const UNIVERSAL_SEARCH_OPEN_EVENT = "astilo:open-universal-search";
export const openUniversalSearch = () => window.dispatchEvent(new Event(UNIVERSAL_SEARCH_OPEN_EVENT));

interface NavCommand {
  id: string;
  label: string;
  hint: string;
  icon: typeof Home;
  route: string;
}

// Every module + its sub-pages, flattened from the same MODULE_NAV the
// sidebar renders as grouped rail + flyouts — one source of truth so the
// two surfaces can't list different sets of pages.
const MODULE_COMMANDS: NavCommand[] = MODULE_NAV.flatMap((mod) => [
  { id: `nav-${mod.id}`, label: mod.label, hint: "go to", icon: mod.icon, route: mod.route },
  ...mod.children.map((child) => ({
    id: `nav-${child.id}`,
    label: `${mod.label} · ${child.label}`,
    hint: "go to",
    icon: child.icon,
    route: child.route,
  })),
]);

const STANDALONE_COMMANDS: NavCommand[] = [
  { id: "nav-home", label: "Home", hint: "go to", icon: Home, route: AppRoute.home },
  { id: "nav-notifications", label: "Notifications", hint: "go to", icon: Bell, route: AppRoute.notifications },
  { id: "nav-activity-timeline", label: "Activity Timeline", hint: "go to", icon: History, route: AppRoute.activityTimeline },
  { id: "nav-vault", label: "Vault", hint: "go to", icon: Archive, route: AppRoute.vault },
  { id: "nav-profile", label: "Profile", hint: "go to", icon: User, route: AppRoute.profile },
];

const NAV_COMMANDS: NavCommand[] = [STANDALONE_COMMANDS[0], ...MODULE_COMMANDS, ...STANDALONE_COMMANDS.slice(1)];

interface ResultItem {
  id: string;
  label: string;
  subtitle: string;
  icon: typeof Home;
  onSelect: () => void;
}

const UniversalSearch = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { prompt } = useNimrosePrompt();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setHighlight(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openHandler = () => {
      setOpen(true);
      setQuery("");
      setHighlight(0);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener(UNIVERSAL_SEARCH_OPEN_EVENT, openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener(UNIVERSAL_SEARCH_OPEN_EVENT, openHandler);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => fetchGlobalSearch(debounced),
    enabled: open && debounced.length >= 2,
    staleTime: 1000 * 30,
  });

  const go = (route: string) => {
    setOpen(false);
    setQuery("");
    navigate(route);
  };

  const closeAndRun = (run: () => void | Promise<void>) => {
    setOpen(false);
    setQuery("");
    run();
  };

  // "Create X" actions — reachable from anywhere, not just inside Nimrose,
  // since NimrosePromptProvider is mounted app-wide (see main.tsx). Same
  // create calls NimroseCommandPalette uses internally; kept separate
  // rather than shared since that palette is scoped to Nimrose's own
  // onNavigate(section) callback, not a route.
  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects, enabled: open });
  const createTaskMutation = useMutation({
    mutationFn: createNimroseTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tasks"] }),
  });
  const createNoteMutation = useMutation({
    mutationFn: createNimroseNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] }),
  });
  const createTicketMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tickets"] }),
  });

  const actionResults: ResultItem[] = useMemo(() => {
    const firstProject = projectsQuery.data?.[0];
    const actions: { id: string; label: string; hint: string; run: () => void | Promise<void> }[] = [
      {
        id: "action-create-task",
        label: "Create task…",
        hint: "Nimrose",
        run: async () => {
          const title = await prompt({ title: "New task", placeholder: "What needs doing?" });
          if (title?.trim()) {
            createTaskMutation.mutate({ title: title.trim() });
            navigate(`${AppRoute.nimrose}?section=tasks`);
          }
        },
      },
      {
        id: "action-create-note",
        label: "Create note…",
        hint: "Nimrose",
        run: async () => {
          const title = await prompt({ title: "New note", placeholder: "Untitled note" });
          createNoteMutation.mutate({ title: title?.trim() || "Untitled note" });
          navigate(`${AppRoute.nimrose}?section=notes`);
        },
      },
      {
        id: "action-create-ticket",
        label: "Create ticket…",
        hint: firstProject ? `in ${firstProject.name}` : "needs a project first",
        run: async () => {
          if (!firstProject) {
            toast.error("Create a project in Nimrose Kanban first.");
            return;
          }
          const title = await prompt({ title: "New ticket", placeholder: "Ticket title" });
          if (title?.trim()) {
            createTicketMutation.mutate({ projectId: firstProject.id, title: title.trim() });
            navigate(`${AppRoute.nimrose}?section=kanban&project=${firstProject.id}`);
          }
        },
      },
    ];
    const q = query.trim().toLowerCase();
    const matches = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
    return matches.map((a) => ({
      id: a.id,
      label: a.label,
      subtitle: a.hint,
      icon: Plus,
      onSelect: () => closeAndRun(a.run),
    }));
  }, [query, projectsQuery.data, prompt, createTaskMutation, createNoteMutation, createTicketMutation, navigate]);

  const navResults: ResultItem[] = useMemo(() => {
    const commands = isAdmin
      ? [...NAV_COMMANDS, { id: "nav-admin", label: "Admin", hint: "go to", icon: ShieldCheck, route: AppRoute.admin }]
      : NAV_COMMANDS;
    const q = query.trim().toLowerCase();
    // Blank query: just the top-level modules (label has no "·" sub-module
    // marker), so the palette opens to a short, scannable list instead of
    // dumping every sub-page at once. Typing filters over the full set,
    // sub-modules included, by label substring.
    const matches = q
      ? commands.filter((c) => c.label.toLowerCase().includes(q))
      : commands.filter((c) => !c.label.includes("·"));
    return matches.map((c) => ({
      id: c.id,
      label: c.label,
      subtitle: c.hint,
      icon: c.icon,
      onSelect: () => go(c.route),
    }));
  }, [query, isAdmin]);

  const data = searchQuery.data;

  const contentResults: ResultItem[] = useMemo(() => {
    if (!data) return [];
    const results: ResultItem[] = [];
    for (const p of data.products) {
      results.push({
        id: `product-${p.id}`,
        label: p.name,
        subtitle: `Store${p.category ? ` · ${p.category}` : ""} · $${p.price.toFixed(2)}`,
        icon: ShoppingBag,
        onSelect: () => go(`${AppRoute.store}/${p.id}`),
      });
    }
    for (const b of data.library) {
      results.push({
        id: `library-${b.id}`,
        label: b.title,
        subtitle: "Library",
        icon: BookOpen,
        onSelect: () => {
          if (!b.textUrl) return go(AppRoute.library);
          const p = new URLSearchParams({ textUrl: b.textUrl, title: b.title, entryId: String(b.id) });
          if (b.coverUrl) p.set("cover", b.coverUrl);
          go(`${AppRoute.libraryReader}?${p.toString()}`);
        },
      });
    }
    for (const t of data.tasks) {
      results.push({
        id: `task-${t.id}`,
        label: t.title,
        subtitle: "Nimrose · Task",
        icon: CheckSquare,
        onSelect: () =>
          go(`${AppRoute.nimrose}?section=tasks${t.projectId ? `&project=${t.projectId}` : ""}`),
      });
    }
    for (const n of data.notes) {
      results.push({
        id: `note-${n.id}`,
        label: n.title,
        subtitle: "Nimrose · Note",
        icon: NotebookText,
        onSelect: () =>
          go(`${AppRoute.nimrose}?section=notes${n.projectId ? `&project=${n.projectId}` : ""}`),
      });
    }
    for (const tk of data.tickets) {
      results.push({
        id: `ticket-${tk.id}`,
        label: `${tk.ticketKey} — ${tk.title}`,
        subtitle: "Nimrose · Ticket",
        icon: KanbanSquare,
        onSelect: () => go(`${AppRoute.nimrose}?section=kanban&project=${tk.projectId}`),
      });
    }
    return results;
  }, [data]);

  const allResults =
    query.trim().length >= 2
      ? [...contentResults, ...actionResults, ...navResults]
      : [...actionResults, ...navResults];

  useEffect(() => setHighlight(0), [query, data]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      allResults[highlight]?.onSelect();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-card w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-hair/15 px-4 py-3">
          <Search size={16} className="text-ink/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search everything… (Ctrl/Cmd + K)"
            aria-label="Universal search"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
          <kbd className="rounded border border-hair/30 px-1.5 py-0.5 text-[10px] text-ink/40">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {searchQuery.isFetching && (
            <p className="px-3 py-2 text-xs text-ink/40">Searching…</p>
          )}

          {contentResults.length > 0 && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-ink/40">Results</p>
          )}
          {contentResults.map((r) => {
            const idx = allResults.indexOf(r);
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={r.onSelect}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  idx === highlight ? "bg-ink/10" : "hover:bg-ink/5"
                }`}
              >
                <Icon size={16} className="shrink-0 text-ink/50" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.label}</span>
                <span className="shrink-0 text-xs text-ink/40">{r.subtitle}</span>
              </button>
            );
          })}

          {actionResults.length > 0 && (
            <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-ink/40">Actions</p>
          )}
          {actionResults.map((r) => {
            const idx = allResults.indexOf(r);
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={r.onSelect}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  idx === highlight ? "bg-ink/10" : "hover:bg-ink/5"
                }`}
              >
                <Icon size={16} className="shrink-0 text-ink/50" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.label}</span>
                <span className="shrink-0 text-xs text-ink/40">{r.subtitle}</span>
              </button>
            );
          })}

          {navResults.length > 0 && (
            <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-ink/40">
              {query.trim().length >= 2 ? "Navigate" : "Jump to"}
            </p>
          )}
          {navResults.map((r) => {
            const idx = allResults.indexOf(r);
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={r.onSelect}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  idx === highlight ? "bg-ink/10" : "hover:bg-ink/5"
                }`}
              >
                <Icon size={16} className="shrink-0 text-ink/50" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.label}</span>
                <span className="shrink-0 text-xs text-ink/40">{r.subtitle}</span>
              </button>
            );
          })}

          {allResults.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-ink/40">No matches.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UniversalSearch;
