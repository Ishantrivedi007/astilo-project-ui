import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import {
  createNimroseNote,
  deleteNimroseNote,
  fetchNimroseNotes,
  updateNimroseNote,
} from "../../lib/nimroseApi";
import {
  deleteResearchItem,
  fetchResearchItem,
  refreshResearchBrief,
  toggleResearchStep,
} from "../../lib/researchApi";
import MarkdownRenderer from "../Nimrose/MarkdownRenderer";
import "./Research.scss";

const fieldLabel = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const ResearchDetail = () => {
  const { id } = useParams();
  const itemId = Number(id);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const itemQuery = useQuery({ queryKey: ["research", "item", itemId], queryFn: () => fetchResearchItem(itemId), enabled: !!itemId });
  const item = itemQuery.data;
  const folder = item?.project?.name ?? null;

  const docsQuery = useQuery({
    queryKey: ["research", "docs", folder],
    queryFn: () => fetchNimroseNotes({ folder: folder ?? undefined }),
    enabled: !!folder,
  });
  const docs = docsQuery.data ?? [];
  const selectedDoc = docs.find((d) => d.id === selectedDocId) ?? null;

  const invalidateItem = () => queryClient.invalidateQueries({ queryKey: ["research", "item", itemId] });
  const invalidateDocs = () => queryClient.invalidateQueries({ queryKey: ["research", "docs", folder] });

  const refreshMutation = useMutation({ mutationFn: () => refreshResearchBrief(itemId), onSuccess: invalidateItem });
  const toggleMutation = useMutation({
    mutationFn: (index: number) => toggleResearchStep(itemId, index),
    onSuccess: invalidateItem,
  });
  const deleteItemMutation = useMutation({
    mutationFn: () => deleteResearchItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research", "list"] });
      navigate(AppRoute.research);
    },
  });

  const createDocMutation = useMutation({
    mutationFn: () => createNimroseNote({ title: "Untitled document", content: "", folder: folder ?? undefined }),
    onSuccess: (note) => {
      invalidateDocs();
      invalidateItem();
      setSelectedDocId(note.id);
      setMode("edit");
    },
  });
  const updateDocMutation = useMutation({
    mutationFn: ({ docId, patch }: { docId: number; patch: Parameters<typeof updateNimroseNote>[1] }) => updateNimroseNote(docId, patch),
    onSuccess: invalidateDocs,
  });
  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => deleteNimroseNote(docId),
    onSuccess: () => {
      invalidateDocs();
      invalidateItem();
      setSelectedDocId(null);
    },
  });

  if (itemQuery.isLoading) return <div className="research-page">Loading…</div>;
  if (!item) return <div className="research-page research-empty">Research item not found.</div>;

  const brief = item.researchBrief;
  const dataFields = Object.entries(item.data ?? {}).filter(([k, v]) => !k.startsWith("_") && v !== null && v !== "");

  return (
    <div className="research-page">
      <button type="button" className="research-pill mb-4" style={{ cursor: "pointer" }} onClick={() => navigate(AppRoute.research)}>
        <ArrowLeft size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> All research
      </button>

      <div className="research-detail-header">
        {(brief?.thumbnailUrl || item.imageUrl) && (
          <img className="research-detail-thumb" src={brief?.thumbnailUrl ?? item.imageUrl ?? undefined} alt={item.title} />
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <p className="research-eyebrow">
            {item.objectType} · {item.source ?? "Unknown source"}
          </p>
          <h1 className="research-title" style={{ fontSize: "1.7rem" }}>
            {item.title}
          </h1>
          <div className="research-actions">
            <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
              <RefreshCw size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> {refreshMutation.isPending ? "Refreshing…" : "Regenerate summary"}
            </button>
            <button
              type="button"
              className="research-pill"
              style={{ cursor: "pointer" }}
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete this research?",
                  message: `Delete "${item.title}" and all of its documents, tasks, and browser space? This can't be undone.`,
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) deleteItemMutation.mutate();
              }}
            >
              <Trash2 size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Delete research
            </button>
          </div>
        </div>
      </div>

      <div className="research-section">
        <h2 className="research-section-title">Automated summary</h2>
        {brief?.summary ? (
          <>
            <div className="research-summary-text">
              {(brief.detailedSummary ?? brief.summary ?? "")
                .split("\n")
                .filter(Boolean)
                .map((para, i, arr) => (
                  <p key={i} style={{ marginBottom: i === arr.length - 1 ? 0 : "0.75rem" }}>
                    {para}
                  </p>
                ))}
            </div>
            {brief.wikiUrl && (
              <p className="research-card-meta" style={{ marginTop: "0.4rem" }}>
                <a href={brief.wikiUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                  Source: Wikipedia — {brief.wikiTitle} <ExternalLink size={10} style={{ display: "inline", verticalAlign: "-1px" }} />
                </a>
              </p>
            )}
          </>
        ) : (
          <p className="research-empty">No summary available for this object yet.</p>
        )}
      </div>

      {brief && brief.keyPoints.length > 0 && (
        <div className="research-section">
          <h2 className="research-section-title">Key points</h2>
          <ul className="research-key-points">
            {brief.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {dataFields.length > 0 && (
        <div className="research-section">
          <h2 className="research-section-title">Data snapshot</h2>
          <dl className="research-data-grid">
            {dataFields.map(([k, v]) => (
              <div key={k} className="research-data-field">
                <dt>{fieldLabel(k)}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {brief && brief.nextSteps.length > 0 && (
        <div className="research-section">
          <h2 className="research-section-title">What to research next</h2>
          <div className="research-checklist">
            {brief.nextSteps.map((step, i) => (
              <label key={i} className={`research-checklist-item ${step.done ? "done" : ""}`}>
                <input type="checkbox" checked={step.done} onChange={() => toggleMutation.mutate(i)} />
                {step.text}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="research-section">
        <h2 className="research-section-title" style={{ justifyContent: "space-between" }}>
          <span>Documents</span>
          <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => createDocMutation.mutate()}>
            <Plus size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> New document
          </button>
        </h2>

        <div className="research-docs-layout">
          <div className="research-docs-sidebar">
            {docs.length === 0 && <p className="research-empty">No documents yet.</p>}
            {docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={`research-doc-item ${selectedDocId === doc.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setMode("edit");
                }}
              >
                {doc.title}
              </button>
            ))}
          </div>

          <div className="research-doc-editor">
            {!selectedDoc ? (
              <p className="research-empty">Select a document, or create a new one.</p>
            ) : (
              <>
                <div className="research-doc-toolbar">
                  <input
                    className="research-doc-title-input"
                    defaultValue={selectedDoc.title}
                    onBlur={(e) => {
                      const title = e.target.value.trim();
                      if (title && title !== selectedDoc.title) updateDocMutation.mutate({ docId: selectedDoc.id, patch: { title } });
                    }}
                  />
                  <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>
                    {mode === "edit" ? <Eye size={12} /> : <Pencil size={12} />}
                  </button>
                  <button
                    type="button"
                    className="research-pill"
                    style={{ cursor: "pointer" }}
                    onClick={async () => {
                      const ok = await confirm({ title: "Delete document?", message: `Delete "${selectedDoc.title}"?`, confirmLabel: "Delete", danger: true });
                      if (ok) deleteDocMutation.mutate(selectedDoc.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {mode === "edit" ? (
                  <textarea
                    className="research-doc-textarea"
                    defaultValue={selectedDoc.content ?? ""}
                    placeholder="Write in Markdown — # headings, **bold**, - lists, - [ ] checklists…"
                    onBlur={(e) => updateDocMutation.mutate({ docId: selectedDoc.id, patch: { content: e.target.value } })}
                  />
                ) : (
                  <div className="research-doc-preview">
                    <MarkdownRenderer text={selectedDoc.content ?? ""} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchDetail;
