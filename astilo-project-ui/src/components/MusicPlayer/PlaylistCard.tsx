import type { Track } from "./tracks";

interface PlaylistCardProps {
  tracks: Track[];
  active: number;
  onSelect: (index: number) => void;
}

const PlaylistCard = ({ tracks, active, onSelect }: PlaylistCardProps) => {
  return (
    <div className="glass-card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-extrabold text-ink">Queue 🎶</h3>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/60">
          {tracks.length}
        </span>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto hide-scrollbar">
        {tracks.map((track, i) => (
          <li key={`${track.name}-${i}`}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all ${
                active === i
                  ? "bg-gradient-to-r from-accent/25 to-accent-2/10 ring-1 ring-inset ring-accent/40"
                  : "hover:bg-ink/5"
              }`}
            >
              <span className="text-lg">{track.emoji}</span>
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
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlaylistCard;
