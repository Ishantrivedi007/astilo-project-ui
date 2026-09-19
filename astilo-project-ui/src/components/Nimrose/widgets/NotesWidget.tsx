import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface LocalNote {
  id: string;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = "nimrose-quick-notes-v1";

const readNotes = (): LocalNote[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalNote[]) : [];
  } catch {
    return [];
  }
};

const NotesWidget = () => {
  const [notes, setNotes] = useState<LocalNote[]>(readNotes);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [notes]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }, ...prev]);
    setDraft("");
  };

  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  return (
    <div>
      <form className="nimrose-quick-add" onSubmit={add}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Jot something down…"
          aria-label="Add a note"
        />
        <button type="submit" aria-label="Add note">
          <Plus size={14} />
        </button>
      </form>
      {notes.length === 0 ? (
        <p className="nimrose-widget-empty">No notes yet.</p>
      ) : (
        <ul className="nimrose-note-list">
          {notes.slice(0, 5).map((n) => (
            <li key={n.id}>
              <span>{n.text}</span>
              <button type="button" onClick={() => remove(n.id)} aria-label="Delete note">
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotesWidget;
