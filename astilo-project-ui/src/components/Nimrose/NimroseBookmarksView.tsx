import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, ExternalLink, Trash2 } from "lucide-react";

import { deleteBookmark, fetchBookmarks, updateBookmark } from "../../lib/browserApi";

const NimroseBookmarksView = ({ readLaterOnly = false }: { readLaterOnly?: boolean }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const bookmarksQuery = useQuery({
    queryKey: ["nimrose", "bookmarks", "all", readLaterOnly],
    queryFn: () => fetchBookmarks(readLaterOnly ? { readLater: true } : undefined),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "bookmarks"] });

  const removeMutation = useMutation({ mutationFn: deleteBookmark, onSuccess: invalidate });
  const toggleReadLaterMutation = useMutation({
    mutationFn: ({ id, readLater }: { id: number; readLater: boolean }) => updateBookmark(id, { readLater }),
    onSuccess: invalidate,
  });

  const items = (bookmarksQuery.data ?? []).filter(
    (b) => !search.trim() || (b.title ?? "").toLowerCase().includes(search.toLowerCase()) || b.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Personal</p>
          <h1 className="nimrose-page-title">{readLaterOnly ? "Saved" : "Bookmarks"}</h1>
        </div>
      </div>
      <p className="nimrose-widget-footnote" style={{ marginBottom: "0.7rem" }}>
        {readLaterOnly
          ? "Pages marked \"read later\" from the Browser."
          : "Everything starred from the Browser, across every Space."}
      </p>

      <input
        className="nimrose-notes-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={readLaterOnly ? "Search saved pages…" : "Search bookmarks…"}
        aria-label="Search"
        style={{ maxWidth: 320 }}
      />

      {items.length === 0 && (
        <p className="nimrose-widget-empty" style={{ marginTop: "0.8rem" }}>
          {readLaterOnly ? "Nothing saved for later yet." : "No bookmarks yet — star a page from the Browser."}
        </p>
      )}

      <ul className="nimrose-full-task-list" style={{ marginTop: "0.8rem" }}>
        {items.map((b) => (
          <li key={b.id} className="glass-card nimrose-full-task-item">
            <div className="nimrose-full-task-body">
              <p>{b.title || b.url}</p>
              <div className="nimrose-full-task-meta">
                {b.spaceName && <span className="nimrose-chip">{b.spaceName}</span>}
                <a href={b.url} target="_blank" rel="noreferrer" className="nimrose-chip">
                  <ExternalLink size={11} /> Open
                </a>
                <button
                  type="button"
                  className="nimrose-chip"
                  onClick={() => toggleReadLaterMutation.mutate({ id: b.id, readLater: !b.readLater })}
                >
                  <Clock size={11} /> {b.readLater ? "Saved for later" : "Save for later"}
                </button>
              </div>
            </div>
            <button type="button" className="nimrose-icon-btn" onClick={() => removeMutation.mutate(b.id)} aria-label="Remove">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NimroseBookmarksView;
