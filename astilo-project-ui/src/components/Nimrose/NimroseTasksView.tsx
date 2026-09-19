import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { useConfirm } from "../shared";
import {
  createNimroseProject,
  createNimroseTask,
  deleteNimroseTask,
  fetchNimroseProjects,
  fetchNimroseTasks,
  updateNimroseTask,
  type TaskPriority,
  type TaskStatus,
} from "../../lib/nimroseApi";
import { useNimrosePrompt } from "./NimrosePromptDialog";

const STATUS_TABS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "inbox", label: "Inbox" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
];

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

const NimroseTasksView = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { prompt } = useNimrosePrompt();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>("");

  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", statusFilter],
    queryFn: () => fetchNimroseTasks(statusFilter === "all" ? undefined : { status: statusFilter }),
  });

  const projectsQuery = useQuery({
    queryKey: ["nimrose", "projects"],
    queryFn: fetchNimroseProjects,
  });

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tasks"] });

  const createMutation = useMutation({
    mutationFn: createNimroseTask,
    onSuccess: invalidateTasks,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateNimroseTask>[1] }) =>
      updateNimroseTask(id, patch),
    onSuccess: invalidateTasks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNimroseTask,
    onSuccess: invalidateTasks,
  });

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => createNimroseProject(name),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "projects"] });
      setProjectId(String(project.id));
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createMutation.mutate({
      title: trimmed,
      priority,
      dueDate: dueDate || undefined,
      projectId: projectId ? Number(projectId) : undefined,
    });
    setTitle("");
    setDueDate("");
  };

  const tasks = tasksQuery.data ?? [];

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Tasks</h1>
        </div>
      </div>

      <form className="nimrose-task-form glass-card" onSubmit={submit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New task title"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priority">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
        <select
          value={projectId}
          onChange={async (e) => {
            if (e.target.value === "__new__") {
              const name = await prompt({ title: "New project", placeholder: "e.g. Astilo Redesign" });
              if (name?.trim()) createProjectMutation.mutate(name.trim());
              return;
            }
            setProjectId(e.target.value);
          }}
          aria-label="Project"
        >
          <option value="">No project</option>
          {projectsQuery.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="__new__">+ New project…</option>
        </select>
        <button type="submit" disabled={createMutation.isPending}>
          <Plus size={14} /> Add
        </button>
      </form>

      <div className="nimrose-status-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`nimrose-chip ${statusFilter === tab.value ? "nimrose-chip--active" : ""}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tasksQuery.isLoading && <p className="nimrose-widget-empty">Loading tasks…</p>}
      {!tasksQuery.isLoading && tasks.length === 0 && (
        <p className="nimrose-widget-empty">No tasks here yet.</p>
      )}

      <ul className="nimrose-full-task-list">
        {tasks.map((task) => (
          <li key={task.id} className="glass-card nimrose-full-task-item">
            <label className="nimrose-full-task-check">
              <input
                type="checkbox"
                checked={task.status === "completed"}
                onChange={() =>
                  updateMutation.mutate({
                    id: task.id,
                    patch: { status: task.status === "completed" ? "inbox" : "completed" },
                  })
                }
              />
            </label>
            <div className="nimrose-full-task-body">
              <p className={task.status === "completed" ? "nimrose-task--done" : ""}>{task.title}</p>
              <div className="nimrose-full-task-meta">
                <span className={`nimrose-priority nimrose-priority--${task.priority}`}>{task.priority}</span>
                {task.projectName && <span className="nimrose-chip">{task.projectName}</span>}
                {task.dueDate && <span className="nimrose-chip">Due {task.dueDate}</span>}
                <select
                  value={task.status}
                  onChange={(e) =>
                    updateMutation.mutate({ id: task.id, patch: { status: e.target.value as TaskStatus } })
                  }
                  aria-label="Status"
                >
                  {STATUS_TABS.filter((t) => t.value !== "all").map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete task?",
                  message: `Delete "${task.title}"?`,
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) deleteMutation.mutate(task.id);
              }}
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NimroseTasksView;
