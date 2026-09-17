import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeading, AppInput, GradientButton, GlassPanel } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { searchMedia, hasTmdb, type MediaItem } from "../../lib/tmdb";
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchPlaylist,
  fetchPlaylists,
  removeTrackFromPlaylist,
  renamePlaylist,
  type Playlist,
} from "../../lib/playlistsApi";
import { MOVIE_PLAYLISTS_QUERY_KEY } from "./AddToPlaylistButton";
import "./Movies.scss";

const isAuthError = (err: unknown) =>
  Boolean(
    err &&
      typeof err === "object" &&
      "response" in err &&
      (err as { response?: { status?: number } }).response?.status === 401
  );

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

interface MoviePlaylistsProps {
  basePath?: string;
  backLabel?: string;
}

// ---------------------------------------------------------------------------

/** Search a title and add it straight to a chosen playlist — no need to leave this page. */
const AddTitleSection = ({ playlists }: { playlists: Playlist[] }) => {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | "">("");
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!hasTmdb || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchMedia(term));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const reposition = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  useEffect(() => {
    if (!targetId && playlists.length) setTargetId(playlists[0].id);
    if (targetId && !playlists.some((p) => p.id === targetId)) {
      setTargetId(playlists[0]?.id ?? "");
    }
  }, [playlists, targetId]);

  const addMutation = useMutation({
    mutationFn: ({ playlistId, item }: { playlistId: number; item: MediaItem }) =>
      addTrackToPlaylist(playlistId, {
        trackId: String(item.id),
        mediaType: item.kind,
        title: item.title,
        artworkUrl: item.poster,
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: MOVIE_PLAYLISTS_QUERY_KEY });
      toast.success(`Added to ${playlists.find((p) => p.id === vars.playlistId)?.name ?? "playlist"}`);
    },
    onError: (err: unknown) => {
      if (isAuthError(err)) toast.error("Log in to use playlists.");
      else toast.error("Couldn't add that title.");
    },
  });

  return (
    <GlassPanel
      title="Add a title"
      subtitle="Search movies & TV series and drop them straight into a playlist."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div ref={boxRef} className="relative flex-1">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={hasTmdb ? "Search a movie or TV series…" : "Search unavailable — add a TMDB key"}
            disabled={!hasTmdb}
            className="w-full rounded-xl border border-hair/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
          />

          {open &&
            q.trim().length >= 2 &&
            (loading || results.length > 0) &&
            createPortal(
              <div
                ref={menuRef}
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                  width: menuPos.width,
                }}
                className="z-[999] max-h-80 overflow-y-auto rounded-xl border border-hair/20 bg-surface p-1 shadow-xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {loading && (
                  <div className="flex justify-center p-3">
                    <AppLoader size="sm" />
                  </div>
                )}
                {!loading &&
                  results.map((m) => (
                    <div
                      key={`${m.kind}-${m.id}`}
                      className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-ink/5"
                    >
                      <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-ink/10">
                        {m.poster && (
                          <img src={m.poster} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{m.title}</span>
                        <span className="text-[11px] text-ink/40">
                          {m.year || "—"} · {m.kind === "tv" ? "Series" : "Film"}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={!targetId || addMutation.isPending}
                        onClick={() =>
                          typeof targetId === "number" &&
                          addMutation.mutate({ playlistId: targetId, item: m })
                        }
                        className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-app disabled:opacity-40"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                {!loading && results.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-ink/50">No matches.</p>
                )}
              </div>,
              document.body
            )}
        </div>

        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : "")}
          disabled={playlists.length === 0}
          className="rounded-xl border border-hair/20 bg-surface/60 px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
        >
          {playlists.length === 0 && <option value="">Create a playlist first</option>}
          {playlists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

interface PlaylistCounts {
  total: number;
  movies: number;
  series: number;
}

/** Table summary of every playlist: total titles, movie count, TV count. */
const PlaylistTable = ({
  playlists,
  onSelect,
}: {
  playlists: Playlist[];
  onSelect: (id: number) => void;
}) => {
  const detailQueries = useQueries({
    queries: playlists.map((p) => ({
      queryKey: [...MOVIE_PLAYLISTS_QUERY_KEY, p.id],
      queryFn: () => fetchPlaylist(p.id),
      staleTime: 30_000,
    })),
  });

  const counts: Record<number, PlaylistCounts> = useMemo(() => {
    const out: Record<number, PlaylistCounts> = {};
    playlists.forEach((p, i) => {
      const tracks = detailQueries[i]?.data?.tracks ?? [];
      out[p.id] = {
        total: tracks.length,
        movies: tracks.filter((t) => t.mediaType === "movie").length,
        series: tracks.filter((t) => t.mediaType === "tv").length,
      };
    });
    return out;
  }, [playlists, detailQueries]);

  const grandTotal = useMemo(
    () =>
      Object.values(counts).reduce(
        (acc, c) => ({
          total: acc.total + c.total,
          movies: acc.movies + c.movies,
          series: acc.series + c.series,
        }),
        { total: 0, movies: 0, series: 0 }
      ),
    [counts]
  );

  if (playlists.length === 0) return null;

  return (
    <GlassPanel title="Playlists overview">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hair/20 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
              <th className="py-2 pr-4">Playlist</th>
              <th className="py-2 pr-4">Movies</th>
              <th className="py-2 pr-4">TV series</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {playlists.map((p) => {
              const c = counts[p.id] ?? { total: 0, movies: 0, series: 0 };
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="cursor-pointer border-b border-hair/10 hover:bg-ink/5"
                >
                  <td className="py-2.5 pr-4 font-semibold text-ink">{p.name}</td>
                  <td className="py-2.5 pr-4 text-ink/70">{c.movies}</td>
                  <td className="py-2.5 pr-4 text-ink/70">{c.series}</td>
                  <td className="py-2.5 pr-4 font-bold text-ink">{c.total}</td>
                  <td className="py-2.5 pr-4 text-ink/50">{fmtDate(p.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-sm font-bold text-ink">
              <td className="pt-3 pr-4">All playlists ({playlists.length})</td>
              <td className="pt-3 pr-4">{grandTotal.movies}</td>
              <td className="pt-3 pr-4">{grandTotal.series}</td>
              <td className="pt-3 pr-4">{grandTotal.total}</td>
              <td className="pt-3 pr-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

/** Full CRUD for movie/TV playlists — create, rename, delete, and manage titles inside each. */
const MoviePlaylists = ({ basePath = "/movies", backLabel = "movies" }: MoviePlaylistsProps) => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const {
    data: playlists = [],
    isLoading,
    isError: playlistsError,
  } = useQuery({
    queryKey: MOVIE_PLAYLISTS_QUERY_KEY,
    queryFn: () => fetchPlaylists("movie"),
    retry: false,
  });

  const { data: expandedPlaylist, isLoading: expandedLoading } = useQuery({
    queryKey: [...MOVIE_PLAYLISTS_QUERY_KEY, expandedId],
    queryFn: () => fetchPlaylist(expandedId as number),
    enabled: expandedId != null,
  });

  useEffect(() => {
    if (playlistsError) toast.error("Couldn't load playlists — log in to use them.");
  }, [playlistsError]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: MOVIE_PLAYLISTS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(name, "movie"),
    onSuccess: () => {
      invalidate();
      toast.success("Playlist created");
      setNewName("");
    },
    onError: (err: unknown) => {
      if (isAuthError(err)) toast.error("Log in to create playlists.");
      else toast.error("Couldn't create playlist.");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renamePlaylist(id, name),
    onSuccess: () => {
      invalidate();
      toast.success("Playlist renamed");
      setRenamingId(null);
    },
    onError: () => toast.error("Couldn't rename playlist."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlaylist(id),
    onSuccess: (_data, id) => {
      invalidate();
      if (expandedId === id) setExpandedId(null);
      toast.success("Playlist deleted");
    },
    onError: () => toast.error("Couldn't delete playlist."),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: number; trackId: number }) =>
      removeTrackFromPlaylist(playlistId, trackId),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from playlist");
    },
    onError: () => toast.error("Couldn't remove that title."),
  });

  return (
    <div>
      <Link
        to={basePath}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
      >
        ← Back to {backLabel}
      </Link>
      <PageHeading eyebrow="✦ your library">
        My <span className="gradient-text">playlists</span>
      </PageHeading>

      <div className="flex flex-col gap-6">
        <GlassPanel
          title="Create a playlist"
          subtitle="Group movies & shows however you like — by mood, franchise, watch party…"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <AppInput
              value={newName}
              onValueChange={setNewName}
              placeholder="New playlist name"
              size="sm"
              className="flex-1"
            />
            <GradientButton
              size="sm"
              radius="full"
              isDisabled={!newName.trim() || createMutation.isPending}
              onPress={() => createMutation.mutate(newName.trim())}
            >
              + Create
            </GradientButton>
          </div>
        </GlassPanel>

        {playlists.length > 0 && <AddTitleSection playlists={playlists} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <AppLoader size="sm" />
          </div>
        )}
        {!isLoading && playlists.length === 0 && (
          <p className="glass-card p-8 text-center text-sm text-ink/50">
            No playlists yet — create one above, or use the "+ Playlist" button on any poster.
          </p>
        )}

        <PlaylistTable playlists={playlists} onSelect={(id) => setExpandedId(id === expandedId ? null : id)} />

        <div className="flex flex-col gap-3">
          {playlists.map((p: Playlist) => (
            <div key={p.id} className="glass-card p-4">
              <div className="flex items-center gap-2">
                {renamingId === p.id ? (
                  <>
                    <AppInput
                      value={renameValue}
                      onValueChange={setRenameValue}
                      size="sm"
                      className="flex-1"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() =>
                        renameValue.trim() &&
                        renameMutation.mutate({ id: p.id, name: renameValue.trim() })
                      }
                      className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-app"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="text-xs font-semibold text-ink/50 hover:text-ink/80"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="flex-1 truncate text-left text-sm font-semibold text-ink"
                    >
                      {expandedId === p.id ? "▾" : "▸"} {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameValue(p.name);
                      }}
                      className="rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-ink/15"
                    >
                      ✎ Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete playlist "${p.name}"?`)) deleteMutation.mutate(p.id);
                      }}
                      className="rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-bold text-danger hover:bg-danger/10"
                    >
                      🗑 Delete
                    </button>
                  </>
                )}
              </div>

              {expandedId === p.id && (
                <div className="mt-3 border-t border-hair/15 pt-3">
                  {expandedLoading && (
                    <div className="flex justify-center py-4">
                      <AppLoader size="sm" />
                    </div>
                  )}
                  {!expandedLoading && (expandedPlaylist?.tracks ?? []).length === 0 && (
                    <p className="py-2 text-xs text-ink/50">No titles in this playlist yet.</p>
                  )}
                  {!expandedLoading && (expandedPlaylist?.tracks?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {expandedPlaylist!.tracks!.map((t) => (
                        <div key={t.id} className="group relative">
                          <Link
                            to={`${basePath}/${t.mediaType === "tv" ? "tv" : "movie"}/${t.trackId}`}
                            className="block"
                          >
                            <div className="glass-card overflow-hidden">
                              {t.artworkUrl ? (
                                <img
                                  src={t.artworkUrl}
                                  alt={t.title ?? ""}
                                  loading="lazy"
                                  className="aspect-[2/3] w-full object-cover"
                                />
                              ) : (
                                <div className="grid aspect-[2/3] w-full place-items-center bg-ink/10 p-2 text-center text-xs text-ink/40">
                                  {t.title}
                                </div>
                              )}
                            </div>
                            <p className="mt-1.5 truncate text-xs font-semibold text-ink">
                              {t.title || t.trackId}
                            </p>
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              removeItemMutation.mutate({ playlistId: p.id, trackId: t.id })
                            }
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                            aria-label="Remove from playlist"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoviePlaylists;
