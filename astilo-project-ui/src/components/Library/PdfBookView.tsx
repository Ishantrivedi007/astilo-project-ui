import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface OutlineEntry {
  title: string;
  pageIndex: number;
}

interface Props {
  pdfUrl: string;
  startPage?: number;
  onPageChange?: (pageIndex: number, pageCount: number) => void;
}

/** Renders a real PDF page-by-page onto a canvas — preserves the book's
 * own images/layout, unlike the plain-text Gutenberg path — and uses the
 * PDF's own outline (bookmarks) as real chapters when the file has one. */
const PdfBookView = ({ pdfUrl, startPage = 0, onPageChange }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(startPage);
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
    loadingTask.promise
      .then(async (doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setPageCount(doc.numPages);

        const rawOutline = await doc.getOutline().catch(() => null);
        if (rawOutline?.length) {
          const entries: OutlineEntry[] = [];
          for (const item of rawOutline) {
            try {
              const dest = typeof item.dest === "string" ? await doc.getDestination(item.dest) : item.dest;
              if (dest) {
                const pageIdx = await doc.getPageIndex(dest[0]);
                entries.push({ title: item.title, pageIndex: pageIdx });
              }
            } catch {
              // Some outline entries point at named destinations that don't
              // resolve cleanly — skip rather than break the whole outline.
            }
          }
          if (!cancelled) setOutline(entries);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Couldn't load this PDF.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
      docRef.current = null;
    };
  }, [pdfUrl]);

  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || loading) return;

    let cancelled = false;
    doc.getPage(pageIndex + 1).then((page) => {
      if (cancelled) return;
      const containerWidth = canvas.parentElement?.clientWidth || 700;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min((containerWidth - 32) / baseViewport.width, 1.8);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      task.promise.catch(() => {});
      onPageChange?.(pageIndex, doc.numPages);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, loading]);

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  if (error) {
    return (
      <p className="lib-empty" style={{ margin: "auto" }}>
        {error}
      </p>
    );
  }

  return (
    <div className="lib-reader-body">
      {outline.length > 0 && (
        <div className="lib-chapter-sidebar">
          {outline.map((entry, i) => (
            <button
              key={i}
              type="button"
              className={`lib-chapter-item ${pageIndex >= entry.pageIndex && (outline[i + 1] ? pageIndex < outline[i + 1].pageIndex : true) ? "active" : ""}`}
              onClick={() => setPageIndex(entry.pageIndex)}
            >
              {entry.title}
            </button>
          ))}
        </div>
      )}

      <div className="lib-page-stage">
        {loading && <p className="lib-empty">Loading the real PDF pages…</p>}
        <div className="lib-page-sheet lib-page-sheet--pdf" key={pageIndex}>
          <canvas ref={canvasRef} className="lib-pdf-canvas" />
        </div>
        <div className="lib-page-nav">
          <button type="button" onClick={goPrev} disabled={pageIndex === 0}>
            <ChevronLeft size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> Prev
          </button>
          <span>
            Page {pageIndex + 1}/{pageCount || 1}
          </span>
          <button type="button" onClick={goNext} disabled={pageIndex >= pageCount - 1}>
            Next <ChevronRight size={14} style={{ display: "inline", verticalAlign: "-2px" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfBookView;
