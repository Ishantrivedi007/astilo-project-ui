import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Pin, Plus, Trash2 } from "lucide-react";

import { useConfirm } from "../shared";
import {
  createNimroseNote,
  deleteNimroseNote,
  fetchNimroseNotes,
  updateNimroseNote,
} from "../../lib/nimroseApi";
import MarkdownRenderer from "./MarkdownRenderer";

const NimroseNotesView = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const notesQuery = useQuery({
    queryKey: ["nimrose", "notes", activeFolder, search],
    queryFn: () => fetchNimroseNotes({ folder: activeFolder ?? undefined, q: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] });

  const createMutation = useMutation({
    mutationFn: createNimroseNote,
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
      setMode("edit");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateNimroseNote>[1] }) =>
      updateNimroseNote(id, patch),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNimroseNote,
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
    },
  });

  const notes = notesQuery.data ?? [];
  const folders = useMemo(() => [...new Set(notes.map((n) => n.folder).filter(Boolean))] as string[], [notes]);
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Notes</h1>
        </div>
        <button
          type="button"
          className="nimrose-chip"
          onClick={() => createMutation.mutate({ title: "Untitled note", content: "", folder: activeFolder ?? undefined })}
        >
          <Plus size={12} /> New note
        </button>
      </div>

      <div className="nimrose-notes-layout">
        <div className="nimrose-notes-sidebar">
          <input
            className="nimrose-notes-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
          />
          <button
            type="button"
            className={`nimrose-sidebar-item ${activeFolder === null ? "nimrose-sidebar-item--active" : ""}`}
            onClick={() => setActiveFolder(null)}
          >
            All notes
          </button>
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              className={`nimrose-sidebar-item ${activeFolder === f ? "nimrose-sidebar-item--active" : ""}`}
              onClick={() => setActiveFolder(f)}
            >
              {f}
            </button>
          ))}

          <div className="nimrose-notes-list">
            {notes.length === 0 && <p className="nimrose-widget-empty">No notes yet.</p>}
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`nimrose-note-list-item ${selectedId === n.id ? "nimrose-note-list-item--active" : ""}`}
                onClick={() => {
                  setSelectedId(n.id);
                  setMode("edit");
                }}
              >
                {n.pinned && <Pin size={11} />}
                <span className="nimrose-note-list-title">{n.title}</span>
                <span className="nimrose-widget-footnote">
                  {n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : ""}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="nimrose-notes-editor glass-card">
          {!selected ? (
            <p className="nimrose-widget-empty">Select a note, or create a new one.</p>
          ) : (
            <>
              <div className="nimrose-notes-editor-toolbar">
                <input
                  className="nimrose-notes-title-input"
                  defaultValue={selected.title}
                  onBlur={(e) => {
                    const title = e.target.value.trim();
                    if (title && title !== selected.title) updateMutation.mutate({ id: selected.id, patch: { title } });
                  }}
                  aria-label="Note title"
                />
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={() => updateMutation.mutate({ id: selected.id, patch: { pinned: !selected.pinned } })}
                  aria-label={selected.pinned ? "Unpin" : "Pin"}
                >
                  <Pin size={14} fill={selected.pinned ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
                  aria-label={mode === "edit" ? "Preview" : "Edit"}
                >
                  {mode === "edit" ? <Eye size={14} /> : <Pencil size={14} />}
                </button>
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete note?",
                      message: `Delete "${selected.title}"?`,
                      confirmLabel: "Delete",
                      danger: true,
                    });
                    if (ok) deleteMutation.mutate(selected.id);
                  }}
                  aria-label="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="nimrose-notes-meta-row">
                <input
                  defaultValue={selected.folder ?? ""}
                  placeholder="Folder"
                  onBlur={(e) => updateMutation.mutate({ id: selected.id, patch: { folder: e.target.value.trim() || null } })}
                />
                <input
                  defaultValue={selected.tags.join(", ")}
                  placeholder="tags, comma, separated"
                  onBlur={(e) =>
                    updateMutation.mutate({
                      id: selected.id,
                      patch: { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>

              {mode === "edit" ? (
                <textarea
                  className="nimrose-notes-textarea"
                  defaultValue={selected.content ?? ""}
                  placeholder="Write in Markdown — # headings, **bold**, *italic*, `code`, - lists, - [ ] checklists, [links](https://…)"
                  onBlur={(e) => updateMutation.mutate({ id: selected.id, patch: { content: e.target.value } })}
                />
              ) : (
                <div className="nimrose-notes-preview">
                  <MarkdownRenderer text={selected.content ?? ""} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NimroseNotesView;
