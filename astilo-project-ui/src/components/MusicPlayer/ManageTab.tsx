import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GlassPanel, StatCard, Chart, BarList, GradientButton, AppInput } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { deleteSong, fetchSongs, updateSong, type DownloadedSong } from "../../lib/musicApi";
import { SONGS_QUERY_KEY } from "./useMusicLibrary";
import { DEFAULT_COVER, secondsToLength } from "./tracks";
import {
  addFavorite,
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchFavorites,
  fetchPlaylist,
  fetchPlaylists,
  removeFavorite,
  removeTrackFromPlaylist,
  renamePlaylist,
  type Playlist,
} from "../../lib/playlistsApi";

const FAVORITES_QUERY_KEY = ["music", "favorites"];
const PLAYLISTS_QUERY_KEY = ["music", "playlists"];

const isAuthError = (err: unknown) =>
  Boolean(
    err &&
      typeof err === "object" &&
      "response" in err &&
      (err as { response?: { status?: number } }).response?.status === 401
  );

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

/** Bucket ISO timestamps by day, returning a running (cumulative) count per day. */
const cumulativeByDay = (dates: (string | null)[]) => {
  const days = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 10))
    .sort();
  const counts = new Map<string, number>();
  days.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1));
  let running = 0;
  const labels: string[] = [];
  const values: number[] = [];
  [...counts.entries()].forEach(([day, count]) => {
    running += count;
    labels.push(day);
    values.push(running);
  });
  return { labels, values };
};

// ---------------------------------------------------------------------------

const LibrarySection = () => {
  const queryClient = useQueryClient();
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: SONGS_QUERY_KEY,
    queryFn: fetchSongs,
    staleTime: 30_000,
  });

  const {
    data: favorites = [],
    isError: favoritesError,
  } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => fetchFavorites("track"),
    retry: false,
  });

  const {
    data: playlists = [],
    isError: playlistsError,
  } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: fetchPlaylists,
    retry: false,
  });

  useEffect(() => {
    if (favoritesError) toast.error("Couldn't load favorites.");
  }, [favoritesError]);

  useEffect(() => {
    if (playlistsError) toast.error("Couldn't load playlists.");
  }, [playlistsError]);

  const favoriteByMediaId = useMemo(() => {
    const map = new Map<string, number>();
    favorites.forEach((f) => map.set(f.mediaId, f.id));
    return map;
  }, [favorites]);

  const updateMutation = useMutation({
    mutationFn: ({ id, title, artist }: { id: number; title: string; artist: string }) =>
      updateSong(id, { title, artist }),
    onSuccess: () => {
      toast.success("Song updated");
      queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
      setEditingSongId(null);
    },
    onError: () => toast.error("Couldn't update that song."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSong(id),
    onSuccess: () => {
      toast.success("Song deleted");
      queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
    },
    onError: () => toast.error("Couldn't delete that song."),
  });

  const addFavoriteMutation = useMutation({
    mutationFn: (song: DownloadedSong) =>
      addFavorite({
        mediaType: "track",
        mediaId: String(song.id),
        title: song.title,
        artist: song.artist ?? undefined,
        posterUrl: song.coverUrl ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      toast.success("Added to favorites");
    },
    onError: (err: unknown) => {
      if (isAuthError(err)) toast.error("Log in to use favorites.");
      else toast.error("Couldn't favorite that song.");
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId: number) => removeFavorite(favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      toast.success("Removed from favorites");
    },
    onError: () => toast.error("Couldn't unfavorite that song."),
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, song }: { playlistId: number; song: DownloadedSong }) =>
      addTrackToPlaylist(playlistId, {
        trackId: String(song.id),
        title: song.title,
        artist: song.artist ?? undefined,
        artworkUrl: song.coverUrl ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      toast.success("Added to playlist");
      setMenuOpenFor(null);
    },
    onError: (err: unknown) => {
      if (isAuthError(err)) toast.error("Log in to use playlists.");
      else toast.error("Couldn't add to that playlist.");
    },
  });

  const startEdit = (song: DownloadedSong) => {
    setEditingSongId(song.id);
    setEditTitle(song.title);
    setEditArtist(song.artist || "");
  };

  const saveEdit = () => {
    if (editingSongId == null || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingSongId, title: editTitle.trim(), artist: editArtist.trim() });
  };

  return (
    <GlassPanel title="Your library" subtitle={songs.length ? `${songs.length} downloaded songs` : undefined}>
      {isLoading && (
        <div className="flex justify-center py-8">
          <AppLoader size="sm" />
        </div>
      )}
      {!isLoading && songs.length === 0 && (
        <p className="py-8 text-center text-sm text-ink/50">
          Nothing downloaded yet — grab a song from the Search Song tab first.
        </p>
      )}
      {!isLoading && songs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hair/20 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
                <th className="py-2 pr-4">Song</th>
                <th className="py-2 pr-4">Format</th>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2 pr-4">Downloaded</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => {
                const favoriteId = favoriteByMediaId.get(String(song.id));
                return (
                  <Fragment key={song.id}>
                    <tr className="border-b border-hair/10 hover:bg-ink/5">
                      <td className="py-3 pr-4">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <img
                            src={song.coverUrl || DEFAULT_COVER}
                            alt={song.title}
                            className="h-10 w-10 shrink-0 rounded-xl object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{song.title}</p>
                            <p className="truncate text-xs text-ink/50">{song.artist || "Unknown Artist"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink/60">
                        {song.mediaType === "video"
                          ? `${song.qualityLabel === "best" ? "Best" : `${song.qualityLabel}p`} video`
                          : `MP3 · ${song.bitrateKbps ?? 192}kbps`}
                      </td>
                      <td className="py-3 pr-4 text-ink/60">{secondsToLength(song.durationSeconds)}</td>
                      <td className="py-3 pr-4 text-ink/60">{fmtDate(song.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              favoriteId
                                ? removeFavoriteMutation.mutate(favoriteId)
                                : addFavoriteMutation.mutate(song)
                            }
                            disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                            className="rounded-full bg-ink/10 px-2 py-1 text-[11px] font-bold text-ink hover:bg-ink/15 disabled:opacity-50"
                            aria-label="Toggle favorite"
                          >
                            {favoriteId ? "♥" : "♡"}
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setMenuOpenFor(menuOpenFor === song.id ? null : song.id)}
                              className="rounded-full bg-ink/10 px-2 py-1 text-[11px] font-bold text-ink hover:bg-ink/15"
                              aria-label="Add to playlist"
                            >
                              + Playlist
                            </button>
                            {menuOpenFor === song.id && (
                              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-2xl border border-hair/20 bg-bg p-1.5 shadow-xl">
                                {playlists.length === 0 && (
                                  <p className="px-2 py-1.5 text-xs text-ink/50">No playlists yet.</p>
                                )}
                                {playlists.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => addToPlaylistMutation.mutate({ playlistId: p.id, song })}
                                    className="block w-full truncate rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-ink hover:bg-ink/10"
                                  >
                                    {p.name === "Favorites" ? "★ " : ""}
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => (editingSongId === song.id ? setEditingSongId(null) : startEdit(song))}
                            className="rounded-full bg-ink/10 px-2 py-1 text-[11px] font-bold text-ink hover:bg-ink/15"
                            aria-label="Edit"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete "${song.title}"? This removes the downloaded file too.`)) {
                                deleteMutation.mutate(song.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="rounded-full bg-ink/10 px-2 py-1 text-[11px] font-bold text-danger hover:bg-danger/10 disabled:opacity-50"
                            aria-label="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingSongId === song.id && (
                      <tr className="border-b border-hair/10 bg-ink/5">
                        <td colSpan={5} className="p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <AppInput value={editTitle} onValueChange={setEditTitle} label="Title" size="sm" className="flex-1" />
                            <AppInput
                              value={editArtist}
                              onValueChange={setEditArtist}
                              label="Artist"
                              size="sm"
                              className="flex-1"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={updateMutation.isPending || !editTitle.trim()}
                                className="rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-bg disabled:opacity-50"
                              >
                                {updateMutation.isPending ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSongId(null)}
                                className="px-2 text-[11px] font-semibold text-ink/50 hover:text-ink/80"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

const PlaylistsSection = () => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: playlists = [], isLoading, isError: playlistsError } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: fetchPlaylists,
    retry: false,
  });

  const { data: expandedPlaylist } = useQuery({
    queryKey: [...PLAYLISTS_QUERY_KEY, expandedId],
    queryFn: () => fetchPlaylist(expandedId as number),
    enabled: expandedId != null,
  });

  useEffect(() => {
    if (playlistsError) toast.error("Couldn't load playlists.");
  }, [playlistsError]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(name),
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

  const removeTrackMutation = useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: number; trackId: number }) =>
      removeTrackFromPlaylist(playlistId, trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      toast.success("Track removed");
    },
    onError: () => toast.error("Couldn't remove track."),
  });

  return (
    <GlassPanel
      title="Playlists"
      subtitle={playlists.length ? `${playlists.length} playlists` : undefined}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
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

      {isLoading && (
        <div className="flex justify-center py-6">
          <AppLoader size="sm" />
        </div>
      )}
      {!isLoading && playlists.length === 0 && (
        <p className="py-6 text-center text-sm text-ink/50">
          No playlists yet — create one above, or favorite a track to auto-create "Favorites".
        </p>
      )}

      <div className="flex flex-col gap-2">
        {playlists.map((p: Playlist) => (
          <div key={p.id} className="rounded-2xl bg-ink/5 px-3 py-2">
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
                    onClick={() => renameValue.trim() && renameMutation.mutate({ id: p.id, name: renameValue.trim() })}
                    className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold text-bg"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingId(null)}
                    className="text-[11px] font-semibold text-ink/50 hover:text-ink/80"
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
                    {p.name === "Favorites" ? "★ " : ""}
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(p.id);
                      setRenameValue(p.name);
                    }}
                    className="rounded-full bg-ink/10 px-2 py-1 text-[11px] font-bold text-ink hover:bg-ink/15"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete playlist "${p.name}"?`)) deleteMutation.mutate(p.id);
                    }}
                    className="rounded-full bg-ink/10 px-2 py-1 text-[11px] font-bold text-danger hover:bg-danger/10"
                  >
                    🗑
                  </button>
                </>
              )}
            </div>

            {expandedId === p.id && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-hair/15 pt-2">
                {(expandedPlaylist?.tracks ?? []).length === 0 && (
                  <p className="py-2 text-xs text-ink/50">No tracks in this playlist yet.</p>
                )}
                {(expandedPlaylist?.tracks ?? []).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1 hover:bg-ink/5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">{t.title || t.trackId}</p>
                      {t.artist && <p className="truncate text-[11px] text-ink/45">{t.artist}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTrackMutation.mutate({ playlistId: p.id, trackId: t.id })}
                      className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-danger hover:bg-danger/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

const DashboardSection = () => {
  const { data: songs = [] } = useQuery({ queryKey: SONGS_QUERY_KEY, queryFn: fetchSongs, staleTime: 30_000 });
  const { data: playlists = [] } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: fetchPlaylists,
    retry: false,
  });
  const { data: favorites = [] } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => fetchFavorites("track"),
    retry: false,
  });

  const totalDuration = songs.reduce((s, song) => s + (song.durationSeconds ?? 0), 0);
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);
  const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const bitrateBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach((s) => {
      const key = s.mediaType === "video" ? `${s.qualityLabel ?? "video"}p` : `${s.bitrateKbps ?? "unknown"} kbps`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()];
  }, [songs]);

  const downloadsOverTime = useMemo(() => cumulativeByDay(songs.map((s) => s.createdAt)), [songs]);

  const playlistTrackCounts = useMemo(() => {
    return playlists
      .map((p) => ({ name: p.name, value: p.tracks?.length ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [playlists]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Downloaded songs" value={String(songs.length)} />
        <StatCard label="Playlists" value={String(playlists.length)} />
        <StatCard label="Favorited tracks" value={String(favorites.length)} />
        <StatCard label="Total listening time" value={durationLabel} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel title="Downloads" subtitle="Cumulative over time" className="lg:col-span-2">
          {downloadsOverTime.labels.length > 0 ? (
            <Chart
              type="area"
              height={260}
              series={[{ name: "Songs", data: downloadsOverTime.values }]}
              options={{ xaxis: { categories: downloadsOverTime.labels } }}
            />
          ) : (
            <p className="py-16 text-center text-sm text-ink/50">Not enough data yet.</p>
          )}
        </GlassPanel>

        <GlassPanel title="Quality breakdown">
          {bitrateBreakdown.length > 0 ? (
            <Chart
              type="donut"
              height={220}
              series={bitrateBreakdown.map(([, count]) => count)}
              options={{
                labels: bitrateBreakdown.map(([label]) => label),
                legend: { position: "bottom" },
                stroke: { width: 0 },
                plotOptions: { pie: { donut: { size: "68%" } } },
              }}
            />
          ) : (
            <p className="py-16 text-center text-sm text-ink/50">Not enough data yet.</p>
          )}
        </GlassPanel>
      </div>

      <GlassPanel title="Playlists by track count">
        {playlistTrackCounts.length > 0 ? (
          <BarList data={playlistTrackCounts} valueFormatter={(n) => `${n} tracks`} />
        ) : (
          <p className="py-16 text-center text-sm text-ink/50">Not enough data yet.</p>
        )}
      </GlassPanel>
    </div>
  );
};

// ---------------------------------------------------------------------------

const ManageTab = () => {
  return (
    <div className="flex flex-col gap-6">
      <LibrarySection />
      <PlaylistsSection />
      <DashboardSection />
    </div>
  );
};

export default ManageTab;
