import { Link } from "react-router-dom";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { MediaItem } from "../../lib/tmdb";
import PosterCard from "./PosterCard";

interface MovieRowProps {
  id?: string;
  label: string;
  emoji: string;
  items?: MediaItem[];
  isLoading?: boolean;
  basePath?: string;
  categoryPath?: string;
  isInWatchlist?: (kind: string, id: number | string) => boolean;
  onToggleWatchlist?: (item: MediaItem) => void;
}

const SkeletonCard = () => (
  <div className="w-[140px] shrink-0 sm:w-[160px]">
    <div className="glass-card aspect-[2/3] w-full animate-pulse" />
    <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-ink/10" />
  </div>
);

const MovieRow = ({
  id,
  label,
  emoji,
  items,
  isLoading,
  basePath = "/movies",
  categoryPath,
  isInWatchlist,
  onToggleWatchlist,
}: MovieRowProps) => {
  const [scrollerRef] = useAutoAnimate<HTMLDivElement>();

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">
          {emoji} {label}
        </h2>
        {categoryPath && id && (
          <Link
            to={`${categoryPath}/${id}`}
            className="text-xs font-semibold text-accent-2 hover:underline"
          >
            View more →
          </Link>
        )}
      </div>
      <div
        ref={scrollerRef}
        className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar"
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items!.map((item) => (
              <PosterCard
                key={`${item.kind}-${item.id}`}
                item={item}
                basePath={basePath}
                saved={isInWatchlist?.(item.kind, item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
      </div>
    </section>
  );
};

export default MovieRow;
