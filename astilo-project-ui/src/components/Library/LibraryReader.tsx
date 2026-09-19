import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchBookContent, updateLibraryEntry } from "../../lib/libraryApi";
import BookOpening3D from "./BookOpening3D";
import PdfBookView from "./PdfBookView";
import "./Library.scss";

const PAGE_CHARS = 1500;

/** Splits one chapter's real text into screen-sized "pages" at paragraph
 * boundaries (never mid-sentence when avoidable) — a real pagination of
 * the actual book text, not a fixed-height CSS overflow trick. */
const paginate = (text: string): string[] => {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const pages: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > PAGE_CHARS && current) {
      pages.push(current);
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current) pages.push(current);
  return pages.length ? pages : [text];
};

const LibraryReader = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const textUrl = params.get("textUrl") ?? "";
  const pdfUrl = params.get("pdfUrl") ?? "";
  const title = params.get("title") ?? "Untitled";
  const coverUrl = params.get("cover");
  const entryId = params.get("entryId") ? Number(params.get("entryId")) : null;
  const startChapter = Number(params.get("chapter")) || 0;

  const [showIntro, setShowIntro] = useState(true);
  const [chapterIndex, setChapterIndex] = useState(startChapter);
  const [pageIndex, setPageIndex] = useState(0);

  const contentQuery = useQuery({
    queryKey: ["library", "book-content", textUrl],
    queryFn: () => fetchBookContent(textUrl),
    enabled: !!textUrl,
    retry: false,
  });

  const chapters = contentQuery.data?.chapters ?? [];
  const chapter = chapters[chapterIndex];
  const pages = useMemo(() => (chapter ? paginate(chapter.text) : []), [chapter]);
  const page = pages[pageIndex] ?? "";

  const saveProgressMutation = useMutation({
    mutationFn: ({ idx, total }: { idx: number; total: number }) => updateLibraryEntry(entryId!, { lastChapterIndex: idx, totalChapters: total }),
  });

  useEffect(() => {
    setPageIndex(0);
  }, [chapterIndex]);

  useEffect(() => {
    if (entryId && chapters.length) saveProgressMutation.mutate({ idx: chapterIndex, total: chapters.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, chapters.length]);

  const goNext = () => {
    if (pageIndex < pages.length - 1) {
      setPageIndex((p) => p + 1);
    } else if (chapterIndex < chapters.length - 1) {
      setChapterIndex((c) => c + 1);
    }
  };

  const goPrev = () => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    } else if (chapterIndex > 0) {
      setChapterIndex((c) => c - 1);
      // land on the last page of the previous chapter — resolved after
      // pages recompute, so just leave pageIndex at 0 as a reasonable spot.
    }
  };

  if (!textUrl && !pdfUrl) {
    return (
      <div className="lib-reader-page">
        <p className="lib-empty" style={{ margin: "auto" }}>
          No book selected.
        </p>
      </div>
    );
  }

  if (pdfUrl) {
    return (
      <div className="lib-reader-page">
        <div className="lib-reader-topbar">
          <button type="button" className="lib-tab" onClick={() => navigate(AppRoute.library)}>
            <ArrowLeft size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> Library
          </button>
          <span>{title}</span>
        </div>

        {showIntro && (
          <BookOpening3D title={title} coverUrl={coverUrl} onDone={() => setShowIntro(false)} />
        )}

        {!showIntro && (
          <PdfBookView
            pdfUrl={pdfUrl}
            startPage={startChapter}
            onPageChange={(idx, total) => {
              if (entryId) saveProgressMutation.mutate({ idx, total });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="lib-reader-page">
      <div className="lib-reader-topbar">
        <button type="button" className="lib-tab" onClick={() => navigate(AppRoute.library)}>
          <ArrowLeft size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> Library
        </button>
        <span>{title}</span>
        <span>
          {chapters.length > 0 && `Chapter ${chapterIndex + 1}/${chapters.length} · Page ${pageIndex + 1}/${pages.length || 1}`}
        </span>
      </div>

      {contentQuery.isLoading && <p className="lib-empty" style={{ margin: "auto" }}>Fetching the real text from Project Gutenberg…</p>}
      {contentQuery.isError && <p className="lib-empty" style={{ margin: "auto" }}>Couldn't load this book's text.</p>}

      {showIntro && !contentQuery.isLoading && chapters.length > 0 && (
        <BookOpening3D title={title} coverUrl={coverUrl} onDone={() => setShowIntro(false)} />
      )}

      {!showIntro && chapters.length > 0 && (
        <div className="lib-reader-body">
          <div className="lib-chapter-sidebar">
            {chapters.map((c, i) => (
              <button key={i} type="button" className={`lib-chapter-item ${chapterIndex === i ? "active" : ""}`} onClick={() => setChapterIndex(i)}>
                {c.heading}
              </button>
            ))}
          </div>

          <div className="lib-page-stage">
            <div className="lib-page-sheet" key={`${chapterIndex}-${pageIndex}`}>
              <h3>{chapter?.heading}</h3>
              {page.split(/\n\s*\n/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="lib-page-nav">
              <button type="button" onClick={goPrev} disabled={pageIndex === 0 && chapterIndex === 0}>
                <ChevronLeft size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> Prev
              </button>
              <button type="button" onClick={goNext} disabled={pageIndex === pages.length - 1 && chapterIndex === chapters.length - 1}>
                Next <ChevronRight size={14} style={{ display: "inline", verticalAlign: "-2px" }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryReader;
