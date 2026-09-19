import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleDot, Orbit, Radar, Rocket, Sparkles, Star, Sun, Telescope } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchApod } from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const EXAMPLES = ["Apophis", "TRAPPIST-1", "Sirius", "Pillars of Creation"];

const NAV_TILES = [
  { label: "Asteroids", icon: CircleDot, href: `${AppRoute.cosmosSearch}?type=asteroid` },
  { label: "Exoplanets", icon: Orbit, href: `${AppRoute.cosmosSearch}?type=exoplanet` },
  { label: "Stars", icon: Star, href: `${AppRoute.cosmosSearch}?type=star` },
  { label: "Telescopes", icon: Telescope, href: `${AppRoute.cosmosSearch}?type=observation` },
  { label: "Space Weather", icon: Sun, href: AppRoute.cosmosSpaceWeather },
  { label: "Cosmos Library", icon: Sparkles, href: AppRoute.cosmosLibrary },
];

const CosmosHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: apod, isLoading: apodLoading, isError: apodError } = useQuery({
    queryKey: ["cosmos", "apod"],
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchApod(),
    retry: false,
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`${AppRoute.cosmosSearch}?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="cosmos-page">
      <Reveal>
        <p className="cosmos-eyebrow">✦ Astilo Cosmos</p>
        <h1 className="cosmos-title">Explore the universe.</h1>
        <p className="cosmos-tagline">
          A data-driven explorer for planets, stars, exoplanets, asteroids and telescope
          observations — sourced live from NASA, JPL, the NASA Exoplanet Archive, MAST, and ESA
          Gaia.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <form className="cosmos-search-form" onSubmit={submitSearch}>
          <input
            className="cosmos-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search planets, stars, asteroids, exoplanets, missions…"
            aria-label="Search the universe"
          />
        </form>
        <div className="cosmos-search-examples">
          <span>Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="cosmos-chip"
              onClick={() => navigate(`${AppRoute.cosmosSearch}?q=${encodeURIComponent(ex)}`)}
            >
              {ex}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="cosmos-nav-grid" style={{ marginTop: "2.5rem" }}>
        {NAV_TILES.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <Reveal key={tile.label} index={i}>
              <a
                className="cosmos-nav-tile"
                href={tile.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(tile.href);
                }}
              >
                <Icon size={20} strokeWidth={2} />
                <span>{tile.label}</span>
              </a>
            </Reveal>
          );
        })}
      </div>

      <h2 className="cosmos-section-title">Astronomy Picture of the Day</h2>
      <Reveal>
        <div className="cosmos-card">
          {apodLoading && <p className="cosmos-unavailable">Loading today's picture…</p>}
          {apodError && (
            <p className="cosmos-unavailable">
              APOD unavailable right now — NASA's demo API key is heavily rate-limited; see the
              README for adding your own NASA_API_KEY.
            </p>
          )}
          {apod && (
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              {apod.data.mediaType === "image" ? (
                <img
                  src={apod.data.imageUrl}
                  alt={apod.data.title}
                  loading="lazy"
                  className="h-full w-full rounded-xl object-cover"
                  style={{ maxHeight: 220 }}
                />
              ) : (
                <div className="flex items-center justify-center rounded-xl bg-white/5 p-6">
                  <Rocket size={32} />
                </div>
              )}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <CosmosSourceBadge source="NASA APOD" />
                  <span className="cosmos-unavailable">{apod.data.date}</span>
                </div>
                <h3 className="mb-1 text-lg font-bold">{apod.data.title}</h3>
                <p className="text-sm text-white/70">{apod.data.explanation}</p>
                {apod.data.copyright && (
                  <p className="mt-2 text-xs text-white/40">© {apod.data.copyright}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      <h2 className="cosmos-section-title">Near-Earth close approaches</h2>
      <Reveal>
        <div className="cosmos-card flex items-center gap-3">
          <Radar size={20} />
          <p className="text-sm text-white/70">
            Live JPL CNEOS close-approach data — search{" "}
            <button
              type="button"
              className="cosmos-chip"
              onClick={() => navigate(`${AppRoute.cosmosSearch}?type=asteroid`)}
            >
              browse asteroids
            </button>{" "}
            to see upcoming approaches for a specific object.
          </p>
        </div>
      </Reveal>
    </div>
  );
};

export default CosmosHome;
