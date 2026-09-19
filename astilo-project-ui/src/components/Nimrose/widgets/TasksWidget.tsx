import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface LocalTask {
  id: string;
  title: string;
  done: boolean;
}

const STORAGE_KEY = "nimrose-quick-tasks-v1";

const readTasks = (): LocalTask[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalTask[]) : [];
  } catch {
    return [];
  }
};

const TasksWidget = () => {
  const [tasks, setTasks] = useState<LocalTask[]>(readTasks);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((prev) => [{ id: crypto.randomUUID(), title, done: false }, ...prev]);
    setDraft("");
  };

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const remaining = tasks.filter((t) => !t.done).length;

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
      {tasks.length === 0 ? (
        <p className="nimrose-widget-empty">No tasks yet.</p>
      ) : (
        <>
          <ul className="nimrose-task-list">
            {tasks.slice(0, 6).map((t) => (
              <li key={t.id} className={t.done ? "nimrose-task--done" : ""}>
                <label>
                  <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                  <span>{t.title}</span>
                </label>
                <button type="button" onClick={() => remove(t.id)} aria-label="Delete task">
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
