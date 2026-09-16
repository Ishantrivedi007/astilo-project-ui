import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { toast } from "sonner";
import {
  useMovieStore,
  type Review,
  type RecommendedMedia,
} from "./useMovieStore";
import { searchMedia, hasTmdb, type MediaItem } from "../../lib/tmdb";

const StarRating = ({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 10 }).map((_, i) => {
      const n = i + 1;
      return (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none transition-transform ${
            readOnly ? "" : "hover:scale-125"
          } ${n <= value ? "text-amber-400" : "text-ink/20"}`}
          aria-label={`${n} of 10`}
        >
          ★
        </button>
      );
    })}
    <span className="ml-1.5 text-xs font-bold text-ink/60">{value || "–"}/10</span>
  </div>
);

const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const RecommendChip = ({ rec }: { rec: RecommendedMedia }) => {
  const inner = (
    <>
      <div className="h-[84px] w-[56px] shrink-0 overflow-hidden rounded-md bg-ink/10">
        {rec.poster ? (
          <img
            src={rec.poster}
            alt={rec.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center p-1 text-center text-[9px] text-ink/40">
            {rec.title}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink">{rec.title}</p>
        {rec.year && <p className="text-[11px] text-ink/40">{rec.year}</p>}
      </div>
    </>
  );
  const cls =
    "flex w-[180px] shrink-0 items-center gap-2 rounded-lg border border-hair/15 p-1.5";
  return rec.id ? (
    <Link to={`/movies/${rec.kind}/${rec.id}`} className={`${cls} hover:border-accent`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

const ReviewCard = ({
  review,
  onDelete,
}: {
  review: Review;
  onDelete: (id: string) => void;
}) => (
  <article className="glass-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">
          {review.author.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{review.author}</p>
          <p className="text-xs text-ink/40">{timeAgo(review.createdAt)}</p>
        </div>
      </div>
      <StarRating value={review.rating} readOnly />
    </div>
    {review.body && (
      <p className="mt-3 whitespace-pre-wrap text-sm text-ink/80">{review.body}</p>
    )}
    {review.recommends.length > 0 && (
      <div className="mt-3">
        <p className="mb-2 text-xs text-ink/50">Also recommends</p>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 hide-scrollbar">
          {review.recommends.map((rec) => (
            <RecommendChip key={`${rec.kind}-${rec.id}-${rec.title}`} rec={rec} />
          ))}
        </div>
      </div>
    )}
    <button
      type="button"
      onClick={() => onDelete(review.id)}
      className="mt-2 text-xs text-ink/30 hover:text-danger"
    >
      remove
    </button>
  </article>
);

const toRec = (m: MediaItem): RecommendedMedia => ({
  id: m.id,
  title: m.title,
  poster: m.poster,
  year: m.year,
  kind: m.kind,
});

const MoviePicker = ({
  picked,
  onChange,
}: {
  picked: RecommendedMedia[];
  onChange: (next: RecommendedMedia[]) => void;
}) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (rec: RecommendedMedia) => {
    if (!picked.some((p) => p.id === rec.id && p.title === rec.title)) {
      onChange([...picked, rec]);
    }
    setQ("");
    setResults([]);
    setOpen(false);
  };

  const addFreeText = () => {
    const term = q.trim();
    if (term)
      add({ id: 0, title: term, poster: "", year: "", kind: "movie" });
  };

  return (
    <div ref={boxRef} className="relative mt-3">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !hasTmdb) {
            e.preventDefault();
            addFreeText();
          }
        }}
        placeholder={
          hasTmdb
            ? "If you liked this, also watch… (search a title)"
            : "If you liked this, also watch… (type a title, press Enter)"
        }
        className="w-full rounded-xl border border-hair/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />

      {open && (loading || results.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-hair/20 bg-surface p-1 shadow-xl">
          {loading && (
            <div className="flex justify-center p-3">
              <AppLoader size="sm" />
            </div>
          )}
          {results.map((m) => (
            <button
              key={`${m.kind}-${m.id}`}
              type="button"
              onClick={() => add(toRec(m))}
              className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-ink/5"
            >
              <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-ink/10">
                {m.poster && (
                  <img
                    src={m.poster}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{m.title}</span>
                <span className="text-[11px] text-ink/40">
                  {m.year || "—"} · {m.kind === "tv" ? "Series" : "Film"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {picked.map((p) => (
            <span
              key={`${p.kind}-${p.id}-${p.title}`}
              className="flex items-center gap-1.5 rounded-full border border-hair/20 py-1 pl-1 pr-2 text-xs text-ink"
            >
              {p.poster && (
                <img
                  src={p.poster}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              {p.title}
              <button
                type="button"
                onClick={() =>
                  onChange(
                    picked.filter(
                      (x) => !(x.id === p.id && x.title === p.title)
                    )
                  )
                }
                className="text-ink/40 hover:text-danger"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewSection = ({
  mediaKey,
  title,
}: {
  mediaKey: string;
  title: string;
}) => {
  const { reviewsFor, addReview, deleteReview } = useMovieStore();
  const reviews = reviewsFor(mediaKey);

  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<RecommendedMedia[]>([]);

  const avg = useMemo(
    () =>
      reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0,
    [reviews]
  );

  const dist = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // 1-2,3-4,5-6,7-8,9-10
    reviews.forEach((r) => buckets[Math.min(4, Math.floor((r.rating - 1) / 2))]++);
    return buckets;
  }, [reviews]);

  const submit = () => {
    if (!rating) return toast.error("Pick a rating first");
    addReview({
      mediaKey,
      author: author.trim() || "Anonymous",
      rating,
      body: body.trim(),
      recommends: picked,
    });
    setBody("");
    setPicked([]);
    setRating(0);
    toast.success("Review posted");
  };

  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-2xl font-bold text-ink">
        Reviews & ratings
      </h2>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="glass-card p-5 text-center">
          <p className="font-display text-5xl font-extrabold text-ink">
            {avg ? avg.toFixed(1) : "–"}
          </p>
          <p className="text-xs text-ink/50">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
          <div className="mt-4 space-y-1.5">
            {["9–10", "7–8", "5–6", "3–4", "1–2"].map((lbl, idx) => {
              const b = dist[4 - idx];
              const pct = reviews.length ? (b / reviews.length) * 100 : 0;
              return (
                <div key={lbl} className="flex items-center gap-2 text-[11px]">
                  <span className="w-8 text-ink/40">{lbl}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-4 text-ink/40">{b}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="mb-3 text-sm font-semibold text-ink">
            Share your take on {title}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              className="rounded-xl border border-hair/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <div className="flex items-center rounded-xl border border-hair/20 px-3 py-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What worked, what didn't, no spoilers please…"
            rows={3}
            className="mt-3 w-full resize-y rounded-xl border border-hair/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <MoviePicker picked={picked} onChange={setPicked} />
          <div className="mt-3 flex justify-end">
            <Button
              radius="full"
              onPress={submit}
              className="bg-gradient-to-r from-accent to-accent-2 font-bold text-white"
            >
              Post review
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {reviews.length === 0 ? (
          <p className="glass-card p-6 text-center text-sm text-ink/50">
            No reviews yet — be the first to weigh in.
          </p>
        ) : (
          reviews.map((r) => (
            <ReviewCard key={r.id} review={r} onDelete={deleteReview} />
          ))
        )}
      </div>
    </section>
  );
};

export default ReviewSection;
