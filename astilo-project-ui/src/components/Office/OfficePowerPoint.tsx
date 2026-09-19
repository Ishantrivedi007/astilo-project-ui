import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Plus, Trash2, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { RichTextEditor, useConfirm } from "../shared";
import { createNimroseNote, deleteNimroseNote, fetchNimroseNotes, updateNimroseNote } from "../../lib/nimroseApi";
import "../Nimrose/Nimrose.scss";
import "./Office.scss";

interface Slide {
  title: string;
  contentHtml: string;
}

const emptyDeck = (): Slide[] => [{ title: "Slide 1", contentHtml: "" }];

const parseDeck = (content: string | null): Slide[] => {
  try {
    const parsed = content ? JSON.parse(content) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* fall through */
  }
  return emptyDeck();
};

const OfficePowerPoint = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deck, setDeck] = useState<Slide[]>(emptyDeck());
  const [activeSlide, setActiveSlide] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docsQuery = useQuery({ queryKey: ["nimrose", "notes", "kind-slides"], queryFn: () => fetchNimroseNotes({ kind: "slides" }) });
  const docs = docsQuery.data ?? [];
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    setDeck(parseDeck(selected?.content ?? null));
    setActiveSlide(0);
  }, [selected?.id]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key === "ArrowRight") setActiveSlide((i) => Math.min(i + 1, deck.length - 1));
      if (e.key === "ArrowLeft") setActiveSlide((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, deck.length]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] });

  const createMutation = useMutation({
    mutationFn: () => createNimroseNote({ title: "Untitled deck", content: JSON.stringify(emptyDeck()), kind: "slides" }),
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

  const scheduleSave = (next: Slide[]) => {
    setDeck(next);
    if (!selected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ id: selected.id, patch: { content: JSON.stringify(next) } });
    }, 700);
  };

  const updateSlide = (i: number, patch: Partial<Slide>) => {
    scheduleSave(deck.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addSlide = () => {
    const next = [...deck, { title: `Slide ${deck.length + 1}`, contentHtml: "" }];
    scheduleSave(next);
    setActiveSlide(next.length - 1);
  };

  const removeSlide = (i: number) => {
    if (deck.length <= 1) return;
    const next = deck.filter((_, idx) => idx !== i);
    scheduleSave(next);
    setActiveSlide((cur) => Math.min(cur, next.length - 1));
  };

  const slide = deck[activeSlide];

  return (
    <div className="office-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.office)}>
        <ArrowLeft size={12} /> Office
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="office-eyebrow">Astilo Office</p>
          <h1 className="office-title" style={{ fontSize: "1.5rem" }}>
            PowerPoint
          </h1>
        </div>
        <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate()}>
          <Plus size={12} /> New deck
        </button>
      </div>

      <div className="office-docs-layout">
        <div className="office-docs-sidebar">
          {docs.length === 0 && <p className="nimrose-widget-empty">No decks yet.</p>}
          {docs.map((d) => (
            <button key={d.id} type="button" className={`office-doc-item ${selectedId === d.id ? "active" : ""}`} onClick={() => setSelectedId(d.id)}>
              {d.title}
            </button>
          ))}
        </div>

        {!selected ? (
          <p className="nimrose-widget-empty">Select a deck, or create a new one.</p>
        ) : (
          <div>
            <div className="nimrose-notes-editor-toolbar" style={{ marginBottom: "0.6rem" }}>
              <input
                className="nimrose-notes-title-input"
                defaultValue={selected.title}
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (title && title !== selected.title) updateMutation.mutate({ id: selected.id, patch: { title } });
                }}
                aria-label="Deck title"
              />
              <button type="button" className="nimrose-chip" onClick={() => setPresenting(true)}>
                <Play size={12} /> Present
              </button>
              <button
                type="button"
                className="nimrose-chip"
                onClick={async () => {
                  const ok = await confirm({ title: "Delete deck?", message: `Delete "${selected.title}"?`, confirmLabel: "Delete", danger: true });
                  if (ok) deleteMutation.mutate(selected.id);
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>

            <div className="office-slides-layout">
              <div className="office-slide-thumbs">
                {deck.map((s, i) => (
                  <button key={i} type="button" className={`office-slide-thumb ${activeSlide === i ? "active" : ""}`} onClick={() => setActiveSlide(i)}>
                    <span className="thumb-num" style={{ display: "flex", justifyContent: "space-between" }}>
                      {i + 1}
                      {deck.length > 1 && (
                        <X
                          size={11}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlide(i);
                          }}
                        />
                      )}
                    </span>
                    <span className="thumb-title">{s.title || "Untitled slide"}</span>
                  </button>
                ))}
                <button type="button" className="nimrose-chip" onClick={addSlide}>
                  <Plus size={12} /> Slide
                </button>
              </div>

              <div className="office-slide-editor">
                <input
                  className="office-slide-title-input"
                  value={slide.title}
                  onChange={(e) => updateSlide(activeSlide, { title: e.target.value })}
                  placeholder="Slide title"
                />
                <RichTextEditor value={slide.contentHtml} onChange={(html) => updateSlide(activeSlide, { contentHtml: html })} placeholder="Slide content…" />
              </div>
            </div>
          </div>
        )}
      </div>

      {presenting && slide && (
        <div className="office-present-overlay" onClick={() => setPresenting(false)}>
          <div className="office-present-slide" onClick={(e) => e.stopPropagation()}>
            <h2>{slide.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: slide.contentHtml }} />
          </div>
          <div className="office-present-nav">
            <button type="button" className="nimrose-icon-btn" onClick={() => setActiveSlide((i) => Math.max(i - 1, 0))} aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            {activeSlide + 1} / {deck.length}
            <button type="button" className="nimrose-icon-btn" onClick={() => setActiveSlide((i) => Math.min(i + 1, deck.length - 1))} aria-label="Next">
              <ChevronRight size={16} />
            </button>
            <button type="button" className="nimrose-chip" onClick={() => setPresenting(false)}>
              <X size={12} /> Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficePowerPoint;
