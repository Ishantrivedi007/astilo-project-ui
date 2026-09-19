import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Columns3, Download, Plus, Rows3, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { createNimroseNote, deleteNimroseNote, fetchNimroseNotes, updateNimroseNote } from "../../lib/nimroseApi";
import { a1, cellKey, colLetter, emptySheet, evalCell, sheetToCsv, type SheetData } from "./sheetUtils";
import "../Nimrose/Nimrose.scss";
import "./Office.scss";

const parseSheet = (content: string | null): SheetData => {
  try {
    const parsed = content ? JSON.parse(content) : null;
    if (parsed && typeof parsed.rows === "number") return parsed;
  } catch {
    /* fall through to a fresh sheet */
  }
  return emptySheet();
};

const OfficeExcel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetData>(emptySheet());
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docsQuery = useQuery({ queryKey: ["nimrose", "notes", "kind-sheet"], queryFn: () => fetchNimroseNotes({ kind: "sheet" }) });
  const docs = docsQuery.data ?? [];
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    setSheet(parseSheet(selected?.content ?? null));
  }, [selected?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] });

  const createMutation = useMutation({
    mutationFn: () => createNimroseNote({ title: "Untitled sheet", content: JSON.stringify(emptySheet()), kind: "sheet" }),
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
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

  const scheduleSave = (next: SheetData) => {
    setSheet(next);
    if (!selected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ id: selected.id, patch: { content: JSON.stringify(next) } });
    }, 600);
  };

  const setCell = (r: number, c: number, value: string) => {
    scheduleSave({ ...sheet, cells: { ...sheet.cells, [cellKey(r, c)]: value } });
  };

  const addRow = () => scheduleSave({ ...sheet, rows: sheet.rows + 1 });
  const addCol = () => scheduleSave({ ...sheet, cols: sheet.cols + 1 });

  const downloadCsv = () => {
    if (!selected) return;
    const blob = new Blob([sheetToCsv(sheet)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "sheet"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="office-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.office)}>
        <ArrowLeft size={12} /> Office
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="office-eyebrow">Astilo Office</p>
          <h1 className="office-title" style={{ fontSize: "1.5rem" }}>
            Excel
          </h1>
        </div>
        <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate()}>
          <Plus size={12} /> New sheet
        </button>
      </div>

      <div className="office-docs-layout">
        <div className="office-docs-sidebar">
          {docs.length === 0 && <p className="nimrose-widget-empty">No sheets yet.</p>}
          {docs.map((d) => (
            <button key={d.id} type="button" className={`office-doc-item ${selectedId === d.id ? "active" : ""}`} onClick={() => setSelectedId(d.id)}>
              {d.title}
            </button>
          ))}
        </div>

        <div>
          {!selected ? (
            <p className="nimrose-widget-empty">Select a sheet, or create a new one.</p>
          ) : (
            <>
              <div className="nimrose-notes-editor-toolbar" style={{ marginBottom: "0.6rem" }}>
                <input
                  className="nimrose-notes-title-input"
                  defaultValue={selected.title}
                  onBlur={(e) => {
                    const title = e.target.value.trim();
                    if (title && title !== selected.title) updateMutation.mutate({ id: selected.id, patch: { title } });
                  }}
                  aria-label="Sheet title"
                />
              </div>

              <div className="office-sheet-toolbar">
                <button type="button" className="nimrose-chip" onClick={addRow}>
                  <Rows3 size={12} /> Add row
                </button>
                <button type="button" className="nimrose-chip" onClick={addCol}>
                  <Columns3 size={12} /> Add column
                </button>
                <button type="button" className="nimrose-chip" onClick={downloadCsv}>
                  <Download size={12} /> Download CSV
                </button>
                <button
                  type="button"
                  className="nimrose-chip"
                  onClick={async () => {
                    const ok = await confirm({ title: "Delete sheet?", message: `Delete "${selected.title}"?`, confirmLabel: "Delete", danger: true });
                    if (ok) deleteMutation.mutate(selected.id);
                  }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
              <p className="nimrose-widget-footnote" style={{ marginBottom: "0.5rem" }}>
                Type a value, or a formula like <code>=SUM(A1:A5)</code>.
              </p>

              <div className="office-sheet-scroll">
                <table className="office-sheet-table">
                  <thead>
                    <tr>
                      <th className="office-sheet-rownum" />
                      {Array.from({ length: sheet.cols }, (_, c) => (
                        <th key={c}>{colLetter(c)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: sheet.rows }, (_, r) => (
                      <tr key={r}>
                        <td className="office-sheet-rowhead">{r + 1}</td>
                        {Array.from({ length: sheet.cols }, (_, c) => {
                          const key = cellKey(r, c);
                          const raw = sheet.cells[key] ?? "";
                          const isEditing = editingCell === key;
                          return (
                            <td key={c}>
                              <input
                                value={isEditing ? raw : evalCell(sheet, r, c)}
                                onFocus={() => setEditingCell(key)}
                                onChange={(e) => setSheet((s) => ({ ...s, cells: { ...s.cells, [key]: e.target.value } }))}
                                onBlur={(e) => {
                                  setEditingCell(null);
                                  if (e.target.value !== raw) setCell(r, c, e.target.value);
                                }}
                                title={a1(r, c)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficeExcel;
