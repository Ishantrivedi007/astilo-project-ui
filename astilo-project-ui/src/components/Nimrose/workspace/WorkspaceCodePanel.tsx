import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { useConfirm } from "../../shared";
import { createNimroseNote, deleteNimroseNote, fetchNimroseNotes, updateNimroseNote } from "../../../lib/nimroseApi";
import { useNimrosePrompt } from "../NimrosePromptDialog";

const LANGUAGES = ["plaintext", "javascript", "typescript", "python", "sql", "bash", "json", "yaml", "html", "css"];

/** The Project Workspace hub's Code tab — a lightweight snippet manager.
 * Reuses NimroseNote (kind="code") rather than a dedicated model, since a
 * snippet needs nothing a note doesn't already have (title/content/tags/
 * project scoping) — just a language tag and monospace rendering. No
 * syntax highlighting or git integration in this pass, by design. */
const WorkspaceCodePanel = ({ projectId }: { projectId: number }) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { prompt } = useNimrosePrompt();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const saveTimer = { current: null as ReturnType<typeof setTimeout> | null };

  const notesQuery = useQuery({
    queryKey: ["nimrose", "notes", "project", projectId, "code"],
    queryFn: () => fetchNimroseNotes({ projectId, kind: "code" }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] });

  const createMutation = useMutation({
    mutationFn: createNimroseNote,
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
      setDraft(note.content ?? "");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateNimroseNote>[1] }) => updateNimroseNote(id, patch),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNimroseNote,
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
    },
  });

  const snippets = notesQuery.data ?? [];
  const selected = snippets.find((n) => n.id === selectedId) ?? null;

  const addSnippet = async () => {
    const title = await prompt({ title: "New snippet", placeholder: "e.g. seed_data.py" });
    if (title?.trim()) createMutation.mutate({ title: title.trim(), kind: "code", language: "plaintext", content: "", projectId });
  };

  const select = (id: number) => {
    setSelectedId(id);
    setDraft(snippets.find((n) => n.id === id)?.content ?? "");
  };

  const scheduleSave = (content: string) => {
    setDraft(content);
    if (!selected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateMutation.mutate({ id: selected.id, patch: { content } }), 600);
  };

  return (
    <div className="nimrose-workspace-panel-body nimrose-workspace-code-panel">
      <div className="nimrose-workspace-code-list">
        <button type="button" className="nimrose-chip" onClick={addSnippet}>
          <Plus size={12} /> New snippet
        </button>
        {notesQuery.isLoading && <p className="nimrose-widget-empty">Loading…</p>}
        {!notesQuery.isLoading && snippets.length === 0 && <p className="nimrose-widget-empty">No snippets yet.</p>}
        <ul className="nimrose-workspace-list">
          {snippets.map((snippet) => (
            <li
              key={snippet.id}
              className={`nimrose-workspace-list-item ${selectedId === snippet.id ? "nimrose-chip--active" : ""}`}
              onClick={() => select(snippet.id)}
            >
              <span className="nimrose-workspace-list-title">{snippet.title}</span>
              <button
                type="button"
                className="nimrose-icon-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirm({ title: "Delete snippet?", message: `Delete "${snippet.title}"?`, confirmLabel: "Delete", danger: true });
                  if (ok) deleteMutation.mutate(snippet.id);
                }}
                aria-label="Delete snippet"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="nimrose-workspace-code-editor">
          <select
            value={selected.language ?? "plaintext"}
            onChange={(e) => updateMutation.mutate({ id: selected.id, patch: { language: e.target.value } })}
            aria-label="Language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <textarea
            value={draft}
            onChange={(e) => scheduleSave(e.target.value)}
            spellCheck={false}
            className="nimrose-code-textarea"
          />
        </div>
      )}
    </div>
  );
};

export default WorkspaceCodePanel;
