import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Eye, FileDown, FileText, Pencil, Pin, Plus, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { RichTextEditor, useConfirm } from "../shared";
import {
  createNimroseNote,
  deleteNimroseNote,
  fetchNimroseNotes,
  updateNimroseNote,
} from "../../lib/nimroseApi";
import { downloadAsWord, downloadDocument } from "../../lib/downloadDoc";
import MarkdownRenderer from "../Nimrose/MarkdownRenderer";
import "../Nimrose/Nimrose.scss";
import "./Office.scss";

/** "Word" — rich (and plain Markdown) documents. Same NimroseNote records
 * as the Notes tab (kind="note"); this is a dedicated writing-focused view
 * inside the Office suite rather than a separate data store. */
const OfficeWord = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [richDraft, setRichDraft] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docsQuery = useQuery({ queryKey: ["nimrose", "notes", "kind-note"], queryFn: () => fetchNimroseNotes({ kind: "note" }) });
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
        kind: "note",
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

  return (
    <div className="office-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.office)}>
        <ArrowLeft size={12} /> Office
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="office-eyebrow">Astilo Studio</p>
          <h1 className="office-title" style={{ fontSize: "1.5rem" }}>
            Word
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate("markdown")}>
            <Plus size={12} /> New note
          </button>
          <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate("html")}>
            <FileText size={12} /> New rich document
          </button>
        </div>
      </div>

      <div className="office-docs-layout">
        <div className="office-docs-sidebar">
          {docs.length === 0 && <p className="nimrose-widget-empty">No documents yet.</p>}
          {docs.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`office-doc-item ${selectedId === d.id ? "active" : ""}`}
              onClick={() => {
                setSelectedId(d.id);
                setMode("edit");
              }}
            >
              {d.pinned && <Pin size={11} />}
              {d.contentFormat === "html" && <FileText size={11} />}
              {d.title}
            </button>
          ))}
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
                  <button type="button" className="nimrose-icon-btn" onClick={() => setMode(mode === "edit" ? "preview" : "edit")} aria-label={mode === "edit" ? "Preview" : "Edit"}>
                    {mode === "edit" ? <Eye size={14} /> : <Pencil size={14} />}
                  </button>
                )}
                <button type="button" className="nimrose-icon-btn" onClick={() => downloadAsWord(selected)} aria-label="Download as Word" title="Download as .doc (opens in Word)">
                  <FileDown size={14} />
                </button>
                <button type="button" className="nimrose-icon-btn" onClick={() => downloadDocument(selected)} aria-label="Download" title="Download as .html/.md">
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

export default OfficeWord;
