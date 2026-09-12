import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip, Spinner } from "@heroui/react";
import { toast } from "sonner";

import { hasTmdb } from "../../lib/tmdb";
import {
  fetchDetail,
  youtubeEmbedUrl,
  youtubeWatchUrl,
  type MediaDetail,
} from "../../lib/tmdbDetail";
import { useMovieStore, mediaKey } from "./useMovieStore";
import ReviewSection from "./ReviewSection";
import type { MediaItem } from "../../lib/tmdb";

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

const fmtRuntime = (min: number) =>
  min ? `${Math.floor(min / 60)}h ${min % 60}m` : "";

const TrailerModal = ({
  trailerKey,
  onClose,
}: {
  trailerKey: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          ✕
        </button>
        <iframe
          src={youtubeEmbedUrl(trailerKey)}
          title="Trailer"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
};

const RecCard = ({ item, basePath }: { item: MediaItem; basePath: string }) => (
  <Link
    to={`${basePath}/${item.kind}/${item.id}`}
    className="group w-[140px] shrink-0 snap-start sm:w-[160px]"
  >
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
    </div>
    <p className="mt-2 truncate text-sm font-semibold text-ink">{item.title}</p>
    <p className="text-xs text-ink/50">
      {item.year || "—"} · {item.rating > 0 ? `★ ${item.rating.toFixed(1)}` : "—"}
    </p>
  </Link>
);

interface MovieDetailProps {
  basePath?: string;
  backLabel?: string;
}

const MovieDetail = ({ basePath = "/movies", backLabel = "All movies" }: MovieDetailProps) => {
  const { kind = "movie", id = "" } = useParams<{ kind: string; id: string }>();
  const mediaType = kind === "tv" ? "tv" : "movie";
  const key = mediaKey(mediaType, id);

  const { data, isLoading, isError } = useQuery<MediaDetail>({
    queryKey: ["tmdb-detail", mediaType, id],
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchDetail(mediaType, id),
  });

  const { toggleWatchlist, isInWatchlist } = useMovieStore();
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id, kind]);

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <Spinner color="secondary" label="loading title…" />
      </div>
    );

  if (isError || !data)
    return (
      <div className="py-32 text-center">
        <p className="text-ink/60">Couldn't load this title.</p>
        <Link to={basePath} className="mt-3 inline-block text-accent-2 underline">
          ← Back to {backLabel.replace(/^All /i, "").toLowerCase()}
        </Link>
      </div>
    );

  const saved = isInWatchlist(mediaType, id);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: data.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="pb-16">
      <Link
        to={basePath}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
      >
        ← {backLabel}
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
        {data.backdrop && (
          <img
            src={data.backdrop}
            alt=""
            className="pointer-events-none absolute inset-x-0 top-0 w-full select-none"
          />
        )}
        <div className="relative flex flex-col gap-6 bg-gradient-to-b from-black/45 via-black/75 to-black/95 p-6 text-white sm:flex-row sm:p-10">
          {data.poster && (
            <img
              src={data.poster}
              alt={data.title}
              className="hidden w-60 shrink-0 self-start rounded-2xl shadow-2xl ring-1 ring-white/20 sm:block lg:w-64"
            />
          )}
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Chip className="bg-white/20 text-xs text-white">
                {mediaType === "tv" ? "Series" : "Film"}
              </Chip>
              {data.year && (
                <Chip className="bg-white/20 text-xs text-white">{data.year}</Chip>
              )}
              {data.runtime > 0 && (
                <Chip className="bg-white/20 text-xs text-white">
                  {fmtRuntime(data.runtime)}
                </Chip>
              )}
              {data.rating > 0 && (
                <Chip className="bg-amber-400/30 text-xs font-bold text-white">
                  ★ {data.rating.toFixed(1)}
                  <span className="ml-1 font-normal text-white/60">
                    ({data.voteCount.toLocaleString()})
                  </span>
                </Chip>
              )}
            </div>

            <h1 className="font-display text-4xl font-extrabold drop-shadow sm:text-5xl">
              {data.title}
            </h1>
            {data.tagline && (
              <p className="mt-2 text-lg italic text-white/70">{data.tagline}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {data.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85">
              {data.overview || "No description available yet."}
            </p>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-white/70">
              <div>
                <dt className="inline text-white/40">Released: </dt>
                <dd className="inline">{fmtDate(data.releaseDate)}</dd>
              </div>
              {data.status && (
                <div>
                  <dt className="inline text-white/40">Status: </dt>
                  <dd className="inline">{data.status}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                radius="full"
                isDisabled={!data.trailerKey}
                onPress={() => setShowTrailer(true)}
                className="bg-white font-bold text-black transition-transform hover:scale-105 disabled:opacity-40"
              >
                ▶ Watch trailer
              </Button>
              <Button
                radius="full"
                variant="bordered"
                onPress={() => {
                  const added = toggleWatchlist(data);
                  toast[added ? "success" : "message"](
                    added ? "Added to watchlist" : "Removed from watchlist"
                  );
                }}
                className="border-white/40 font-semibold text-white"
              >
                {saved ? "✓ In watchlist" : "+ Add to watchlist"}
              </Button>
              {data.trailerKey && (
                <Button
                  as="a"
                  href={youtubeWatchUrl(data.trailerKey)}
                  target="_blank"
                  rel="noreferrer"
                  radius="full"
                  variant="bordered"
                  className="border-white/40 font-semibold text-white"
                >
                  ↗ YouTube
                </Button>
              )}
              <Button
                radius="full"
                variant="bordered"
                onPress={share}
                className="border-white/40 font-semibold text-white"
              >
                ⇗ Share
              </Button>
              <Button
                radius="full"
                variant="light"
                onPress={() =>
                  document
                    .getElementById("recommendations")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="font-semibold text-white/80"
              >
                ✦ More like this
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!hasTmdb && (
        <p className="mt-4 text-center text-xs text-ink/40">
          Demo data — add a TMDB token in <code>.env</code> for live details.
        </p>
      )}

      {/* Cast */}
      {data.cast.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl font-bold text-ink">Cast</h2>
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar">
            {data.cast.map((c) => (
              <div key={c.id} className="w-[110px] shrink-0 text-center">
                <div className="glass-card overflow-hidden">
                  {c.photo ? (
                    <img
                      src={c.photo}
                      alt={c.name}
                      loading="lazy"
                      className="aspect-[2/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[2/3] w-full place-items-center bg-ink/10 text-2xl text-ink/30">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-semibold text-ink">
                  {c.name}
                </p>
                <p className="truncate text-[11px] text-ink/50">{c.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section id="recommendations" className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">
          More like this
        </h2>
        {data.recommendations.length > 0 ? (
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar">
            {data.recommendations.map((r) => (
              <RecCard key={`${r.kind}-${r.id}`} item={r} basePath={basePath} />
            ))}
          </div>
        ) : (
          <p className="glass-card p-6 text-center text-sm text-ink/50">
            No recommendations available for this title.
          </p>
        )}
      </section>

      <ReviewSection mediaKey={key} title={data.title} />

      {showTrailer && data.trailerKey && (
        <TrailerModal
          trailerKey={data.trailerKey}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
};

export default MovieDetail;
