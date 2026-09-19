import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Library as LibraryIcon, Search, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import {
  addToLibrary,
  fetchLibraryCategories,
  fetchMyLibrary,
  removeFromLibrary,
  searchLibrary,
  updateLibraryEntry,
  type GutenbergBook,
  type LibraryEntry,
  type LibraryShelf,
} from "../../lib/libraryApi";
import "./Library.scss";

const SHELVES: { id: LibraryShelf; label: string }[] = [
  { id: "want_to_read", label: "Want to read" },
  { id: "reading", label: "Reading" },
  { id: "finished", label: "Finished" },
];

const LibraryHome = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"browse" | "shelf">("browse");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["library", "categories"], queryFn: fetchLibraryCategories });
  const searchQuery = useQuery({
    queryKey: ["library", "search", submitted, category],
    queryFn: () => searchLibrary({ q: submitted || undefined, topic: category ?? undefined }),
    enabled: !!submitted || !!category,
    retry: false,
  });
  const myLibraryQuery = useQuery({ queryKey: ["library", "my"], queryFn: () => fetchMyLibrary(), enabled: isAuthenticated && tab === "shelf" });

  const addMutation = useMutation({
    mutationFn: (book: GutenbergBook) =>
      addToLibrary({ gutenbergId: book.id, title: book.title, authors: book.authors, coverUrl: book.coverUrl, textUrl: book.textUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library", "my"] }),
  });
  const shelfMutation = useMutation({
    mutationFn: ({ id, shelf }: { id: number; shelf: LibraryShelf }) => updateLibraryEntry(id, { shelf }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library", "my"] }),
  });
  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromLibrary(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library", "my"] }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const openReader = (opts: { textUrl: string | null; title: string; coverUrl?: string | null; entryId?: number; chapter?: number }) => {
    if (!opts.textUrl) return;
    const p = new URLSearchParams({ textUrl: opts.textUrl, title: opts.title });
    if (opts.coverUrl) p.set("cover", opts.coverUrl);
    if (opts.entryId) p.set("entryId", String(opts.entryId));
    if (opts.chapter) p.set("chapter", String(opts.chapter));
    navigate(`${AppRoute.libraryReader}?${p.toString()}`);
  };

  const results = searchQuery.data?.data.results ?? [];
  const myBooks = myLibraryQuery.data ?? [];
  const myIds = new Set(myBooks.map((b) => b.gutenbergId));

  return (
    <div className="lib-page">
      <p className="lib-eyebrow">✦ Astilo Library</p>
      <h1 className="lib-title">
        <LibraryIcon size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Free books, real chapters
      </h1>
      <p className="lib-tagline">
        Searches Project Gutenberg's real catalog (via the free, keyless Gutendex API) — every book's actual
        text, parsed into its own chapters, not a fabricated summary.
      </p>

      <div className="lib-tabs">
        <button type="button" className={`lib-tab ${tab === "browse" ? "active" : ""}`} onClick={() => setTab("browse")}>
          Browse
        </button>
        <button type="button" className={`lib-tab ${tab === "shelf" ? "active" : ""}`} onClick={() => setTab("shelf")}>
          My Shelf {myBooks.length > 0 ? `(${myBooks.length})` : ""}
        </button>
      </div>

      {tab === "browse" && (
        <>
          <form onSubmit={submit}>
            <div className="lib-search-row">
              <input
                className="lib-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or author — Frankenstein, Jane Austen, Sherlock Holmes…"
              />
              <button type="submit" className="lib-tab">
                <Search size={12} style={{ display: "inline", verticalAlign: "-2px" }} /> Search
              </button>
            </div>
          </form>

          <div className="lib-category-row">
            {categoriesQuery.data?.map((c) => (
              <button
                key={c}
                type="button"
                className={`lib-category-chip ${category === c ? "active" : ""}`}
                onClick={() => {
                  setCategory(category === c ? null : c);
                  setSubmitted("");
                  setQuery("");
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {searchQuery.isLoading && <p className="lib-empty">Searching Project Gutenberg…</p>}
          {(submitted || category) && !searchQuery.isLoading && results.length === 0 && <p className="lib-empty">No books found.</p>}
          {!submitted && !category && <p className="lib-empty">Search, or pick a category to browse.</p>}

          <div className="lib-grid">
            {results.map((book) => (
              <div key={book.id} className="lib-book-card" onClick={() => openReader({ textUrl: book.textUrl, title: book.title, coverUrl: book.coverUrl })}>
                {book.coverUrl ? (
                  <img className="lib-book-cover" src={book.coverUrl} alt={book.title} loading="lazy" />
                ) : (
                  <div className="lib-book-cover-fallback">{book.title}</div>
                )}
                <div className="lib-book-info">
                  <p className="lib-book-title">{book.title}</p>
                  <p className="lib-book-author">{book.authors.join(", ") || "Unknown author"}</p>
                  {isAuthenticated && book.hasText && (
                    <button
                      type="button"
                      className="lib-category-chip"
                      style={{ marginTop: "0.4rem" }}
                      disabled={myIds.has(book.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        addMutation.mutate(book);
                      }}
                    >
                      {myIds.has(book.id) ? "On shelf" : "+ Add to shelf"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "shelf" && (
        <>
          {!isAuthenticated && <p className="lib-empty">Log in to keep your own shelf.</p>}
          {isAuthenticated && myBooks.length === 0 && <p className="lib-empty">Nothing on your shelf yet — add books from Browse.</p>}
          <div className="lib-grid">
            {myBooks.map((entry: LibraryEntry) => (
              <div key={entry.id} className="lib-book-card" onClick={() => openReader({ textUrl: entry.textUrl, title: entry.title, coverUrl: entry.coverUrl, entryId: entry.id, chapter: entry.lastChapterIndex })}>
                {entry.coverUrl ? (
                  <img className="lib-book-cover" src={entry.coverUrl} alt={entry.title} loading="lazy" />
                ) : (
                  <div className="lib-book-cover-fallback">{entry.title}</div>
                )}
                <div className="lib-book-info">
                  <p className="lib-book-title">{entry.title}</p>
                  <p className="lib-book-author">{entry.authors.join(", ") || "Unknown author"}</p>
                  {entry.progressPercent != null && <p className="lib-book-author">{entry.progressPercent}% read</p>}
                  <select
                    value={entry.shelf}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => shelfMutation.mutate({ id: entry.id, shelf: e.target.value as LibraryShelf })}
                    style={{ marginTop: "0.35rem", fontSize: "0.7rem", width: "100%" }}
                  >
                    {SHELVES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="lib-category-chip"
                    style={{ marginTop: "0.35rem" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMutation.mutate(entry.id);
                    }}
                  >
                    <Trash2 size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="lib-empty" style={{ marginTop: "2rem" }}>
        <BookOpen size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Public-domain books only, sourced live from
        Project Gutenberg.
      </p>
    </div>
  );
};

export default LibraryHome;
