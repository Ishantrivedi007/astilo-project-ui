import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@heroui/react";
import { GradientButton } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import {
  downloadSong,
  fetchSongs,
  searchSongs,
  type DownloadedSong,
  type DownloadOptions,
  type SongSearchHit,
} from "../../lib/musicApi";
import { DEFAULT_COVER, secondsToLength } from "./tracks";
import { SONGS_QUERY_KEY } from "./useMusicLibrary";

const FUN_MESSAGES = [
  "Scouring YouTube for the perfect match…",
  "Converting your file…",
  "Fetching album art…",
  "Tagging the file with love…",
  "Almost there — mixing the final bits…",
];

const MP3_BITRATES = [128, 192, 256, 320];
const VIDEO_QUALITIES = ["360", "480", "720", "1080", "best"];

interface SongSearchTabProps {
  onPlay: (song: DownloadedSong) => void;
}

const SongSearchTab = ({ onPlay }: SongSearchTabProps) => {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [messageIdx, setMessageIdx] = useState(0);
  const [activeHit, setActiveHit] = useState<SongSearchHit | null>(null);
  const [format, setFormat] = useState<"mp3" | "video">("mp3");
  const [bitrate, setBitrate] = useState(192);
  const [quality, setQuality] = useState("720");
  const queryClient = useQueryClient();

  const { data: library = [], isLoading: libraryLoading } = useQuery({
    queryKey: SONGS_QUERY_KEY,
    queryFn: fetchSongs,
    staleTime: 30_000,
  });

  const searchQuery = useQuery({
    queryKey: ["song-search", submittedQuery],
    queryFn: () => searchSongs(submittedQuery),
    enabled: submittedQuery.length > 0,
    staleTime: 60_000,
  });

  const downloadMutation = useMutation({
    mutationFn: (options: DownloadOptions) => downloadSong(options),
    onMutate: () => {
      setMessageIdx(0);
      const interval = window.setInterval(() => {
        setMessageIdx((i) => (i + 1) % FUN_MESSAGES.length);
      }, 3500);
      return { interval };
    },
    onSuccess: (song) => {
      toast.success(`Downloaded "${song.title}" 🎉`);
      queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
      setActiveHit(null);
    },
    onError: () => {
      toast.error("Couldn't download that — try a different pick or option.");
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context?.interval) window.clearInterval(context.interval);
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || searchQuery.isFetching) return;
    setActiveHit(null);
    setSubmittedQuery(query.trim());
  };

  const openOptionsFor = (hit: SongSearchHit) => {
    setActiveHit(hit);
    setFormat("mp3");
    setBitrate(192);
    setQuality("720");
  };

  const confirmDownload = () => {
    if (!activeHit) return;
    downloadMutation.mutate({
      youtubeId: activeHit.youtubeId,
      title: activeHit.title,
      artist: activeHit.channel ?? undefined,
      format,
      bitrate: format === "mp3" ? bitrate : undefined,
      quality: format === "video" ? quality : undefined,
    });
  };

  const results = searchQuery.data?.results ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="glass-card p-6">
        <h3 className="font-display text-lg font-extrabold text-ink">
          Find a song
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          Search any song or artist, pick the best match, then choose MP3 or
          video and your preferred quality before downloading.
        </p>

        <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onValueChange={setQuery}
            placeholder="e.g. Blinding Lights The Weeknd"
            variant="bordered"
            radius="full"
            className="flex-1"
            isDisabled={searchQuery.isFetching}
          />
          <GradientButton
            type="submit"
            radius="full"
            isDisabled={!query.trim() || searchQuery.isFetching}
            className="shrink-0"
          >
            {searchQuery.isFetching ? "Searching…" : "Search"}
          </GradientButton>
        </form>

        {searchQuery.isFetching && (
          <div className="mt-6 flex justify-center py-8">
            <AppLoader label="Looking on YouTube…" />
          </div>
        )}

        {searchQuery.isError && (
          <p className="mt-6 text-sm text-danger">
            Search failed — try again in a moment.
          </p>
        )}

        {!searchQuery.isFetching && submittedQuery && results.length === 0 && !searchQuery.isError && (
          <p className="mt-6 text-sm text-ink/50">No matches found. Try a different query.</p>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            {results.map((hit) => (
              <div key={hit.youtubeId} className="rounded-3xl bg-ink/5 p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={hit.thumbnailUrl || DEFAULT_COVER}
                    alt={hit.title}
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{hit.title}</p>
                    <p className="truncate text-xs text-ink/50">
                      {hit.channel}
                      {hit.durationSeconds ? ` · ${secondsToLength(hit.durationSeconds)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openOptionsFor(hit)}
                    className="shrink-0 rounded-full bg-ink/10 px-4 py-2 text-xs font-bold text-ink hover:bg-ink/15"
                  >
                    Download
                  </button>
                </div>

                {activeHit?.youtubeId === hit.youtubeId && (
                  <div className="mt-3 rounded-2xl bg-ink/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-ink/50">
                        Format
                      </span>
                      {(["mp3", "video"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormat(f)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                            format === f
                              ? "bg-ink text-bg"
                              : "bg-ink/10 text-ink/70 hover:bg-ink/15"
                          }`}
                        >
                          {f === "mp3" ? "MP3 (audio)" : "Video (MP4)"}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-ink/50">
                        {format === "mp3" ? "Bitrate" : "Quality"}
                      </span>
                      {format === "mp3"
                        ? MP3_BITRATES.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setBitrate(b)}
                              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                                bitrate === b
                                  ? "bg-ink text-bg"
                                  : "bg-ink/10 text-ink/70 hover:bg-ink/15"
                              }`}
                            >
                              {b} kbps
                            </button>
                          ))
                        : VIDEO_QUALITIES.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setQuality(q)}
                              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                                quality === q
                                  ? "bg-ink text-bg"
                                  : "bg-ink/10 text-ink/70 hover:bg-ink/15"
                              }`}
                            >
                              {q === "best" ? "Best" : `${q}p`}
                            </button>
                          ))}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <GradientButton
                        size="sm"
                        radius="full"
                        onPress={confirmDownload}
                        isDisabled={downloadMutation.isPending}
                      >
                        {downloadMutation.isPending ? "Downloading…" : "Confirm & download"}
                      </GradientButton>
                      <button
                        type="button"
                        onClick={() => setActiveHit(null)}
                        className="text-xs font-semibold text-ink/50 hover:text-ink/80"
                      >
                        Cancel
                      </button>
                    </div>

                    {downloadMutation.isPending && (
                      <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl bg-ink/5 py-6">
                        <AppLoader label={FUN_MESSAGES[messageIdx]} size="sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {downloadMutation.isSuccess && !downloadMutation.isPending && (
          <div className="mt-6 flex items-center gap-4 rounded-3xl bg-ink/5 p-4">
            <img
              src={downloadMutation.data.coverUrl || DEFAULT_COVER}
              alt={downloadMutation.data.title}
              className="h-16 w-16 rounded-2xl object-cover shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-bold text-ink">
                {downloadMutation.data.title}
              </p>
              <p className="truncate text-sm text-ink/60">
                {downloadMutation.data.artist}
                {downloadMutation.data.mediaType === "video"
                  ? ` · ${downloadMutation.data.qualityLabel === "best" ? "Best" : `${downloadMutation.data.qualityLabel}p`} video`
                  : ` · ${downloadMutation.data.bitrateKbps} kbps MP3`}
              </p>
            </div>
            {downloadMutation.data.mediaType === "audio" && (
              <button
                type="button"
                onClick={() => onPlay(downloadMutation.data)}
                className="rounded-full bg-ink/10 px-4 py-2 text-xs font-bold text-ink hover:bg-ink/15"
              >
                Play ▶
              </button>
            )}
          </div>
        )}
      </div>

      <div className="glass-card flex max-h-[520px] flex-col p-5">
        <h3 className="mb-4 font-display text-lg font-extrabold text-ink">
          Download history
        </h3>
        <div className="flex-1 space-y-2 overflow-y-auto hide-scrollbar">
          {libraryLoading && (
            <div className="flex justify-center py-8">
              <AppLoader size="sm" />
            </div>
          )}
          {!libraryLoading && library.length === 0 && (
            <p className="text-sm text-ink/50">
              Nothing downloaded yet — search for a song to get started.
            </p>
          )}
          {library.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-ink/5"
            >
              <img
                src={song.coverUrl || DEFAULT_COVER}
                alt={song.title}
                className="h-10 w-10 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {song.title}
                </p>
                <p className="truncate text-xs text-ink/50">
                  {song.artist}
                  {" · "}
                  {song.mediaType === "video"
                    ? `${song.qualityLabel === "best" ? "Best" : `${song.qualityLabel}p`} video`
                    : `${song.bitrateKbps ?? 192}kbps`}
                </p>
              </div>
              {song.mediaType === "audio" ? (
                <button
                  type="button"
                  onClick={() => onPlay(song)}
                  className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-[11px] font-bold text-ink hover:bg-ink/15"
                >
                  Play
                </button>
              ) : (
                <a
                  href={song.audioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-[11px] font-bold text-ink hover:bg-ink/15"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SongSearchTab;
