import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { createNimroseTask, fetchNimroseTasks, updateNimroseTask } from "../../../lib/nimroseApi";
import { useNimrosePrompt } from "../NimrosePromptDialog";

/** Minimal read + quick-add + toggle-complete tasks list for the Research
 * Workspace panel. Full editing (priority, due date, delete) stays in the
 * dedicated Tasks view. */
const WorkspaceTasksPanel = ({ projectId }: { projectId: number }) => {
  const queryClient = useQueryClient();
  const { prompt } = useNimrosePrompt();

  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", "project", projectId],
    queryFn: () => fetchNimroseTasks({ projectId }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tasks"] });

  const createMutation = useMutation({
    mutationFn: createNimroseTask,
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateNimroseTask>[1] }) => updateNimroseTask(id, patch),
    onSuccess: invalidate,
  });

  const addTask = async () => {
    const title = await prompt({ title: "New task", placeholder: "What needs doing?" });
    if (title?.trim()) createMutation.mutate({ title: title.trim(), projectId });
  };

  const tasks = tasksQuery.data ?? [];

  return (
    <div className="nimrose-workspace-panel-body">
      <button type="button" className="nimrose-chip" onClick={addTask}>
        <Plus size={12} /> Quick task
      </button>
      {tasksQuery.isLoading && <p className="nimrose-widget-empty">Loading tasks…</p>}
      {!tasksQuery.isLoading && tasks.length === 0 && <p className="nimrose-widget-empty">No tasks yet.</p>}
      <ul className="nimrose-workspace-list">
        {tasks.map((task) => (
          <li key={task.id} className="nimrose-workspace-list-item">
            <input
              type="checkbox"
              checked={task.status === "completed"}
              onChange={() =>
                toggleMutation.mutate({ id: task.id, patch: { status: task.status === "completed" ? "inbox" : "completed" } })
              }
            />
            <span className={`nimrose-workspace-list-title ${task.status === "completed" ? "nimrose-task--done" : ""}`}>
              {task.title}
            </span>
            <span className={`nimrose-priority nimrose-priority--${task.priority}`}>{task.priority}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceTasksPanel;
