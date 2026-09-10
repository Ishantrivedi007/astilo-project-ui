import { useState } from "react";

interface Track {
  name: string;
  artist: string;
  length: string;
  emoji: string;
}

const tracks: Track[] = [
  { name: "Copines", artist: "Aya Nakamura", length: "3:36", emoji: "🔥" },
  { name: "La Vie En Rose", artist: "Louis Armstrong", length: "3:27", emoji: "🌹" },
  { name: "Iris", artist: "Goo Goo Dolls", length: "4:49", emoji: "👁️" },
  { name: "Hello", artist: "Adele", length: "4:55", emoji: "📞" },
  { name: "Conversations in the Dark", artist: "John Legend", length: "3:59", emoji: "🌙" },
  { name: "It Might Be You", artist: "Stephen Bishop", length: "3:52", emoji: "✨" },
  { name: "Someone Like You", artist: "Adele", length: "4:45", emoji: "💧" },
];

const PlaylistCard = () => {
  const [active, setActive] = useState(0);

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
          <li key={track.name}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all ${
                active === i
                  ? "bg-gradient-to-r from-accent/25 to-accent-2/10 ring-1 ring-accent/40"
                  : "hover:bg-ink/5"
              }`}
            >
              <span className="text-lg">{track.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {track.name}
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
