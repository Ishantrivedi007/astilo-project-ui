import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { createNimroseNote, deleteNimroseNote, fetchNimroseNotes } from "../../../lib/nimroseApi";

/** Backed by the real Nimrose Notes API (same notes the full Notes view
 * shows) rather than a localStorage-only scratchpad — quick captures here
 * are actually saved. Each jot becomes a short note; open the full Notes
 * view to expand it with Markdown, folders, or tags. */
const NotesWidget = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const notesQuery = useQuery({ queryKey: ["nimrose", "notes", null, null], queryFn: () => fetchNimroseNotes() });

  const createMutation = useMutation({
    mutationFn: createNimroseNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNimroseNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] }),
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    createMutation.mutate({ title: text.slice(0, 60), content: text });
    setDraft("");
  };

  const notes = notesQuery.data ?? [];

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
      {notesQuery.isLoading ? (
        <p className="nimrose-widget-empty">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="nimrose-widget-empty">No notes yet.</p>
      ) : (
        <ul className="nimrose-note-list">
          {notes.slice(0, 5).map((n) => (
            <li key={n.id}>
              <span>{n.title}</span>
              <button type="button" onClick={() => deleteMutation.mutate(n.id)} aria-label="Delete note">
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
