import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { MediaItem } from "../../lib/tmdb";

interface MovieRowProps {
  label: string;
  emoji: string;
  items?: MediaItem[];
  isLoading?: boolean;
}

const PosterCard = ({ item }: { item: MediaItem }) => (
  <article className="group relative w-[140px] shrink-0 snap-start sm:w-[160px]">
    <div className="glass-card overflow-hidden transition-transform duration-300 group-hover:-translate-y-1.5">
      {item.poster ? (
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          className="aspect-[2/3] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[2/3] w-full place-items-center bg-ink/10 text-ink/40">
          {item.title}
        </div>
      )}
      {item.rating > 0 && (
        <span className="absolute right-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
          ★ {item.rating.toFixed(1)}
        </span>
      )}
    </div>
    <p className="mt-2 truncate text-sm font-semibold text-ink">{item.title}</p>
    <p className="text-xs text-ink/50">
      {item.year || "—"} · {item.kind === "tv" ? "Series" : "Film"}
    </p>
  </article>
);

const SkeletonCard = () => (
  <div className="w-[140px] shrink-0 sm:w-[160px]">
    <div className="glass-card aspect-[2/3] w-full animate-pulse" />
    <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-ink/10" />
  </div>
);

const MovieRow = ({ label, emoji, items, isLoading }: MovieRowProps) => {
  const [scrollerRef] = useAutoAnimate<HTMLDivElement>();

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 font-display text-xl font-bold text-ink">
        {emoji} {label}
      </h2>
      <div
        ref={scrollerRef}
        className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar"
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items!.map((item) => (
              <PosterCard key={`${item.kind}-${item.id}`} item={item} />
            ))}
      </div>
    </section>
  );
};

export default MovieRow;
