import { Link } from "react-router-dom";
import type { MediaItem } from "../../lib/tmdb";
import AddToPlaylistButton from "./AddToPlaylistButton";

interface PosterCardProps {
  item: MediaItem;
  basePath?: string;
  saved?: boolean;
  onToggleWatchlist?: (item: MediaItem) => void;
  showPlaylistButton?: boolean;
  className?: string;
}

/** Poster card used across rows, search results, category and watchlist pages. */
const PosterCard = ({
  item,
  basePath = "/movies",
  saved,
  onToggleWatchlist,
  showPlaylistButton = true,
  className = "w-[140px] shrink-0 sm:w-[160px]",
}: PosterCardProps) => (
  <div className={`group relative ${className}`}>
    <Link to={`${basePath}/${item.kind}/${item.id}`} className="block snap-start">
      <div className="glass-card overflow-hidden transition-transform duration-300 group-hover:-translate-y-1.5">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[2/3] w-full place-items-center bg-ink/10 p-2 text-center text-xs text-ink/40">
            {item.title}
          </div>
        )}
        {item.rating > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
            ★ {item.rating.toFixed(1)}
          </span>
        )}
        {showPlaylistButton && (
          <div className="absolute right-2 bottom-2">
            <AddToPlaylistButton item={item} />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{item.title}</p>
      <p className="text-xs text-ink/50">
        {item.year || "—"} · {item.kind === "tv" ? "Series" : "Film"}
      </p>
    </Link>
    {onToggleWatchlist && (
      <button
        type="button"
        aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
        title={saved ? "Remove from watchlist" : "Add to watchlist"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleWatchlist(item);
        }}
        className={`absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full text-sm font-bold backdrop-blur transition-opacity ${
          saved
            ? "bg-accent-2 text-white opacity-100"
            : "bg-black/60 text-white opacity-0 group-hover:opacity-100"
        }`}
      >
        {saved ? "✓" : "+"}
      </button>
    )}
  </div>
);

export default PosterCard;
