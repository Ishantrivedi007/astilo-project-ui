import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  Focus,
  Globe,
  KanbanSquare,
  Notebook,
  Palette,
  Plus,
  Search,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { createNimroseNote, createNimroseTask, fetchNimroseProjects } from "../../lib/nimroseApi";
import { createTicket } from "../../lib/kanbanApi";
import { useNimroseFocus } from "./NimroseFocusContext";
import { useNimrosePrompt } from "./NimrosePromptDialog";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Calendar;
  run: () => void | Promise<void>;
}

const NimroseCommandPalette = ({ onNavigate }: { onNavigate: (section: string) => void }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toggleRunning, running } = useNimroseFocus();
  const { prompt, alertInfo } = useNimrosePrompt();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const close = (action: () => void) => {
    action();
    setOpen(false);
    setQuery("");
  };

  const commands: Command[] = useMemo(
    () => [
      { id: "open-home", label: "Open Home", icon: Search, run: () => onNavigate("home") },
      { id: "open-calendar", label: "Open Calendar", icon: Calendar, run: () => onNavigate("calendar") },
      { id: "open-tasks", label: "Open Tasks", icon: CheckSquare, run: () => onNavigate("tasks") },
      { id: "open-kanban", label: "Open Kanban", icon: KanbanSquare, run: () => onNavigate("kanban") },
      { id: "open-notes", label: "Search / open Notes", icon: Notebook, run: () => onNavigate("notes") },
      { id: "open-focus", label: "Open Focus", icon: Focus, run: () => onNavigate("focus") },
      { id: "open-browser", label: "Open browser", icon: Globe, run: () => onNavigate("browser") },
      { id: "open-analytics", label: "Open Analytics", icon: BarChart3, run: () => onNavigate("analytics") },
      {
        id: "start-focus",
        label: running ? "Pause focus session" : "Start focus session",
        icon: Focus,
        run: () => {
          onNavigate("focus");
          if (!running) toggleRunning();
        },
      },
      {
        id: "create-task",
        label: "Create task…",
        hint: "prompts for a title",
        icon: Plus,
        run: async () => {
          const title = await prompt({ title: "New task", placeholder: "What needs doing?" });
          if (title?.trim()) {
            createTaskMutation.mutate({ title: title.trim() });
            onNavigate("tasks");
          }
        },
      },
      {
        id: "create-note",
        label: "Create note…",
        hint: "prompts for a title",
        icon: Plus,
        run: async () => {
          const title = await prompt({ title: "New note", placeholder: "Untitled note" });
          createNoteMutation.mutate({ title: title?.trim() || "Untitled note" });
          onNavigate("notes");
        },
      },
      {
        id: "create-ticket",
        label: "Create ticket…",
        hint: projectsQuery.data?.[0] ? `in ${projectsQuery.data[0].name}` : "needs a project first",
        icon: Plus,
        run: async () => {
          const project = projectsQuery.data?.[0];
          if (!project) {
            await alertInfo("Create a project in Kanban first.", "No project yet");
            return;
          }
          const title = await prompt({ title: "New ticket", placeholder: "Ticket title" });
          if (title?.trim()) {
            createTicketMutation.mutate({ projectId: project.id, title: title.trim() });
            onNavigate("kanban");
          }
        },
      },
      { id: "change-theme", label: "Change theme", icon: Palette, run: () => navigate(AppRoute.customize) },
    ],
    [
      onNavigate,
      running,
      toggleRunning,
      projectsQuery.data,
      createTaskMutation,
      createNoteMutation,
      createTicketMutation,
      navigate,
      prompt,
      alertInfo,
    ]
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));

  if (!open) return null;

  return (
    <div className="nimrose-modal-overlay" onClick={() => setOpen(false)}>
      <div className="nimrose-palette glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="nimrose-palette-search">
          <Search size={15} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Nimrose commands…"
            aria-label="Command palette"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="nimrose-palette-list">
          {filtered.length === 0 && <li className="nimrose-widget-empty">No matching commands.</li>}
          {filtered.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.id}>
                <button type="button" onClick={() => close(c.run)}>
                  <Icon size={15} />
                  <span>{c.label}</span>
                  {c.hint && <span className="nimrose-widget-footnote">{c.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default NimroseCommandPalette;
