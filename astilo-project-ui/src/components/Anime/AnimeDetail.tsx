import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { toast } from "sonner";

import { fetchAnimeDetail, type AnimeDetail as AnimeDetailData } from "../../lib/anime";
import { youtubeEmbedUrl, youtubeWatchUrl } from "../../lib/tmdbDetail";
import { useMovieStore, mediaKey } from "../Movies/useMovieStore";
import ReviewSection from "../Movies/ReviewSection";
import type { MediaItem } from "../../lib/tmdb";
import { AppRoute } from "../../app/AppRoute";

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
          title="Trailer / PV"
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

interface AnimeDetailProps {
  basePath?: string;
  backLabel?: string;
}

const AnimeDetail = ({ basePath = "/anime", backLabel = "All anime" }: AnimeDetailProps) => {
  const { id = "" } = useParams<{ kind: string; id: string }>();
  const [showTrailer, setShowTrailer] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  const { data, isLoading, isError } = useQuery<AnimeDetailData>({
    queryKey: ["anime-detail", id],
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchAnimeDetail(id),
  });

  const { toggleWatchlist, isInWatchlist } = useMovieStore();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading anime…" />
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

  const saved = isInWatchlist(data.kind, data.id);
  const key = mediaKey(data.kind, data.id);
  const visibleEpisodes = showAllEpisodes ? data.episodes : data.episodes.slice(0, 12);

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
            className="pointer-events-none absolute inset-x-0 top-0 w-full select-none opacity-40 blur-sm"
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
                {data.kind === "movie" ? "Anime Movie" : "Anime Series"}
              </Chip>
              {data.year && (
                <Chip className="bg-white/20 text-xs text-white">{data.year}</Chip>
              )}
              {data.episodesCount > 0 && (
                <Chip className="bg-white/20 text-xs text-white">
                  {data.episodesCount} episodes
                </Chip>
              )}
              {data.duration && (
                <Chip className="bg-white/20 text-xs text-white">{data.duration}</Chip>
              )}
              {data.rating > 0 && (
                <Chip className="bg-amber-400/30 text-xs font-bold text-white">
                  ★ {data.rating.toFixed(1)}
                </Chip>
              )}
            </div>

            <h1 className="font-display text-4xl font-extrabold drop-shadow sm:text-5xl">
              {data.title}
            </h1>

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
              {data.overview || "No synopsis available yet."}
            </p>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-white/70">
              {data.status && (
                <div>
                  <dt className="inline text-white/40">Status: </dt>
                  <dd className="inline">{data.status}</dd>
                </div>
              )}
              {data.studios.length > 0 && (
                <div>
                  <dt className="inline text-white/40">Studio: </dt>
                  <dd className="inline">{data.studios.join(", ")}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                as={Link}
                to={`${AppRoute.animeWatch}/${data.id}/1`}
                radius="full"
                className="bg-gradient-to-r from-accent to-accent-2 font-bold text-white transition-transform hover:scale-105"
              >
                ▶ Watch now
              </Button>
              <Button
                radius="full"
                variant="bordered"
                isDisabled={!data.trailerKey}
                onPress={() => setShowTrailer(true)}
                className="border-white/40 font-semibold text-white disabled:opacity-40"
              >
                Trailer / PV
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
              <Button radius="full" variant="bordered" onPress={share} className="border-white/40 font-semibold text-white">
                ⇗ Share
              </Button>
            </div>

            <p className="mt-4 max-w-xl text-[11px] text-white/40">
              Metadata from MyAnimeList (Jikan) — no full-episode streaming is provided.
            </p>
          </div>
        </div>
      </div>

      {/* Episodes */}
      {data.episodes.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl font-bold text-ink">Episodes</h2>
          <div className="glass-card divide-y divide-ink/10">
            {visibleEpisodes.map((ep) => (
              <Link
                key={ep.id}
                to={`${AppRoute.animeWatch}/${data.id}/${ep.number}`}
                className="group flex items-center gap-3 p-4 transition-colors hover:bg-ink/5"
              >
                {ep.thumbnail ? (
                  <img
                    src={ep.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-12 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10 text-sm font-bold text-ink/70">
                    {ep.number}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{ep.title}</p>
                  <p className="text-xs text-ink/50">Episode {ep.number}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-accent-2 opacity-0 transition-opacity group-hover:opacity-100">
                  ▶ Play
                </span>
              </Link>
            ))}
          </div>
          {data.episodes.length > 12 && (
            <Button
              radius="full"
              variant="light"
              className="mt-3 font-semibold text-accent-2"
              onPress={() => setShowAllEpisodes((v) => !v)}
            >
              {showAllEpisodes ? "Show fewer episodes" : `Show all ${data.episodes.length} episodes`}
            </Button>
          )}
        </section>
      )}

      {/* Recommendations */}
      <section id="recommendations" className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">More like this</h2>
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
        <TrailerModal trailerKey={data.trailerKey} onClose={() => setShowTrailer(false)} />
      )}
    </div>
  );
};

export default AnimeDetail;
