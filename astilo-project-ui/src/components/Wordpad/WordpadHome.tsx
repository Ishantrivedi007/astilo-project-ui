import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, NotebookPen, Pencil, Pin, Plus, Trash2 } from "lucide-react";

import { RichTextEditor, useConfirm } from "../shared";
import {
  createNimroseNote,
  deleteNimroseNote,
  fetchNimroseNotes,
  updateNimroseNote,
} from "../../lib/nimroseApi";
import { downloadDocument } from "../../lib/downloadDoc";
import MarkdownRenderer from "../Nimrose/MarkdownRenderer";
import "../Nimrose/Nimrose.scss";
import "./Wordpad.scss";

/** Astilo Wordpad — a standalone document editor tab (separate from the
 * Notes list view, though both read/write the same NimroseNote records):
 * full CRUD, a rich WYSIWYG mode alongside Markdown, and local file
 * download. Everything here also shows up in Notes and vice versa — same
 * underlying records, this is just a dedicated writing-focused view. */
const WordpadHome = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [richDraft, setRichDraft] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docsQuery = useQuery({ queryKey: ["nimrose", "notes", "all-wordpad"], queryFn: () => fetchNimroseNotes() });
  const docs = docsQuery.data ?? [];
  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const isRich = selected?.contentFormat === "html";

  useEffect(() => {
    setRichDraft(selected?.content ?? "");
  }, [selected?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] });

  const createMutation = useMutation({
    mutationFn: (contentFormat: "markdown" | "html") =>
      createNimroseNote({
        title: contentFormat === "html" ? "Untitled document" : "Untitled note",
        content: "",
        contentFormat,
      }),
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
      setMode("edit");
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

  const scheduleRichSave = (html: string) => {
    setRichDraft(html);
    if (!selected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ id: selected.id, patch: { content: html } });
    }, 800);
  };

  const grouped = useMemo(() => {
    const rich = docs.filter((d) => d.contentFormat === "html");
    const md = docs.filter((d) => d.contentFormat !== "html");
    return { rich, md };
  }, [docs]);

  return (
    <div className="wordpad-page">
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Astilo</p>
          <h1 className="nimrose-page-title">
            <NotebookPen size={22} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
            Wordpad
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate("markdown")}>
            <Plus size={12} /> New note
          </button>
          <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate("html")}>
            <FileText size={12} /> New document
          </button>
        </div>
      </div>

      <div className="nimrose-notes-layout">
        <div className="nimrose-notes-sidebar">
          <p className="wordpad-group-label">Rich documents ({grouped.rich.length})</p>
          <div className="nimrose-notes-list">
            {grouped.rich.length === 0 && <p className="nimrose-widget-empty">None yet.</p>}
            {grouped.rich.map((n) => (
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
                <span className="nimrose-widget-footnote">{n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : ""}</span>
              </button>
            ))}
          </div>

          <p className="wordpad-group-label">Notes ({grouped.md.length})</p>
          <div className="nimrose-notes-list">
            {grouped.md.length === 0 && <p className="nimrose-widget-empty">None yet.</p>}
            {grouped.md.map((n) => (
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
                <span className="nimrose-widget-footnote">{n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : ""}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="nimrose-notes-editor glass-card">
          {!selected ? (
            <p className="nimrose-widget-empty">Select a document, or create a new one.</p>
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
                  aria-label="Document title"
                />
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={() => updateMutation.mutate({ id: selected.id, patch: { pinned: !selected.pinned } })}
                  aria-label={selected.pinned ? "Unpin" : "Pin"}
                >
                  <Pin size={14} fill={selected.pinned ? "currentColor" : "none"} />
                </button>
                {!isRich && (
                  <button
                    type="button"
                    className="nimrose-icon-btn"
                    onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
                    aria-label={mode === "edit" ? "Preview" : "Edit"}
                  >
                    {mode === "edit" ? <Eye size={14} /> : <Pencil size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={() => downloadDocument(selected)}
                  aria-label="Download"
                  title="Download as a local file"
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={async () => {
                    const ok = await confirm({ title: "Delete document?", message: `Delete "${selected.title}"?`, confirmLabel: "Delete", danger: true });
                    if (ok) deleteMutation.mutate(selected.id);
                  }}
                  aria-label="Delete document"
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

              {isRich ? (
                <RichTextEditor value={richDraft} onChange={scheduleRichSave} placeholder="Start writing…" />
              ) : mode === "edit" ? (
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

export default WordpadHome;
