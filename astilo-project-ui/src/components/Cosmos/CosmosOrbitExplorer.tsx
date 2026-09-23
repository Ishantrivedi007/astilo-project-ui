import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchHorizonsEphemeris } from "../../lib/cosmosApi";
import CosmosOrbit3D from "./CosmosOrbit3D";
import "./Cosmos.scss";

const KM_PER_AU = 149597870.7;

interface Body {
  command: string;
  label: string;
  color: string;
}

const BODIES: Body[] = [
  { command: "199", label: "Mercury", color: "#a1a1aa" },
  { command: "299", label: "Venus", color: "#facc15" },
  { command: "399", label: "Earth", color: "#60a5fa" },
  { command: "301", label: "Moon", color: "#e5e7eb" },
  { command: "499", label: "Mars", color: "#f87171" },
  { command: "599", label: "Jupiter", color: "#fb923c" },
];

/** Deterministic color from a name's hash — lets any user-added body (an
 * asteroid, comet, spacecraft, anything Horizons resolves) get a distinct,
 * stable color without maintaining a fixed palette list. */
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 62%)`;
}

/** Horizons' own disambiguation message ("Multiple major-bodies/small-
 * bodies match string...") — mirrors jpl.py's is_ambiguous_match/
 * extract_match_candidates for the generic /horizons endpoint, which
 * (unlike /moons and /spacecraft) doesn't pre-check ambiguity server-side. */
function isHorizonsAmbiguous(text: string): boolean {
  return text.includes("match string") && text.includes("Multiple");
}

function extractHorizonsCandidates(text: string): string[] {
  const idx = text.indexOf("match string");
  if (idx === -1) return [];
  const lines = text.slice(idx).split("\n");
  const candidates: string[] = [];
  let inTable = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (!inTable) {
      if (stripped.toLowerCase().startsWith("id#")) inTable = true;
      continue;
    }
    const isUnderline = stripped.length > 0 && /^[- ]+$/.test(stripped);
    if (!stripped || isUnderline || stripped.toLowerCase().startsWith("number of matches")) {
      if (candidates.length) break;
      continue;
    }
    const m = line.match(/^\s*(-?\d+)\s{2,}(.+?)\s{2,}/);
    if (m) candidates.push(m[2].trim());
  }
  return candidates;
}

interface Vector {
  jd: number;
  x: number;
  y: number;
  z: number;
}

/** Parses JPL Horizons' plain-text VECTORS ephemeris ($$SOE ... $$EOE block)
 * into (x, y) positions in AU — this is real returned data, not a
 * simulation, just extracted from Horizons' fixed-width text format. Z is
 * dropped since this is a top-down (ecliptic-plane) 2D view. */
function parseVectors(raw: string): Vector[] {
  const block = raw.split("$$SOE")[1]?.split("$$EOE")[0] ?? "";
  const vectors: Vector[] = [];
  const lines = block.split("\n");
  let jd = 0;
  for (const line of lines) {
    const jdMatch = line.match(/^(\d+\.\d+)\s*=/);
    if (jdMatch) {
      jd = Number(jdMatch[1]);
      continue;
    }
    const xyz = line.match(/X\s*=\s*([-\d.E+]+)\s*Y\s*=\s*([-\d.E+]+)\s*Z\s*=\s*([-\d.E+]+)/);
    if (xyz) {
      vectors.push({
        jd,
        x: Number(xyz[1]) / KM_PER_AU,
        y: Number(xyz[2]) / KM_PER_AU,
        z: Number(xyz[3]) / KM_PER_AU,
      });
    }
  }
  return vectors;
}

const CosmosOrbitExplorer = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(["399", "499"]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  });
  const [stepSize, setStepSize] = useState("5d");
  const [submitted, setSubmitted] = useState<{ start: string; end: string; step: string; bodies: string[] } | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [customBodies, setCustomBodies] = useState<Body[]>([]);
  const [bodyInput, setBodyInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allBodies = useMemo(() => [...BODIES, ...customBodies], [customBodies]);

  const results = useQuery({
    queryKey: ["cosmos", "orbit", submitted],
    queryFn: async () => {
      if (!submitted) return {};
      const entries = await Promise.all(
        submitted.bodies.map(async (command) => {
          const res = await fetchHorizonsEphemeris(command, submitted.start, submitted.end, submitted.step);
          return [command, parseVectors(res.data.result)] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, Vector[]>;
    },
    enabled: !!submitted,
    retry: false,
  });

  const addBody = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setResolving(true);
    setResolveError(null);
    setCandidates([]);
    try {
      const res = await fetchHorizonsEphemeris(trimmed, startDate, endDate, stepSize);
      const text = res.data.result ?? "";
      if (isHorizonsAmbiguous(text)) {
        const found = extractHorizonsCandidates(text);
        if (found.length > 0) {
          setCandidates(found);
        } else {
          setResolveError(`"${trimmed}" matches more than one body — try a more specific name.`);
        }
        return;
      }
      const body: Body = { command: trimmed, label: trimmed, color: colorFromName(trimmed) };
      setCustomBodies((prev) => [...prev.filter((b) => b.command !== body.command), body]);
      setSelected((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setBodyInput("");
    } catch {
      setResolveError(`Couldn't resolve "${trimmed}" via JPL Horizons.`);
    } finally {
      setResolving(false);
    }
  };

  const data = results.data ?? {};
  const maxLen = Math.max(0, ...Object.values(data).map((v) => v.length));

  useEffect(() => {
    if (playing && maxLen > 0) {
      playRef.current = setInterval(() => setDayIndex((i) => (i + 1) % maxLen), 200);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, maxLen]);

  const bounds = useMemo(() => {
    let max = 1;
    for (const series of Object.values(data)) {
      for (const v of series) {
        max = Math.max(max, Math.abs(v.x), Math.abs(v.y));
      }
    }
    return max * 1.15;
  }, [data]);

  const toSvg = (x: number, y: number) => {
    const size = 100;
    return { cx: size + (x / bounds) * size, cy: size - (y / bounds) * size };
  };

  const submit = () => {
    setSubmitted({ start: startDate, end: endDate, step: stepSize, bodies: selected });
    setDayIndex(0);
    setPlaying(false);
  };

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Orbit Explorer</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Real ephemeris, top-down
      </h1>
      <p className="cosmos-tagline">
        Positions come straight from JPL Horizons (heliocentric, ecliptic plane) — plot the 6
        presets, or add any body Horizons resolves (asteroid, comet, spacecraft, any name/date
        range) as its own real trajectory.
      </p>

      <div className="cosmos-orbit-controls">
        <div className="cosmos-orbit-bodies">
          {allBodies.map((b) => (
            <label key={b.command} className="cosmos-orbit-body-toggle">
              <input
                type="checkbox"
                checked={selected.includes(b.command)}
                onChange={(e) =>
                  setSelected((prev) => (e.target.checked ? [...prev, b.command] : prev.filter((c) => c !== b.command)))
                }
              />
              <span style={{ color: b.color }}>{b.label}</span>
            </label>
          ))}
        </div>
        <div className="cosmos-orbit-dates">
          <input
            className="cosmos-search-input"
            value={bodyInput}
            onChange={(e) => setBodyInput(e.target.value)}
            placeholder="Add any body — Ceres, Halley, Voyager 1…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBody(bodyInput);
              }
            }}
          />
          <button type="button" className="cosmos-chip" onClick={() => addBody(bodyInput)} disabled={resolving || !bodyInput.trim()}>
            {resolving ? "Resolving…" : "Add body"}
          </button>
        </div>
        {resolveError && <p className="cosmos-unavailable">{resolveError}</p>}
        {candidates.length > 0 && (
          <div className="cosmos-search-examples">
            <span>Multiple matches — pick one:</span>
            {candidates.map((c) => (
              <button key={c} type="button" className="cosmos-chip" onClick={() => addBody(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="cosmos-orbit-dates">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <select value={stepSize} onChange={(e) => setStepSize(e.target.value)}>
            <option value="1d">1 day steps</option>
            <option value="5d">5 day steps</option>
            <option value="10d">10 day steps</option>
          </select>
          <button type="button" className="cosmos-chip" onClick={submit} disabled={selected.length === 0}>
            Load
          </button>
        </div>
        <div className="cosmos-orbit-bodies">
          <button
            type="button"
            className={`cosmos-chip${viewMode === "2d" ? " cosmos-chip--active" : ""}`}
            onClick={() => setViewMode("2d")}
          >
            2D top-down
          </button>
          <button
            type="button"
            className={`cosmos-chip${viewMode === "3d" ? " cosmos-chip--active" : ""}`}
            onClick={() => setViewMode("3d")}
          >
            3D
          </button>
        </div>
      </div>

      {results.isLoading && <p className="mt-4 text-sm text-white/60">Fetching ephemeris from JPL Horizons…</p>}
      {results.isError && <p className="mt-4 cosmos-unavailable">Couldn't load ephemeris data.</p>}

      {maxLen > 0 && (
        <>
          {viewMode === "2d" ? (
            <div className="cosmos-orbit-canvas-wrap">
              <svg viewBox="0 0 200 200" className="cosmos-orbit-canvas">
                <circle cx={100} cy={100} r={3} fill="#fbbf24" />
                {submitted?.bodies.map((command) => {
                  const series = data[command] ?? [];
                  const body = allBodies.find((b) => b.command === command);
                  if (!body || series.length === 0) return null;
                  const points = series.map((v) => toSvg(v.x, v.y));
                  const path = points.map((p) => `${p.cx},${p.cy}`).join(" ");
                  const current = points[Math.min(dayIndex, points.length - 1)];
                  return (
                    <g key={command}>
                      <polyline points={path} fill="none" stroke={body.color} strokeWidth={0.4} opacity={0.5} />
                      {current && <circle cx={current.cx} cy={current.cy} r={1.8} fill={body.color} />}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="cosmos-orbit-canvas-wrap">
              <CosmosOrbit3D data={data} bodies={allBodies} submittedBodies={submitted?.bodies ?? []} dayIndex={dayIndex} />
            </div>
          )}

          <div className="cosmos-orbit-timeline">
            <button type="button" className="cosmos-orbit-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, maxLen - 1)}
              value={dayIndex}
              onChange={(e) => setDayIndex(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span className="cosmos-unavailable" style={{ fontStyle: "normal" }}>
              Step {dayIndex + 1}/{maxLen}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default CosmosOrbitExplorer;
