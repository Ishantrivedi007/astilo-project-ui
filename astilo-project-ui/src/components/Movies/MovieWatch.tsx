import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";

import {
  fetchDetail,
  fetchSeasonEpisodes,
  type MediaDetail,
  type Episode,
} from "../../lib/tmdbDetail";
import {
  STREAM_PROVIDERS,
  STREAM_LANGUAGES,
  DEFAULT_STREAM_PROVIDER,
  getStreamUrl,
  type StreamProvider,
} from "../../lib/streams";
import { mediaKey, useMovieStore } from "./useMovieStore";
import ReviewSection from "./ReviewSection";
import { AppRoute } from "../../app/AppRoute";

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

/** Bucket the (potentially long) provider list into labelled families so the
 * server picker reads as a grouped panel instead of one giant pill wall. */
const groupProviders = (providers: StreamProvider[]) => {
  const groups: { label: string; icon: string; items: StreamProvider[] }[] = [
    { label: "VidSrc network", icon: "🎬", items: [] },
    { label: "SmashyStream network", icon: "🍿", items: [] },
    { label: "More servers", icon: "✨", items: [] },
  ];
  for (const p of providers) {
    const n = p.name.toLowerCase();
    if (n.includes("vidsrc")) groups[0].items.push(p);
    else if (n.includes("smashy")) groups[1].items.push(p);
    else groups[2].items.push(p);
  }
  return groups.filter((g) => g.items.length > 0);
};

const EpisodeCard = ({
  episode,
  active,
  onSelect,
}: {
  episode: Episode;
  active: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className={`flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors ${
      active ? "bg-accent-2/20 ring-1 ring-accent-2/60" : "hover:bg-ink/5"
    }`}
  >
    <div className="relative h-[64px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-ink/10">
      {episode.still ? (
        <img
          src={episode.still}
          alt={episode.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-xl text-ink/30">
          {episode.number}
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        E{episode.number}
      </span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-ink">
        {episode.number}. {episode.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">
        {episode.overview || "No description available yet."}
      </p>
      {episode.airDate && (
        <p className="mt-1 text-[11px] text-ink/35">{fmtDate(episode.airDate)}</p>
      )}
    </div>
  </button>
);

interface MovieWatchProps {
  basePath?: string;
  watchBasePath?: string;
  backLabel?: string;
}

const MovieWatch = ({
  basePath = AppRoute.movies,
  watchBasePath = AppRoute.moviesWatch,
  backLabel = "movies",
}: MovieWatchProps) => {
  const {
    kind = "movie",
    id = "",
    season: seasonParam,
    episode: episodeParam,
  } = useParams<{ kind: string; id: string; season?: string; episode?: string }>();
  const navigate = useNavigate();
  const mediaType = kind === "tv" ? "tv" : "movie";
  const key = mediaKey(mediaType, id);
  const { recordWatch } = useMovieStore();

  const season = Math.max(1, Number(seasonParam) || 1);
  const episode = Math.max(1, Number(episodeParam) || 1);

  const { data, isLoading, isError } = useQuery<MediaDetail>({
    queryKey: ["tmdb-detail", mediaType, id],
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchDetail(mediaType, id),
  });

  const { data: episodes = [], isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["tmdb-season", id, season],
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchSeasonEpisodes(id, season),
    enabled: mediaType === "tv",
  });

  const [provider, setProvider] = useState(DEFAULT_STREAM_PROVIDER);
  const [audio, setAudio] = useState("en");
  const [sub, setSub] = useState("en");
  const [hindiDub, setHindiDub] = useState(false);

  const activeProvider = STREAM_PROVIDERS.find((p) => p.id === provider);
  const providerGroups = useMemo(() => groupProviders(STREAM_PROVIDERS), []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id, kind, season, episode]);

  useEffect(() => {
    if (!data) return;
    recordWatch(
      {
        id: Number(id),
        title: data.title,
        poster: data.poster,
        backdrop: data.backdrop,
        kind: mediaType,
      },
      mediaType === "tv" ? season : undefined,
      mediaType === "tv" ? episode : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mediaType, id, season, episode]);

  const src = useMemo(
    () => getStreamUrl(provider, mediaType, id, season, episode, { audio, sub, hindiDub }),
    [provider, mediaType, id, season, episode, audio, sub, hindiDub]
  );

  const goTo = (s: number, e: number) =>
    navigate(`${watchBasePath}/${mediaType}/${id}/${s}/${e}`);

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading player…" />
      </div>
    );

  if (isError || !data)
    return (
      <div className="py-32 text-center">
        <p className="text-ink/60">Couldn't load this title.</p>
        <Link to={basePath} className="mt-3 inline-block text-accent-2 underline">
          ← Back to {backLabel}
        </Link>
      </div>
    );

  const currentIndex = episodes.findIndex((e) => e.number === episode);
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEp =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;
  const currentEpisode = episodes[currentIndex];

  return (
    <div className="pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`${basePath}/${mediaType}/${id}`}
          className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
        >
          ← Back to details
        </Link>
        <h1 className="min-w-0 truncate font-display text-lg font-bold text-ink sm:text-xl">
          {data.title}
          {mediaType === "tv" && (
            <span className="text-ink/40"> · S{season} E{episode}</span>
          )}
        </h1>
      </div>

      <div
        className={`grid grid-cols-1 gap-8 ${
          mediaType === "tv" ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""
        }`}
      >
        {/* Player + servers */}
        <div className="min-w-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
            <iframe
              key={src}
              src={src}
              title={data.title}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          </div>

          <div className="glass-card mt-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">
                ✦ Servers
              </span>
              <span className="text-xs text-ink/40">{STREAM_PROVIDERS.length} available</span>
            </div>

            <div className="flex flex-col gap-3">
              {providerGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                    <span aria-hidden>{group.icon}</span>
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          provider === p.id
                            ? "bg-gradient-to-r from-accent to-accent-2 text-[#17131f] shadow-glow"
                            : "bg-ink/10 text-ink hover:bg-ink/20"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {(activeProvider?.supportsHindiDub ||
              activeProvider?.supportsAudioLang ||
              activeProvider?.supportsSubLang) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hair/15 pt-3">
                {activeProvider?.supportsHindiDub && (
                  <button
                    onClick={() => setHindiDub((v) => !v)}
                    title="Nudge this provider toward its Hindi/Asian multi-audio mirror, if the title has one"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      hindiDub
                        ? "bg-amber-400 text-black"
                        : "bg-ink/10 text-ink hover:bg-ink/20"
                    }`}
                  >
                    🇮🇳 Hindi audio
                  </button>
                )}
                {activeProvider?.supportsAudioLang && (
                  <select
                    value={audio}
                    onChange={(e) => setAudio(e.target.value)}
                    className="rounded-full bg-ink/10 px-3 py-1 text-xs text-ink outline-none"
                    aria-label="Audio language"
                    title="Audio dub"
                  >
                    {STREAM_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-surface text-ink">
                        🔊 {l.label}
                      </option>
                    ))}
                  </select>
                )}
                {activeProvider?.supportsSubLang && (
                  <select
                    value={sub}
                    onChange={(e) => setSub(e.target.value)}
                    className="rounded-full bg-ink/10 px-3 py-1 text-xs text-ink outline-none"
                    aria-label="Subtitle language"
                    title="Subtitles"
                  >
                    {STREAM_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-surface text-ink">
                        💬 {l.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {mediaType === "tv" && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                disabled={!prevEp}
                onClick={() => prevEp && goTo(season, prevEp.number)}
                className="rounded-full border border-hair/30 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-30"
              >
                ← Previous
              </button>
              <Chip variant="flat" className="bg-ink/10 text-ink/70">
                {currentIndex >= 0 ? currentIndex + 1 : episode} / {episodes.length || "—"}
              </Chip>
              <button
                disabled={!nextEp}
                onClick={() => nextEp && goTo(season, nextEp.number)}
                className="rounded-full border border-hair/30 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}

          {mediaType === "tv" && currentEpisode && (
            <div className="mt-4 glass-card p-4">
              <p className="text-sm font-semibold text-ink">
                {currentEpisode.number}. {currentEpisode.title}
              </p>
              <p className="mt-1 text-xs text-ink/50">
                {[
                  currentEpisode.airDate && fmtDate(currentEpisode.airDate),
                  currentEpisode.runtime > 0 && `${currentEpisode.runtime}m`,
                  currentEpisode.rating > 0 && `★ ${currentEpisode.rating.toFixed(1)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {currentEpisode.overview && (
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {currentEpisode.overview}
                </p>
              )}
            </div>
          )}

          {/* Recommendations */}
          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-bold text-ink">More like this</h2>
            {data.recommendations.length > 0 ? (
              <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar">
                {data.recommendations.map((r) => (
                  <Link
                    key={`${r.kind}-${r.id}`}
                    to={`${basePath}/${r.kind}/${r.id}`}
                    className="group w-[130px] shrink-0 snap-start sm:w-[150px]"
                  >
                    <div className="glass-card overflow-hidden transition-transform duration-300 group-hover:-translate-y-1.5">
                      {r.poster ? (
                        <img
                          src={r.poster}
                          alt={r.title}
                          loading="lazy"
                          className="aspect-[2/3] w-full object-cover"
                        />
                      ) : (
                        <div className="grid aspect-[2/3] w-full place-items-center bg-ink/10 p-2 text-center text-xs text-ink/40">
                          {r.title}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-ink">{r.title}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="glass-card p-6 text-center text-sm text-ink/50">
                No recommendations available for this title.
              </p>
            )}
          </section>

          <ReviewSection mediaKey={key} title={data.title} />
        </div>

        {/* Seasons / episode list */}
        {mediaType === "tv" && (
          <aside className="glass-card h-fit max-h-[85vh] overflow-y-auto p-4 lg:sticky lg:top-24">
            {data.seasons.length > 1 && (
              <select
                value={season}
                onChange={(e) => goTo(Number(e.target.value), 1)}
                className="mb-3 w-full rounded-xl border border-hair/20 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              >
                {data.seasons.map((s) => (
                  <option
                    key={s.seasonNumber}
                    value={s.seasonNumber}
                    className="bg-surface text-ink"
                  >
                    {s.name || `Season ${s.seasonNumber}`}
                  </option>
                ))}
              </select>
            )}
            <h2 className="mb-3 font-display text-lg font-bold text-ink">
              Episodes <span className="text-ink/40">({episodes.length})</span>
            </h2>
            {episodesLoading ? (
              <div className="flex justify-center py-8">
                <AppLoader size="sm" />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {episodes.map((e) => (
                  <EpisodeCard
                    key={e.id}
                    episode={e}
                    active={e.number === episode}
                    onSelect={() => goTo(season, e.number)}
                  />
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default MovieWatch;
