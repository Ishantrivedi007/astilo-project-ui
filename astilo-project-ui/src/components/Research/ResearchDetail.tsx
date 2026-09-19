import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  ExternalLink,
  FileDown,
  FileText,
  FlaskConical,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { RichTextEditor, useConfirm } from "../shared";
import {
  createNimroseNote,
  deleteNimroseNote,
  fetchNimroseNotes,
  updateNimroseNote,
} from "../../lib/nimroseApi";
import {
  addResearchImage,
  addResearchStep,
  autoResearchStep,
  deleteResearchItem,
  fetchResearchItem,
  refreshResearchBrief,
  removeResearchImage,
  removeResearchStep,
  toggleResearchStep,
  updateResearchStep,
} from "../../lib/researchApi";
import { searchNasaImages, type NasaImageData } from "../../lib/cosmosApi";
import { searchWebImages, type WebImageResult } from "../../lib/webImagesApi";
import MarkdownRenderer from "../Nimrose/MarkdownRenderer";
import { downloadAsWord, downloadDocument } from "../../lib/downloadDoc";
import "./Research.scss";

const fieldLabel = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const downloadImage = async (url: string, filename: string) => {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Cross-origin images without CORS headers can't be fetched as a blob —
    // fall back to opening it directly so the user can save it manually.
    window.open(url, "_blank", "noopener");
  }
};

const ResearchDetail = () => {
  const { id } = useParams();
  const itemId = Number(id);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [richDraft, setRichDraft] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string | null; source?: string | null; galleryIndex?: number } | null>(null);
  const [imageSearch, setImageSearch] = useState("");
  const [imageSearchSubmitted, setImageSearchSubmitted] = useState("");
  const [imageSource, setImageSource] = useState<"nasa" | "web">("nasa");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [newStepText, setNewStepText] = useState("");
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingStepText, setEditingStepText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const isRich = selectedDoc?.contentFormat === "html";

  useEffect(() => {
    setRichDraft(selectedDoc?.content ?? "");
  }, [selectedDoc?.id]);

  const nasaImageQuery = useQuery({
    queryKey: ["research", "image-search", "nasa", imageSearchSubmitted],
    queryFn: () => searchNasaImages(imageSearchSubmitted, 12),
    enabled: !!imageSearchSubmitted && imageSource === "nasa",
    retry: false,
  });
  const webImageQuery = useQuery({
    queryKey: ["research", "image-search", "web", imageSearchSubmitted],
    queryFn: () => searchWebImages(imageSearchSubmitted, 12),
    enabled: !!imageSearchSubmitted && imageSource === "web",
    retry: false,
  });
  const imageSearchLoading = imageSource === "nasa" ? nasaImageQuery.isLoading : webImageQuery.isLoading;

  const invalidateItem = () => queryClient.invalidateQueries({ queryKey: ["research", "item", itemId] });
  const invalidateDocs = () => queryClient.invalidateQueries({ queryKey: ["research", "docs", folder] });

  const refreshMutation = useMutation({ mutationFn: () => refreshResearchBrief(itemId), onSuccess: invalidateItem });
  const toggleMutation = useMutation({
    mutationFn: (index: number) => toggleResearchStep(itemId, index),
    onSuccess: invalidateItem,
  });
  const addStepMutation = useMutation({
    mutationFn: (text: string) => addResearchStep(itemId, text),
    onSuccess: () => {
      invalidateItem();
      setNewStepText("");
    },
  });
  const updateStepMutation = useMutation({
    mutationFn: ({ index, text }: { index: number; text: string }) => updateResearchStep(itemId, index, text),
    onSuccess: () => {
      invalidateItem();
      setEditingStepIndex(null);
    },
  });
  const removeStepMutation = useMutation({
    mutationFn: (index: number) => removeResearchStep(itemId, index),
    onSuccess: invalidateItem,
  });
  const autoResearchMutation = useMutation({
    mutationFn: (index: number) => autoResearchStep(itemId, index),
    onSuccess: () => {
      invalidateItem();
      invalidateDocs();
    },
  });
  const deleteItemMutation = useMutation({
    mutationFn: () => deleteResearchItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research", "list"] });
      navigate(AppRoute.research);
    },
  });

  const addImageMutation = useMutation({
    mutationFn: (payload: { url: string; caption?: string; source?: string }) => addResearchImage(itemId, payload),
    onSuccess: invalidateItem,
  });
  const removeImageMutation = useMutation({
    mutationFn: (index: number) => removeResearchImage(itemId, index),
    onSuccess: () => {
      invalidateItem();
      setLightbox(null);
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (contentFormat: "markdown" | "html") =>
      createNimroseNote({
        title: contentFormat === "html" ? "Untitled document" : "Untitled note",
        content: "",
        contentFormat,
        folder: folder ?? undefined,
      }),
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

  const scheduleRichSave = (html: string) => {
    setRichDraft(html);
    if (!selectedDoc) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDocMutation.mutate({ docId: selectedDoc.id, patch: { content: html } });
    }, 800);
  };

  if (itemQuery.isLoading) return <div className="research-page">Loading…</div>;
  if (!item) return <div className="research-page research-empty">Research item not found.</div>;

  const brief = item.researchBrief;
  const dataFields = Object.entries(item.data ?? {}).filter(([k, v]) => !k.startsWith("_") && v !== null && v !== "");
  const images = item.images ?? [];
  const nasaResults = nasaImageQuery.data?.data.results ?? [];
  const webResults = webImageQuery.data?.data.results ?? [];
  const alreadyAdded = (url: string) => images.some((img) => img.url === url);

  const submitImageSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setImageSearchSubmitted(imageSearch.trim() || item.title);
  };

  return (
    <div className="research-page">
      <button type="button" className="research-pill mb-4" style={{ cursor: "pointer" }} onClick={() => navigate(AppRoute.research)}>
        <ArrowLeft size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> All research
      </button>

      <div className="research-detail-header">
        {(brief?.thumbnailUrl || item.imageUrl) && (
          <button
            type="button"
            className="research-detail-thumb-btn"
            onClick={() => setLightbox({ url: (brief?.thumbnailUrl ?? item.imageUrl)!, caption: item.title, source: brief?.wikiUrl ? "Wikipedia" : item.source })}
          >
            <img className="research-detail-thumb" src={brief?.thumbnailUrl ?? item.imageUrl ?? undefined} alt={item.title} />
          </button>
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

      {brief && (
        <div className="research-section">
          <h2 className="research-section-title">What to research next</h2>
          <div className="research-checklist">
            {brief.nextSteps.map((step, i) => (
              <div key={i} className={`research-checklist-item ${step.done ? "done" : ""}`}>
                <input type="checkbox" checked={step.done} onChange={() => toggleMutation.mutate(i)} />
                {editingStepIndex === i ? (
                  <input
                    className="research-checklist-edit-input"
                    value={editingStepText}
                    autoFocus
                    onChange={(e) => setEditingStepText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingStepText.trim()) updateStepMutation.mutate({ index: i, text: editingStepText.trim() });
                      if (e.key === "Escape") setEditingStepIndex(null);
                    }}
                  />
                ) : (
                  <span className="research-checklist-text">{step.text}</span>
                )}
                <span className="research-checklist-actions">
                  {editingStepIndex === i ? (
                    <button type="button" onClick={() => editingStepText.trim() && updateStepMutation.mutate({ index: i, text: editingStepText.trim() })} aria-label="Save">
                      <Check size={12} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => autoResearchMutation.mutate(i)}
                        disabled={autoResearchMutation.isPending || step.done}
                        aria-label="Auto research"
                        title="Create a starter document for this and check it off"
                      >
                        <FlaskConical size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStepIndex(i);
                          setEditingStepText(step.text);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button type="button" onClick={() => removeStepMutation.mutate(i)} aria-label="Remove">
                        <X size={12} />
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
          <form
            className="research-image-add-row"
            style={{ marginTop: "0.6rem" }}
            onSubmit={(e) => {
              e.preventDefault();
              if (newStepText.trim()) addStepMutation.mutate(newStepText.trim());
            }}
          >
            <input value={newStepText} onChange={(e) => setNewStepText(e.target.value)} placeholder="Add your own research step…" />
            <button type="submit" className="research-pill" style={{ cursor: "pointer" }}>
              <Plus size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Add
            </button>
          </form>
        </div>
      )}

      <div className="research-section">
        <h2 className="research-section-title">Images</h2>

        {images.length > 0 && (
          <div className="research-image-grid">
            {images.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                className="research-image-thumb"
                onClick={() => setLightbox({ url: img.url, caption: img.caption, source: img.source, galleryIndex: i })}
              >
                <img src={img.url} alt={img.caption ?? item.title} loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {images.length === 0 && <p className="research-empty">No images added yet.</p>}

        <form className="research-image-add-row" onSubmit={(e) => { e.preventDefault(); if (manualImageUrl.trim()) { addImageMutation.mutate({ url: manualImageUrl.trim() }); setManualImageUrl(""); } }}>
          <input value={manualImageUrl} onChange={(e) => setManualImageUrl(e.target.value)} placeholder="Paste an image URL to add it…" />
          <button type="submit" className="research-pill" style={{ cursor: "pointer" }}>
            <ImagePlus size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Add
          </button>
        </form>

        <div className="research-image-source-toggle">
          <button type="button" className={imageSource === "nasa" ? "active" : ""} onClick={() => setImageSource("nasa")}>
            NASA library
          </button>
          <button type="button" className={imageSource === "web" ? "active" : ""} onClick={() => setImageSource("web")}>
            Search the web
          </button>
        </div>

        <form
          className="research-image-add-row"
          onSubmit={submitImageSearch}
        >
          <input
            value={imageSearch}
            onChange={(e) => setImageSearch(e.target.value)}
            placeholder={imageSource === "nasa" ? `Search NASA's image library for "${item.title}"…` : `Search the web (Openverse) for "${item.title}"…`}
          />
          <button type="submit" className="research-pill" style={{ cursor: "pointer" }}>
            <Search size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Search
          </button>
        </form>

        {imageSearchLoading && <p className="research-empty">Searching…</p>}

        {imageSource === "nasa" && imageSearchSubmitted && !nasaImageQuery.isLoading && nasaResults.length === 0 && (
          <p className="research-empty">No images found for "{imageSearchSubmitted}".</p>
        )}
        {imageSource === "nasa" && nasaResults.length > 0 && (
          <div className="research-image-grid">
            {nasaResults
              .filter((r: NasaImageData) => r.previewUrl)
              .map((r: NasaImageData) => (
                <button
                  key={r.nasaId}
                  type="button"
                  className="research-image-thumb research-image-thumb--pickable"
                  disabled={alreadyAdded(r.previewUrl!)}
                  onClick={() => addImageMutation.mutate({ url: r.previewUrl!, caption: r.title, source: "NASA Image and Video Library" })}
                  title={alreadyAdded(r.previewUrl!) ? "Already added" : `Add "${r.title}"`}
                >
                  <img src={r.previewUrl!} alt={r.title} loading="lazy" />
                  {!alreadyAdded(r.previewUrl!) && <span className="research-image-thumb-add">+</span>}
                </button>
              ))}
          </div>
        )}

        {imageSource === "web" && imageSearchSubmitted && !webImageQuery.isLoading && webResults.length === 0 && (
          <p className="research-empty">No images found for "{imageSearchSubmitted}".</p>
        )}
        {imageSource === "web" && webResults.length > 0 && (
          <div className="research-image-grid">
            {webResults.map((r: WebImageResult) => (
              <button
                key={r.id}
                type="button"
                className="research-image-thumb research-image-thumb--pickable"
                disabled={alreadyAdded(r.url)}
                onClick={() =>
                  addImageMutation.mutate({
                    url: r.url,
                    caption: `${r.title}${r.creator ? ` — ${r.creator}` : ""}${r.license ? ` (${r.license.toUpperCase()})` : ""}`,
                    source: `Openverse / ${r.provider ?? "web"}`,
                  })
                }
                title={alreadyAdded(r.url) ? "Already added" : `Add "${r.title}" (${r.license ?? "unknown license"})`}
              >
                <img src={r.thumbnailUrl} alt={r.title} loading="lazy" />
                {!alreadyAdded(r.url) && <span className="research-image-thumb-add">+</span>}
              </button>
            ))}
          </div>
        )}
        {imageSource === "web" && webResults.length > 0 && (
          <p className="research-empty" style={{ marginTop: "0.4rem" }}>
            Images from Openverse are openly licensed but not public domain — check each one's license before reuse.
          </p>
        )}
      </div>

      {lightbox && (
        <div className="research-lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="research-lightbox" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="research-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">
              <X size={16} />
            </button>
            <img src={lightbox.url} alt={lightbox.caption ?? item.title} />
            <div className="research-lightbox-body">
              {lightbox.caption && <p>{lightbox.caption}</p>}
              {lightbox.source && <p className="research-card-meta">Source: {lightbox.source}</p>}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="research-pill"
                  style={{ cursor: "pointer" }}
                  onClick={() => downloadImage(lightbox.url, `${(lightbox.caption ?? item.title).slice(0, 60)}.jpg`)}
                >
                  <Download size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Download
                </button>
                {lightbox.galleryIndex != null && (
                  <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => removeImageMutation.mutate(lightbox.galleryIndex!)}>
                    <Trash2 size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="research-section">
        <h2 className="research-section-title" style={{ justifyContent: "space-between" }}>
          <span>Documents</span>
          <span style={{ display: "flex", gap: "0.4rem" }}>
            <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => createDocMutation.mutate("markdown")}>
              <Plus size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> New note
            </button>
            <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => createDocMutation.mutate("html")}>
              <FileText size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> New rich document
            </button>
          </span>
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
                {doc.contentFormat === "html" && <FileText size={11} style={{ marginRight: 4, verticalAlign: "-2px" }} />}
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
                  {!isRich && (
                    <button type="button" className="research-pill" style={{ cursor: "pointer" }} onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>
                      {mode === "edit" ? <Eye size={12} /> : <Pencil size={12} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="research-pill"
                    style={{ cursor: "pointer" }}
                    onClick={() => downloadAsWord(selectedDoc)}
                    title="Download as .doc (opens in Word)"
                  >
                    <FileDown size={12} />
                  </button>
                  <button
                    type="button"
                    className="research-pill"
                    style={{ cursor: "pointer" }}
                    onClick={() => downloadDocument(selectedDoc)}
                    title="Download as .html/.md"
                  >
                    <Download size={12} />
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

                {isRich ? (
                  <RichTextEditor value={richDraft} onChange={scheduleRichSave} placeholder="Start writing…" />
                ) : mode === "edit" ? (
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
