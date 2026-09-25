import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Plus } from "lucide-react";

import { AppRoute } from "../../../app/AppRoute";
import { createNimroseNote, fetchNimroseNotes } from "../../../lib/nimroseApi";
import { useNimrosePrompt } from "../NimrosePromptDialog";

/** Minimal read + quick-add notes list for the Research Workspace panel.
 * Full editing (rich text, folders, tags) stays in the dedicated Notes view
 * — this only needs to show "does this topic have notes" and let you jot
 * one down without leaving the workspace. */
const WorkspaceNotesPanel = ({ projectId }: { projectId: number }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { prompt } = useNimrosePrompt();

  const notesQuery = useQuery({
    queryKey: ["nimrose", "notes", "project", projectId],
    queryFn: () => fetchNimroseNotes({ projectId }),
  });

  const createMutation = useMutation({
    mutationFn: createNimroseNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] }),
  });

  const addNote = async () => {
    const title = await prompt({ title: "New note", placeholder: "Note title" });
    if (title?.trim()) createMutation.mutate({ title: title.trim(), projectId });
  };

  const notes = notesQuery.data ?? [];

  return (
    <div className="nimrose-workspace-panel-body">
      <button type="button" className="nimrose-chip" onClick={addNote}>
        <Plus size={12} /> Quick note
      </button>
      {notesQuery.isLoading && <p className="nimrose-widget-empty">Loading notes…</p>}
      {!notesQuery.isLoading && notes.length === 0 && <p className="nimrose-widget-empty">No notes yet.</p>}
      <ul className="nimrose-workspace-list">
        {notes.map((note) => (
          <li key={note.id} className="nimrose-workspace-list-item" onClick={() => navigate(`${AppRoute.nimrose}?section=notes`)}>
            {note.pinned && <Pin size={12} className="nimrose-workspace-pin" />}
            <span className="nimrose-workspace-list-title">{note.title}</span>
            {note.updatedAt && <span className="nimrose-workspace-list-meta">{new Date(note.updatedAt).toLocaleDateString()}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceNotesPanel;
