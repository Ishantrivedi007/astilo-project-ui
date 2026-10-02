import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Anchor, ArrowLeftRight, Atom, Binary, BookOpen, Bot, ChevronsDown, Dna, Flame, FlaskConical, Gauge, GitBranch, Globe, HeartPulse, HelpCircle, History, ListTree, Map, Microscope, Navigation, Network, Puzzle, Rocket, Ruler, Scale, Scan, Search, Shapes, ShieldCheck, Ship, TestTube2, Trees, Volume2, Waves, Workflow } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchAbyssStatus } from "../../lib/abyssApi";
import { useScientificMode } from "../../lib/useScientificMode";
import { setScientificMode } from "../../lib/scientificMode";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const NAV_TILES = [
  { label: "Ocean Explorer", icon: Globe, href: AppRoute.abyssOcean },
  { label: "Depth Descent", icon: ChevronsDown, href: AppRoute.abyssDepthDescent },
  { label: "Ocean Soundscape", icon: Volume2, href: AppRoute.abyssSoundscape },
  { label: "eDNA Detective", icon: Dna, href: AppRoute.abyssEdnaLab },
  { label: "Ocean Chemistry", icon: TestTube2, href: AppRoute.abyssChemistry },
  { label: "Virtual Microscope", icon: Microscope, href: AppRoute.abyssMicroscope },
  { label: "Mystery Species Lab", icon: Puzzle, href: AppRoute.abyssMysteryLab },
  { label: "Food Web", icon: Network, href: AppRoute.abyssFoodWeb },
  { label: "Reef Digital Twin", icon: HeartPulse, href: AppRoute.abyssReefTwin },
  { label: "Build-a-Creature", icon: Shapes, href: AppRoute.abyssBuildACreature },
  { label: "Evolution Simulator", icon: GitBranch, href: AppRoute.abyssEvolutionSim },
  { label: "Nereus AI", icon: Bot, href: AppRoute.abyssNereus },
  { label: "Observation Gap Finder", icon: Map, href: AppRoute.abyssCoverage },
  { label: "Dataset Comparison", icon: Scale, href: AppRoute.abyssDatasetComparison },
  { label: "Paleo Ocean", icon: History, href: AppRoute.abyssPaleoOcean },
  { label: "Ocean vs Space", icon: Rocket, href: AppRoute.abyssOceanVsSpace },
  { label: "Expeditions", icon: Ship, href: AppRoute.abyssExpeditions },
  { label: "Real Expedition Explorer", icon: Anchor, href: AppRoute.abyssRealExpeditions },
  { label: "Provenance Graph", icon: Workflow, href: AppRoute.abyssProvenanceGraph },
  { label: "Data Inspector", icon: Binary, href: AppRoute.abyssDataInspector },
  { label: "Species Search", icon: Search, href: AppRoute.abyssSearch },
  { label: "Abyss Codex", icon: BookOpen, href: AppRoute.abyssCodex },
  { label: "Data Sources & Licenses", icon: ShieldCheck, href: AppRoute.abyssDataSources },
  { label: "Taxonomy Tree", icon: ListTree, href: AppRoute.abyssTaxonomyTree },
  { label: "Evolution Explorer", icon: GitBranch, href: AppRoute.abyssEvolutionExplorer },
  { label: "Habitat Explorer", icon: Trees, href: AppRoute.abyssHabitats },
  { label: "Hydrothermal Vents", icon: Flame, href: AppRoute.abyssHydrothermalVents },
  { label: "Microbial Ocean", icon: Atom, href: AppRoute.abyssMicrobialOcean },
  { label: "Scale Explorer", icon: Ruler, href: AppRoute.abyssScaleExplorer },
  { label: "Ocean Knowledge Map", icon: Gauge, href: AppRoute.abyssKnowledgeMap },
  { label: "The Unknown", icon: HelpCircle, href: AppRoute.abyssTheUnknown },
  { label: "Compare Species", icon: ArrowLeftRight, href: AppRoute.abyssCompareSpecies },
  { label: "Virtual Marine Laboratory", icon: FlaskConical, href: AppRoute.abyssLab },
  { label: "Ocean Heat, Salinity & Currents", icon: Navigation, href: AppRoute.abyssOceanHeat },
  { label: "Marine Anatomy Explorer", icon: Scan, href: AppRoute.abyssMarineAnatomy },
];

const AbyssHome = () => {
  const navigate = useNavigate();
  const scientificMode = useScientificMode();

  const { data: status, isLoading, isError } = useQuery({
    queryKey: ["abyss", "status"],
    queryFn: () => fetchAbyssStatus(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="abyss-eyebrow">~ Astilo Abyss</p>
            <h1 className="abyss-title">Explore the ocean.</h1>
          </div>
          <label className="abyss-source-badge" style={{ cursor: "pointer", gap: "0.5rem" }}>
            <input type="checkbox" checked={scientificMode} onChange={(e) => setScientificMode(e.target.checked)} style={{ accentColor: "#5eead4" }} />
            SCIENTIFIC MODE
          </label>
        </div>
        <p className="abyss-tagline">
          A scientific explorer for the largely unseen world beneath the surface — real species
          data from WoRMS and OBIS, with every fact traceable back to its source. Scientific Mode
          reveals raw dataset IDs, timestamps and citations normally kept out of the way.
        </p>
      </Reveal>

      <div className="abyss-nav-grid" style={{ marginTop: "2.5rem" }}>
        {NAV_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Reveal key={tile.label}>
              <a
                className="abyss-nav-tile"
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

      <h2 className="abyss-section-title">Scientific confidence levels</h2>
      <Reveal>
        <div className="abyss-card">
          <p className="mb-3 text-sm text-white/60">
            Every value Abyss displays is tagged with one of these so real observations, model
            output, curated reference content, educational simulations, and AI-generated text are
            never presented as the same thing.
          </p>
          <div className="flex flex-wrap gap-2">
            {(status?.data.confidenceLevels ?? ["OBSERVED", "MODELLED", "CURATED", "SIMULATED", "AI_INFERRED", "UNKNOWN"]).map((level) => (
              <AbyssConfidenceBadge key={level} confidence={level} />
            ))}
          </div>
        </div>
      </Reveal>

      <h2 className="abyss-section-title">Foundation status</h2>
      <Reveal>
        <div className="abyss-card flex items-center gap-3">
          <Waves size={20} />
          {isLoading && <p className="abyss-unavailable">Checking backend status…</p>}
          {isError && <p className="abyss-unavailable">Status unavailable — backend may be offline.</p>}
          {status && (
            <div className="text-sm text-white/70">
              <p>
                {status.data.registeredDataSources} data source{status.data.registeredDataSources === 1 ? "" : "s"}{" "}
                registered, {status.data.enabledDataSources} enabled under the current license policy.{" "}
                <button
                  type="button"
                  className="underline decoration-dotted"
                  onClick={() => navigate(AppRoute.abyssDataSources)}
                >
                  View the registry
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
};

export default AbyssHome;
