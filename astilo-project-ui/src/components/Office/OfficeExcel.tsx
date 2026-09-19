import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Columns3, Combine, Download, Italic, Palette, PaintBucket, Plus, Rows3, Trash2, Ungroup } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { createNimroseNote, deleteNimroseNote, fetchNimroseNotes, updateNimroseNote } from "../../lib/nimroseApi";
import {
  a1,
  cellKey,
  colLetter,
  emptySheet,
  evalCell,
  mergeCells,
  mergeCovering,
  sheetToCsv,
  sheetToXlsHtml,
  unmergeCell,
  type CellStyle,
  type SheetData,
} from "./sheetUtils";
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
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [rangeEnd, setRangeEnd] = useState<[number, number] | null>(null);
  const [colorPanel, setColorPanel] = useState<"text" | "bg" | null>(null);
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

  const selectionRect = (): { r1: number; c1: number; r2: number; c2: number } | null => {
    if (!activeCell) return null;
    const [r1, c1] = activeCell;
    const [r2, c2] = rangeEnd ?? activeCell;
    return { r1: Math.min(r1, r2), c1: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
  };

  const applyStyle = (patch: Partial<CellStyle>) => {
    const rect = selectionRect();
    if (!rect) return;
    const styles = { ...sheet.styles };
    for (let r = rect.r1; r <= rect.r2; r++) {
      for (let c = rect.c1; c <= rect.c2; c++) {
        const key = cellKey(r, c);
        const current = styles[key] ?? {};
        const next = { ...current, ...patch };
        // Toggle: bold/italic re-apply clears it instead of always forcing on.
        if (patch.bold !== undefined) next.bold = !current.bold;
        if (patch.italic !== undefined) next.italic = !current.italic;
        styles[key] = next;
      }
    }
    scheduleSave({ ...sheet, styles });
  };

  const mergeSelection = () => {
    const rect = selectionRect();
    if (!rect || (rect.r1 === rect.r2 && rect.c1 === rect.c2)) return;
    const merged = mergeCells(sheet, rect.r1, rect.c1, rect.r2 - rect.r1 + 1, rect.c2 - rect.c1 + 1);
    if (merged) {
      scheduleSave(merged);
      setRangeEnd(null);
    }
  };

  const unmergeSelection = () => {
    if (!activeCell) return;
    const covering = mergeCovering(sheet, activeCell[0], activeCell[1]);
    if (covering?.isOrigin) scheduleSave(unmergeCell(sheet, covering.key));
  };

  const activeMerge = activeCell ? mergeCovering(sheet, activeCell[0], activeCell[1]) : null;
  const canMerge = !!rangeEnd && (activeCell?.[0] !== rangeEnd[0] || activeCell?.[1] !== rangeEnd[1]);
  const canUnmerge = !rangeEnd && activeMerge?.isOrigin;

  const TEXT_COLORS = ["#e8e6ff", "#f87171", "#facc15", "#4ade80", "#60a5fa", "#a78bfa"];
  const BG_COLORS = ["transparent", "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#374151"];

  const downloadBlob = (content: string, mime: string, ext: string) => {
    if (!selected) return;
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "sheet"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => downloadBlob(sheetToCsv(sheet), "text/csv", "csv");
  const downloadXls = () => selected && downloadBlob(sheetToXlsHtml(sheet, selected.title), "application/vnd.ms-excel", "xls");

  return (
    <div className="office-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.office)}>
        <ArrowLeft size={12} /> Office
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="office-eyebrow">Astilo Studio</p>
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
                <span className="office-toolbar-sep" />
                <button type="button" className="nimrose-chip" onClick={() => applyStyle({ bold: true })} disabled={!activeCell} aria-label="Bold">
                  <Bold size={12} />
                </button>
                <button type="button" className="nimrose-chip" onClick={() => applyStyle({ italic: true })} disabled={!activeCell} aria-label="Italic">
                  <Italic size={12} />
                </button>
                <button type="button" className="nimrose-chip" onClick={() => applyStyle({ align: "left" })} disabled={!activeCell} aria-label="Align left">
                  <AlignLeft size={12} />
                </button>
                <button type="button" className="nimrose-chip" onClick={() => applyStyle({ align: "center" })} disabled={!activeCell} aria-label="Align center">
                  <AlignCenter size={12} />
                </button>
                <button type="button" className="nimrose-chip" onClick={() => applyStyle({ align: "right" })} disabled={!activeCell} aria-label="Align right">
                  <AlignRight size={12} />
                </button>
                <span style={{ position: "relative" }}>
                  <button type="button" className="nimrose-chip" onClick={() => setColorPanel(colorPanel === "text" ? null : "text")} disabled={!activeCell} aria-label="Text color">
                    <Palette size={12} />
                  </button>
                  {colorPanel === "text" && (
                    <div className="office-swatch-panel">
                      {TEXT_COLORS.map((c) => (
                        <button key={c} type="button" className="office-swatch" style={{ background: c }} onClick={() => { applyStyle({ color: c }); setColorPanel(null); }} />
                      ))}
                    </div>
                  )}
                </span>
                <span style={{ position: "relative" }}>
                  <button type="button" className="nimrose-chip" onClick={() => setColorPanel(colorPanel === "bg" ? null : "bg")} disabled={!activeCell} aria-label="Fill color">
                    <PaintBucket size={12} />
                  </button>
                  {colorPanel === "bg" && (
                    <div className="office-swatch-panel">
                      {BG_COLORS.map((c) => (
                        <button key={c} type="button" className="office-swatch" style={{ background: c === "transparent" ? "#1a1a24" : c }} onClick={() => { applyStyle({ bg: c }); setColorPanel(null); }} />
                      ))}
                    </div>
                  )}
                </span>
                <button type="button" className="nimrose-chip" onClick={mergeSelection} disabled={!canMerge}>
                  <Combine size={12} /> Merge cells
                </button>
                <button type="button" className="nimrose-chip" onClick={unmergeSelection} disabled={!canUnmerge}>
                  <Ungroup size={12} /> Unmerge
                </button>
                <span className="office-toolbar-sep" />
                <button type="button" className="nimrose-chip" onClick={downloadXls}>
                  <Download size={12} /> Download .xls
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
                Formulas: <code>=SUM/AVERAGE/MIN/MAX/COUNT/PRODUCT(A1:A5)</code>, <code>=ROUND(A1,2)</code>, <code>=ABS(A1)</code>,{" "}
                <code>=CONCAT(A1,B1)</code>, <code>=IF(A1&gt;10,"yes","no")</code>. Click a cell to select it, shift-click another to select a
                range for formatting or merging.
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
                          const covering = mergeCovering(sheet, r, c);
                          if (covering && !covering.isOrigin) return null;
                          const raw = sheet.cells[key] ?? "";
                          const isEditing = editingCell === key;
                          const style = sheet.styles?.[key];
                          const rect = selectionRect();
                          const inSelection = !!rect && r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2;
                          return (
                            <td
                              key={c}
                              rowSpan={covering?.rows}
                              colSpan={covering?.cols}
                              className={inSelection ? "office-cell-selected" : undefined}
                              onMouseDown={(e) => {
                                if (e.shiftKey && activeCell) setRangeEnd([r, c]);
                                else {
                                  setActiveCell([r, c]);
                                  setRangeEnd(null);
                                }
                              }}
                            >
                              <input
                                value={isEditing ? raw : evalCell(sheet, r, c)}
                                onFocus={() => setEditingCell(key)}
                                onChange={(e) => setSheet((s) => ({ ...s, cells: { ...s.cells, [key]: e.target.value } }))}
                                onBlur={(e) => {
                                  setEditingCell(null);
                                  if (e.target.value !== raw) setCell(r, c, e.target.value);
                                }}
                                style={{
                                  fontWeight: style?.bold ? 700 : undefined,
                                  fontStyle: style?.italic ? "italic" : undefined,
                                  color: style?.color,
                                  background: style?.bg && style.bg !== "transparent" ? style.bg : undefined,
                                  textAlign: style?.align,
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
