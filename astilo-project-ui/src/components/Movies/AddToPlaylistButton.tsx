import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addTrackToPlaylist,
  createPlaylist,
  fetchPlaylists,
} from "../../lib/playlistsApi";
import type { MediaItem } from "../../lib/tmdb";

export const MOVIE_PLAYLISTS_QUERY_KEY = ["movies", "playlists"];

const isAuthError = (err: unknown) =>
  Boolean(
    err &&
      typeof err === "object" &&
      "response" in err &&
      (err as { response?: { status?: number } }).response?.status === 401
  );

interface AddToPlaylistButtonProps {
  item: MediaItem;
  className?: string;
  variant?: "icon" | "label";
  dark?: boolean;
}

const MENU_WIDTH = 208; // 13rem, matches w-52

/** Small "+ Playlist" popover — add a title to an existing movie playlist, or spin up a new one.
 * The menu renders in a portal so it always escapes clipping ancestors (poster
 * card overflow, horizontal row scrollers, grid cells, etc). */
const AddToPlaylistButton = ({
  item,
  className = "",
  variant = "icon",
  dark = false,
}: AddToPlaylistButtonProps) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: playlists = [] } = useQuery({
    queryKey: MOVIE_PLAYLISTS_QUERY_KEY,
    queryFn: () => fetchPlaylists("movie"),
    retry: false,
    enabled: open,
  });

  const reposition = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );
    const top = Math.min(rect.bottom + 6, window.innerHeight - 8);
    setMenuPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const addMutation = useMutation({
    mutationFn: (playlistId: number) =>
      addTrackToPlaylist(playlistId, {
        trackId: String(item.id),
        mediaType: item.kind,
        title: item.title,
        artworkUrl: item.poster,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOVIE_PLAYLISTS_QUERY_KEY });
      toast.success("Added to playlist");
      setOpen(false);
    },
    onError: (err: unknown) => {
      if (isAuthError(err)) toast.error("Log in to use playlists.");
      else toast.error("Couldn't add to that playlist.");
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(name, "movie"),
    onSuccess: (playlist) => {
      queryClient.invalidateQueries({ queryKey: MOVIE_PLAYLISTS_QUERY_KEY });
      setNewName("");
      addMutation.mutate(playlist.id);
    },
    onError: (err: unknown) => {
      if (isAuthError(err)) toast.error("Log in to use playlists.");
      else toast.error("Couldn't create playlist.");
    },
  });

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        aria-label="Add to playlist"
        title="Add to playlist"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          variant === "icon"
            ? "grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-black/80"
            : dark
              ? "rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              : "rounded-full border border-hair/20 px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
        }
      >
        {variant === "icon" ? "🎞" : "+ Playlist"}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
            className="z-[999] rounded-2xl border border-hair/20 bg-surface p-1.5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {playlists.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-ink/50">No playlists yet.</p>
            )}
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(p.id)}
                className="block w-full truncate rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-ink hover:bg-ink/10 disabled:opacity-50"
              >
                {p.name}
              </button>
            ))}
            <div className="mt-1 flex items-center gap-1 border-t border-hair/15 pt-1.5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) createMutation.mutate(newName.trim());
                }}
                placeholder="New playlist…"
                className="w-full rounded-lg border border-hair/20 bg-transparent px-2 py-1 text-xs text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(newName.trim())}
                className="shrink-0 rounded-lg bg-ink px-2 py-1 text-[11px] font-bold text-app disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AddToPlaylistButton;
