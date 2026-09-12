import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";

import {
  fetchAnimeDetail,
  buildServerGroups,
  type AnimeDetail as AnimeDetailData,
  type AnimeEpisode,
} from "../../lib/anime";
import { AppRoute } from "../../app/AppRoute";
import "./Anime.scss";

const AnimeWatch = () => {
  const { id = "", ep } = useParams<{ id: string; ep?: string }>();
  const navigate = useNavigate();
  const currentEp = Math.max(1, Number(ep) || 1);

  const { data, isLoading, isError } = useQuery<AnimeDetailData>({
    queryKey: ["anime-detail", id],
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchAnimeDetail(id),
  });

  const episodes: AnimeEpisode[] = useMemo(() => {
    if (!data) return [];
    if (data.episodes.length) return data.episodes;
    const count = data.episodesCount || 1;
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      title: `Episode ${i + 1}`,
      thumbnail: "",
      aired: "",
      filler: false,
      recap: false,
    }));
  }, [data]);

  const serverGroups = useMemo(
    () => (data ? buildServerGroups(data.id, currentEp) : []),
    [data, currentEp]
  );

  const [activeGroup, setActiveGroup] = useState(serverGroups[0]?.id ?? "");
  const [activeServer, setActiveServer] = useState(serverGroups[0]?.servers[0]?.id ?? "");

  useEffect(() => {
    if (!serverGroups.length) return;
    setActiveGroup(serverGroups[0].id);
    setActiveServer(serverGroups[0].servers[0]?.id ?? "");
  }, [serverGroups]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id, ep]);

  const currentGroup = serverGroups.find((g) => g.id === activeGroup) ?? serverGroups[0];
  const currentServer = currentGroup?.servers.find((s) => s.id === activeServer) ?? currentGroup?.servers[0];

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading watch page…" />
      </div>
    );

  if (isError || !data)
    return (
      <div className="py-32 text-center">
        <p className="text-ink/60">Couldn't load this title.</p>
        <Link to={AppRoute.anime} className="mt-3 inline-block text-accent-2 underline">
          ← Back to anime
        </Link>
      </div>
    );

  const currentIndex = episodes.findIndex((e) => e.number === currentEp);
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;

  const goToEp = (num: number) => navigate(`${AppRoute.animeWatch}/${data.id}/${num}`);

  return (
    <div className="pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`${AppRoute.anime}/${data.kind}/${data.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
        >
          ← Back to details
        </Link>
        <h1 className="font-display text-lg font-bold text-ink sm:text-xl">
          {data.title} <span className="text-ink/40">· Episode {currentEp}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Player + servers */}
        <div className="min-w-0">
          <div className="watch-console mx-auto max-w-xl">
            <div className="watch-player relative aspect-video overflow-hidden rounded-2xl">
              {data.backdrop && (
                <img
                  src={data.backdrop}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-[2px]"
                />
              )}
              <div className="watch-vignette absolute inset-0" />

              <span className="watch-ep-chip">
                EP {currentEp} <span className="opacity-50">·</span> {data.title}
              </span>

              <div className="relative flex h-full items-center justify-center">
                <button type="button" className="play-glow" aria-label="Play (demo)">
                  <span className="play-glow-ring" />
                  <span className="play-glow-icon">▶</span>
                </button>
              </div>

              <div className="watch-info-bar">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {currentGroup?.label} <span className="text-white/40">·</span>{" "}
                    {currentServer?.name ?? "—"}
                  </p>
                  <p className="truncate text-[11px] text-white/45">
                    Demo player — no licensed streaming source wired up yet
                  </p>
                </div>
                {currentServer && (
                  <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                    {currentServer.quality}
                  </span>
                )}
              </div>
            </div>

            {/* Sub / Dub tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {serverGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroup(group.id);
                    setActiveServer(group.servers[0]?.id ?? "");
                  }}
                  className={`server-tab ${activeGroup === group.id ? "is-active" : ""}`}
                >
                  {group.id === "sub" ? "🎌" : "🗣️"} {group.label}
                </button>
              ))}
            </div>

            {/* Server buttons for the active group */}
            <div className="mt-3 flex flex-wrap gap-2">
              {currentGroup?.servers.map((server) => (
                <button
                  key={server.id}
                  onClick={() => setActiveServer(server.id)}
                  className={`server-btn ${activeServer === server.id ? "is-active" : ""}`}
                >
                  {activeServer === server.id && <span className="mr-1">✓</span>}
                  {server.name}
                  <span className="ml-1.5 text-[10px] opacity-60">{server.quality}</span>
                </button>
              ))}
            </div>

            {/* Prev / next */}
            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                radius="full"
                variant="bordered"
                isDisabled={!prevEp}
                onPress={() => prevEp && goToEp(prevEp.number)}
                className="border-hair/40 font-semibold text-ink disabled:opacity-30"
              >
                ← Previous
              </Button>
              <Chip variant="flat" className="bg-ink/10 text-ink/70">
                {currentIndex + 1} / {episodes.length || 1}
              </Chip>
              <Button
                radius="full"
                variant="bordered"
                isDisabled={!nextEp}
                onPress={() => nextEp && goToEp(nextEp.number)}
                className="border-hair/40 font-semibold text-ink disabled:opacity-30"
              >
                Next →
              </Button>
            </div>
          </div>

          {/* Recommendations */}
          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-bold text-ink">More like this</h2>
            {data.recommendations.length > 0 ? (
              <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar">
                {data.recommendations.map((r) => (
                  <Link
                    key={`${r.kind}-${r.id}`}
                    to={`${AppRoute.anime}/${r.kind}/${r.id}`}
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
        </div>

        {/* Episode list */}
        <aside className="glass-card sticky top-24 h-fit max-h-[80vh] overflow-y-auto p-4">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">
            Episodes <span className="text-ink/40">({episodes.length})</span>
          </h2>
          <div className="flex flex-col gap-1.5">
            {episodes.map((e) => (
              <button
                key={e.id}
                onClick={() => goToEp(e.number)}
                className={`episode-pill ${e.number === currentEp ? "is-active" : ""}`}
              >
                <span className="episode-pill-num">{e.number}</span>
                <span className="min-w-0 flex-1 truncate text-left">{e.title}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnimeWatch;
