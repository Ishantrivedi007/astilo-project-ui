import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { createNimroseTask, deleteNimroseTask, fetchNimroseTasks, updateNimroseTask } from "../../../lib/nimroseApi";

/** Backed by the real Nimrose Tasks API — the same data the full Tasks view
 * shows, just a quick-capture slice of it here. Previously this was a
 * localStorage-only scratchpad; moved to the backend so anything created
 * here is actually saved, not just kept in this one browser. */
const TasksWidget = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const tasksQuery = useQuery({ queryKey: ["nimrose", "tasks", "all"], queryFn: () => fetchNimroseTasks() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tasks"] });

  const createMutation = useMutation({ mutationFn: createNimroseTask, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateNimroseTask>[1] }) => updateNimroseTask(id, patch),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: deleteNimroseTask, onSuccess: invalidate });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    createMutation.mutate({ title });
    setDraft("");
  };

  const tasks = tasksQuery.data ?? [];
  const remaining = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div>
      <form className="nimrose-quick-add" onSubmit={add}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Quick task…"
          aria-label="Add a task"
        />
        <button type="submit" aria-label="Add task">
          <Plus size={14} />
        </button>
      </form>
      {tasksQuery.isLoading ? (
        <p className="nimrose-widget-empty">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="nimrose-widget-empty">No tasks yet.</p>
      ) : (
        <>
          <ul className="nimrose-task-list">
            {tasks.slice(0, 6).map((t) => (
              <li key={t.id} className={t.status === "completed" ? "nimrose-task--done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={t.status === "completed"}
                    onChange={() =>
                      updateMutation.mutate({ id: t.id, patch: { status: t.status === "completed" ? "inbox" : "completed" } })
                    }
                  />
                  <span>{t.title}</span>
                </label>
                <button type="button" onClick={() => deleteMutation.mutate(t.id)} aria-label="Delete task">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
          <p className="nimrose-widget-footnote">{remaining} remaining</p>
        </>
      )}
    </div>
  );
};

export default TasksWidget;
