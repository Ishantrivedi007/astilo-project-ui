import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flashlight, Radar, Thermometer, Waves as WavesIcon } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import {
  fetchDepthComparisons,
  fetchDepthEncounter,
  fetchDepthPhysics,
  fetchDepthZones,
  searchSpecies,
  type DepthEncounterData,
  type WormsRecordData,
} from "../../lib/abyssApi";
import { toast } from "sonner";
import { clearNereusContext, setNereusContext } from "../../lib/nereusContext";
import { recordDepthReached, getMaxDepthReached } from "../../lib/expeditionProgress";
import { checkAchievements } from "../../lib/achievements";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const TOOLS = [
  { id: "light", label: "Light", icon: Flashlight },
  { id: "sonar", label: "Sonar", icon: Radar },
  { id: "thermal", label: "Thermal", icon: Thermometer },
  { id: "bioscan", label: "Bio Scan", icon: WavesIcon },
] as const;

type EncounterState = "none" | "detected" | "identified";

const AbyssDepthDescent = () => {
  const navigate = useNavigate();
  const [depth, setDepth] = useState(0);
  const [committedDepth, setCommittedDepth] = useState(0);
  const [tool, setTool] = useState<(typeof TOOLS)[number]["id"]>("light");
  const [encounterState, setEncounterState] = useState<EncounterState>("none");
  const [encounter, setEncounter] = useState<DepthEncounterData | null>(null);
  const [identified, setIdentified] = useState<WormsRecordData | null>(null);
  const [identifiedAphiaId, setIdentifiedAphiaId] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const { data: zonesEnv } = useQuery({
    queryKey: ["abyss", "depth-zones"],
    queryFn: () => fetchDepthZones(),
    staleTime: Infinity,
  });
  const zones = zonesEnv?.data.zones ?? [];
  const currentZone = zones.find((z) => depth >= z.minMeters && depth < z.maxMeters) ?? zones[0];

  // Debounce depth-physics calls — the slider fires continuously, but the
  // backend pressure model doesn't need to be queried on every tick.
  useEffect(() => {
    const t = setTimeout(() => setCommittedDepth(depth), 250);
    return () => clearTimeout(t);
  }, [depth]);

  // Nereus Context Engine: keep Nereus aware of the current depth.
  useEffect(() => {
    setNereusContext({ module: "depth_descent", depth: committedDepth });
    return () => clearNereusContext(["depth"]);
  }, [committedDepth]);

  // Expedition progress: record the real depth reached and surface any
  // newly-crossed achievement thresholds.
  useEffect(() => {
    recordDepthReached(committedDepth);
    const unlocked = checkAchievements({ maxDepth: getMaxDepthReached(), speciesCount: 0, distinctTypes: 0 });
    unlocked.forEach((a) => toast.success(`Achievement unlocked: ${a.label}`, { description: a.description }));
  }, [committedDepth]);

  const { data: physics } = useQuery({
    queryKey: ["abyss", "depth-physics", committedDepth],
    queryFn: () => fetchDepthPhysics(committedDepth),
    staleTime: 1000 * 60,
  });

  const { data: comparisons } = useQuery({
    queryKey: ["abyss", "depth-comparisons"],
    queryFn: () => fetchDepthComparisons(),
    staleTime: Infinity,
  });

  const isDark = Boolean(currentZone && currentZone.lightPercent <= 1);

  // In a dark zone with nothing currently detected, something eventually
  // "moves" — a random discovery-mode prompt, per the blueprint's flashlight
  // encounter flow.
  useEffect(() => {
    if (!isDark || encounterState !== "none") return;
    const delay = 2500 + Math.random() * 3500;
    const t = setTimeout(async () => {
      try {
        const res = await fetchDepthEncounter(committedDepth);
        setEncounter(res.data);
        setEncounterState("detected");
      } catch {
        // Upstream hiccup — just stay quiet, another prompt will retry later.
      }
    }, delay);
    return () => clearTimeout(t);
  }, [isDark, encounterState, committedDepth]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--flashlight-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--flashlight-y", `${e.clientY - rect.top}px`);
  }, []);

  const scan = async () => {
    if (!encounter) return;
    setScanning(true);
    try {
      const res = await searchSpecies(encounter.scientificName, 1);
      const match = res.data.results[0];
      if (match) {
        setIdentified(match);
        setIdentifiedAphiaId(match.aphiaId);
        setEncounterState("identified");
      }
    } finally {
      setScanning(false);
    }
  };

  const resetEncounter = () => {
    setEncounter(null);
    setIdentified(null);
    setIdentifiedAphiaId(null);
    setEncounterState("none");
  };

  return (
    <div
      className="abyss-descent-stage"
      data-zone={currentZone?.id ?? "sunlight"}
      ref={stageRef}
      onMouseMove={isDark && tool === "light" ? handleMouseMove : undefined}
    >
      {currentZone && currentZone.id !== "sunlight" && <div className="abyss-marine-snow" />}
      {isDark && tool === "light" && <div className="abyss-flashlight-overlay" />}

      <div style={{ position: "relative", zIndex: 10 }}>
        <Reveal>
          <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
            <ArrowLeft size={11} strokeWidth={2.5} />
            Abyss
          </button>
          <p className="abyss-eyebrow">~ Depth Descent</p>
          <h1 className="abyss-title">{currentZone?.label ?? "Sea Level"}</h1>
          <p className="abyss-tagline">{currentZone?.description}</p>
        </Reveal>

        {currentZone && currentZone.species.length > 0 && (
          <Reveal>
            <p className="abyss-section-title" style={{ marginTop: "1.5rem" }}>
              Species found in the {currentZone.label}
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {currentZone.species.map((sp) => (
                <div key={sp.scientificName}>
                  <AbyssSpeciesImage title={sp.commonName} height={110} />
                  <p className="text-xs font-semibold mt-1">{sp.commonName}</p>
                  <p className="text-xs italic text-white/40">{sp.scientificName}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <AbyssSourceBadge source="Astilo curated association" />
              <AbyssConfidenceBadge confidence="CURATED" />
            </div>
          </Reveal>
        )}

        <Reveal>
          <dl className="abyss-descent-readout mt-6">
            <div>
              <dt>Depth</dt>
              <dd>{depth.toLocaleString()} m</dd>
            </div>
            <div>
              <dt>Pressure</dt>
              <dd>{physics?.data.pressureAtm ?? (1 + depth / 10).toFixed(1)} atm</dd>
            </div>
            <div>
              <dt>Light</dt>
              <dd>{currentZone?.lightPercent ?? 100}%</dd>
            </div>
            <div>
              <dt>Representative temp.</dt>
              <dd style={{ fontSize: "1rem" }}>{currentZone?.tempRangeC}</dd>
            </div>
          </dl>
          <div className="flex items-center gap-2 mt-2">
            <AbyssSourceBadge source="Astilo — hydrostatic model" />
            <AbyssConfidenceBadge confidence="MODELLED" />
          </div>
        </Reveal>

        <Reveal>
          <div className="abyss-descent-controls">
            <span className="abyss-unavailable">0 m</span>
            <input
              aria-label="Depth"
              type="range"
              min={0}
              max={11000}
              step={25}
              value={depth}
              onChange={(e) => {
                setDepth(Number(e.target.value));
                resetEncounter();
              }}
            />
            <span className="abyss-unavailable">11,000 m</span>
          </div>
        </Reveal>

        {isDark && (
          <Reveal>
            <div className="abyss-scan-tool-row mb-4">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="abyss-source-badge"
                    style={tool === t.id ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
                    onClick={() => setTool(t.id)}
                  >
                    <Icon size={11} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}

        {isDark && encounterState === "detected" && encounter && (
          <Reveal>
            <div className="abyss-card max-w-md">
              <p className="text-sm font-semibold mb-1">Something moves in the dark.</p>
              <dl className="abyss-field-grid">
                <div className="abyss-field"><dt>Distance</dt><dd>{encounter.distanceMeters} m</dd></div>
                <div className="abyss-field"><dt>Est. size</dt><dd>{encounter.estimatedSizeCm} cm</dd></div>
              </dl>
              <div className="flex items-center gap-2 mt-3">
                <AbyssConfidenceBadge confidence="SIMULATED" />
                <span className="abyss-unavailable">encounter details are simulated game flavor</span>
              </div>
              <button type="button" className="abyss-nav-tile mt-3" style={{ flexDirection: "row", alignItems: "center" }} onClick={scan} disabled={scanning}>
                {scanning ? "Scanning…" : "SCAN"}
              </button>
            </div>
          </Reveal>
        )}

        {encounterState === "identified" && identified && encounter && (
          <Reveal>
            <div className="abyss-card max-w-md">
              <AbyssSpeciesImage title={encounter.commonName} height={160} />
              <div className="flex items-center gap-2 my-2">
                <AbyssSourceBadge source="WoRMS" />
                <AbyssConfidenceBadge confidence="OBSERVED" />
              </div>
              <p className="text-xs uppercase tracking-wide text-white/40">Species identified</p>
              <p className="text-lg font-bold italic">{identified.scientificName}</p>
              <p className="text-sm text-white/60 mb-2">{encounter.commonName}</p>
              <dl className="abyss-field-grid">
                <div className="abyss-field"><dt>Kingdom</dt><dd>{identified.kingdom ?? "—"}</dd></div>
                <div className="abyss-field"><dt>Family</dt><dd>{identified.family ?? "—"}</dd></div>
              </dl>
              <div className="flex gap-2 mt-3">
                {identifiedAphiaId && (
                  <button type="button" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }} onClick={() => navigate(`${AppRoute.abyssSpecies}/${identifiedAphiaId}`)}>
                    View full profile
                  </button>
                )}
                <button type="button" className="abyss-source-badge" onClick={resetEncounter}>
                  Continue descent
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {comparisons && (
          <Reveal>
            <p className="abyss-section-title">Depth vs. mountain height</p>
            <div className="abyss-card">
              <div className="flex items-center gap-2 mb-3">
                <AbyssSourceBadge source="Astilo curated reference" />
                <AbyssConfidenceBadge confidence="CURATED" />
              </div>
              <div className="abyss-depth-scale">
                <div
                  className="abyss-depth-scale-marker abyss-depth-scale-marker--current"
                  style={{ top: `${(depth / comparisons.data.maxScaleMeters) * 100}%` }}
                >
                  <span>You are here · {depth.toLocaleString()} m</span>
                </div>
                {comparisons.data.depths.map((d) => (
                  <div key={d.id} className="abyss-depth-scale-marker abyss-depth-scale-marker--depth" style={{ top: `${(d.meters / comparisons.data.maxScaleMeters) * 100}%` }}>
                    <span>{d.label} · {d.meters.toLocaleString()} m</span>
                  </div>
                ))}
                {comparisons.data.mountains.map((m) => (
                  <div key={m.id} className="abyss-depth-scale-marker abyss-depth-scale-marker--mountain" style={{ top: `${(m.meters / comparisons.data.maxScaleMeters) * 100}%` }}>
                    <span>{m.label} (height) · {m.meters.toLocaleString()} m</span>
                  </div>
                ))}
              </div>
              <p className="abyss-unavailable mt-3">{comparisons.data.note}</p>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
};

export default AbyssDepthDescent;
