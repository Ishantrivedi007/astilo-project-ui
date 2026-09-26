import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Antenna,
  CircleDot,
  Cloud,
  Flame,
  Galaxy as Milky,
  Image as ImageIcon,
  Moon as MoonIcon,
  Orbit,
  Radio,
  Radar,
  Rocket,
  Satellite,
  Sparkles,
  BookOpen,
  Star,
  Sun,
  Telescope,
  Zap,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import {
  fetchApod,
  fetchAsteroid,
  fetchGalaxy,
  fetchStar,
  searchExoplanets,
  searchHighEnergyObservations,
  searchObservations,
  searchSupernovae,
} from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const EXAMPLES = ["Apophis", "TRAPPIST-1", "Sirius", "Cygnus X-1", "Andromeda Galaxy", "Crab Nebula"];

const NAV_TILES = [
  { label: "Asteroids", icon: CircleDot, href: `${AppRoute.cosmosSearch}?type=asteroid` },
  { label: "Comets", icon: Sparkles, href: `${AppRoute.cosmosSearch}?type=comet` },
  { label: "Exoplanets", icon: Orbit, href: `${AppRoute.cosmosSearch}?type=exoplanet` },
  { label: "Moons", icon: MoonIcon, href: `${AppRoute.cosmosSearch}?type=moon` },
  { label: "Stars", icon: Star, href: `${AppRoute.cosmosSearch}?type=star` },
  { label: "Galaxies", icon: Milky, href: `${AppRoute.cosmosSearch}?type=galaxy` },
  { label: "Nebulae", icon: Cloud, href: `${AppRoute.cosmosSearch}?type=nebula` },
  { label: "Supernovae", icon: Flame, href: `${AppRoute.cosmosSearch}?type=supernova` },
  { label: "Spacecraft", icon: Radio, href: `${AppRoute.cosmosSearch}?type=spacecraft` },
  { label: "Telescopes", icon: Telescope, href: `${AppRoute.cosmosSearch}?type=observation` },
  { label: "Observatories", icon: Antenna, href: AppRoute.cosmosMissionBrowse },
  { label: "Hubble", icon: Telescope, href: AppRoute.cosmosHubble },
  { label: "Deep Space Probes", icon: Rocket, href: AppRoute.cosmosDeepSpace },
  { label: "X-ray sources", icon: Zap, href: `${AppRoute.cosmosSearch}?type=high-energy` },
  { label: "Image Lab", icon: ImageIcon, href: AppRoute.cosmosImageLab },
  { label: "Compare", icon: ArrowLeftRight, href: AppRoute.cosmosCompare },
  { label: "Orbit Explorer", icon: Rocket, href: AppRoute.cosmosOrbitExplorer },
  { label: "Satellite Tracker", icon: Satellite, href: AppRoute.cosmosSatelliteTracker },
  { label: "Space Weather", icon: Sun, href: AppRoute.cosmosSpaceWeather },
  { label: "Cosmos Library", icon: Sparkles, href: AppRoute.cosmosLibrary },
  { label: "Reference Library", icon: BookOpen, href: AppRoute.cosmosReferenceLibrary },
];

interface FeaturedTileProps {
  eyebrow: string;
  href: string;
  loading: boolean;
  errored: boolean;
  title?: string;
  subtitle?: string;
}

const FeaturedTile = ({ eyebrow, href, loading, errored, title, subtitle }: FeaturedTileProps) => {
  const navigate = useNavigate();
  return (
    <button type="button" className="cosmos-card text-left" onClick={() => navigate(href)}>
      <p className="cosmos-eyebrow" style={{ fontSize: "0.65rem" }}>
        {eyebrow}
      </p>
      {loading && <p className="mt-1 text-sm text-white/40">Loading…</p>}
      {!loading && errored && <p className="mt-1 cosmos-unavailable">Data unavailable</p>}
      {!loading && !errored && (
        <>
          <p className="mt-1 truncate text-base font-bold">{title ?? "Data unavailable"}</p>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/50">{subtitle}</p>}
        </>
      )}
    </button>
  );
};

const CosmosHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: apod, isLoading: apodLoading, isError: apodError } = useQuery({
    queryKey: ["cosmos", "apod"],
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchApod(),
    retry: false,
  });

  const staleTime = 1000 * 60 * 30;
  const featuredAsteroid = useQuery({
    queryKey: ["cosmos", "featured", "asteroid"],
    queryFn: () => fetchAsteroid("Apophis"),
    staleTime,
    retry: false,
  });
  const featuredExoplanet = useQuery({
    queryKey: ["cosmos", "featured", "exoplanet"],
    queryFn: () => searchExoplanets({ name: "TRAPPIST-1", limit: 1 }),
    staleTime,
    retry: false,
  });
  const featuredStar = useQuery({
    queryKey: ["cosmos", "featured", "star"],
    queryFn: () => fetchStar("Sirius"),
    staleTime,
    retry: false,
  });
  const featuredGalaxy = useQuery({
    queryKey: ["cosmos", "featured", "galaxy"],
    queryFn: () => fetchGalaxy("Andromeda Galaxy"),
    staleTime,
    retry: false,
  });
  const featuredSupernova = useQuery({
    queryKey: ["cosmos", "featured", "supernova"],
    queryFn: () => searchSupernovae("Crab Nebula", 1),
    staleTime,
    retry: false,
  });
  const featuredObservation = useQuery({
    queryKey: ["cosmos", "featured", "observation"],
    queryFn: () => searchObservations("M16", "HST", 1),
    staleTime,
    retry: false,
  });
  const featuredHighEnergy = useQuery({
    queryKey: ["cosmos", "featured", "high-energy"],
    queryFn: () => searchHighEnergyObservations("Cygnus X-1", "numaster", 1),
    staleTime,
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

      <h2 className="cosmos-section-title">Featured across the Cosmos</h2>
      <div className="cosmos-nav-grid">
        <FeaturedTile
          eyebrow="Asteroid · JPL SBDB"
          href={`${AppRoute.cosmosSearch}?q=Apophis`}
          loading={featuredAsteroid.isLoading}
          errored={featuredAsteroid.isError}
          title={featuredAsteroid.data?.data.name}
          subtitle={featuredAsteroid.data ? `⌀ ${featuredAsteroid.data.data.diameterKm ?? "?"} km` : undefined}
        />
        <FeaturedTile
          eyebrow="Exoplanet · NASA Exoplanet Archive"
          href={`${AppRoute.cosmosSearch}?q=TRAPPIST-1`}
          loading={featuredExoplanet.isLoading}
          errored={featuredExoplanet.isError}
          title={featuredExoplanet.data?.data.results[0]?.name}
          subtitle={
            featuredExoplanet.data?.data.results[0]
              ? `${featuredExoplanet.data.data.count} planets around ${featuredExoplanet.data.data.results[0].hostStar}`
              : undefined
          }
        />
        <FeaturedTile
          eyebrow="Star · ESA Gaia"
          href={`${AppRoute.cosmosSearch}?q=Sirius`}
          loading={featuredStar.isLoading}
          errored={featuredStar.isError}
          title={featuredStar.data?.data.queriedName}
          subtitle={featuredStar.data ? `G mag ${featuredStar.data.data.gMagnitude ?? "?"}` : undefined}
        />
        <FeaturedTile
          eyebrow="Galaxy · SIMBAD"
          href={`${AppRoute.cosmosSearch}?q=Andromeda Galaxy`}
          loading={featuredGalaxy.isLoading}
          errored={featuredGalaxy.isError}
          title={featuredGalaxy.data?.data.name}
          subtitle={featuredGalaxy.data ? featuredGalaxy.data.data.morphologicalType ?? undefined : undefined}
        />
        <FeaturedTile
          eyebrow="Supernova remnant · HEASARC"
          href={`${AppRoute.cosmosSearch}?q=Crab Nebula`}
          loading={featuredSupernova.isLoading}
          errored={featuredSupernova.isError}
          title={featuredSupernova.data?.data.results[0]?.name}
          subtitle={
            featuredSupernova.data?.data.results[0]
              ? `Type ${featuredSupernova.data.data.results[0].type ?? "?"}`
              : undefined
          }
        />
        <FeaturedTile
          eyebrow="Telescope observation · MAST"
          href={`${AppRoute.cosmosSearch}?q=M16`}
          loading={featuredObservation.isLoading}
          errored={featuredObservation.isError}
          title={featuredObservation.data?.data.results[0]?.target ?? "M16"}
          subtitle={
            featuredObservation.data?.data.results[0]
              ? `${featuredObservation.data.data.results[0].mission} · ${featuredObservation.data.data.results[0].instrument}`
              : undefined
          }
        />
        <FeaturedTile
          eyebrow="X-ray source · HEASARC NuSTAR"
          href={`${AppRoute.cosmosSearch}?q=Cygnus X-1`}
          loading={featuredHighEnergy.isLoading}
          errored={featuredHighEnergy.isError}
          title={featuredHighEnergy.data?.data.results[0]?.name}
          subtitle={
            featuredHighEnergy.data?.data.results[0]
              ? `ObsID ${featuredHighEnergy.data.data.results[0].obsid}`
              : undefined
          }
        />
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
