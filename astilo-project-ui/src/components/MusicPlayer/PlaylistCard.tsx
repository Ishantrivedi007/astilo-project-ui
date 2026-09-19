import { DEFAULT_COVER, type Track } from "./tracks";
import type { Playlist } from "../../lib/playlistsApi";

export type QueueSource = "all" | "downloaded" | number;

interface PlaylistCardProps {
  tracks: Track[];
  active: number;
  onSelect: (index: number) => void;
  onRemove: (track: Track, index: number) => void;
  source: QueueSource;
  onSourceChange: (source: QueueSource) => void;
  playlists: Playlist[];
}

const PlaylistCard = ({
  tracks,
  active,
  onSelect,
  onRemove,
  source,
  onSourceChange,
  playlists,
}: PlaylistCardProps) => {
  const pillClass = (isActive: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
      isActive
        ? "bg-gradient-to-r from-accent to-accent-2 text-app"
        : "bg-ink/10 text-ink/60 hover:bg-ink/15"
    }`;

  return (
    <div className="neon-card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-extrabold text-ink">Queue 🎶</h3>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/60">
          {tracks.length}
        </span>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto hide-scrollbar">
        <button type="button" className={pillClass(source === "all")} onClick={() => onSourceChange("all")}>
          All
        </button>
        <button
          type="button"
          className={pillClass(source === "downloaded")}
          onClick={() => onSourceChange("downloaded")}
        >
          Downloaded
        </button>
        {playlists.map((p) => (
          <button
            key={p.id}
            type="button"
            className={pillClass(source === p.id)}
            onClick={() => onSourceChange(p.id)}
          >
            {p.name === "Favorites" ? "★ " : ""}
            {p.name}
          </button>
        ))}
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto hide-scrollbar">
        {tracks.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-ink/50">Nothing here yet.</li>
        )}
        {tracks.map((track, i) => (
          <li key={`${track.songId ?? track.playlistTrackId ?? track.name}-${i}`}>
            <div
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2 transition-all ${
                active === i
                  ? "bg-gradient-to-r from-accent/25 to-accent-2/10 ring-1 ring-inset ring-accent/40"
                  : "hover:bg-ink/5"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(i)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <img
                  src={track.cover || DEFAULT_COVER}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {track.name}
                    {track.audio && (
                      <span
                        className="ml-1.5 align-middle text-[10px] text-accent-2"
                        title="Playable"
                      >
                        ▶
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-ink/50">
                    {track.artist}
                  </span>
                </span>
                <span className="font-mono text-xs text-ink/40">
                  {track.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(track, i)}
                className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink/40 opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                aria-label={`Remove ${track.name} from queue`}
                title="Remove from queue"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlaylistCard;
