import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchHorizonsEphemeris } from "../../lib/cosmosApi";
import CosmosOrbit3D from "./CosmosOrbit3D";
import "./Cosmos.scss";

const KM_PER_AU = 149597870.7;
const SECONDS_PER_DAY = 86400;
const RECENT_TRAIL_POINTS = 16;

interface Body {
  command: string;
  label: string;
  color: string;
  /** Relative on-screen radius — purely a display scale, not to true scale. */
  size: number;
}

const BODIES: Body[] = [
  { command: "199", label: "Mercury", color: "#a1a1aa", size: 1.1 },
  { command: "299", label: "Venus", color: "#facc15", size: 1.6 },
  { command: "399", label: "Earth", color: "#60a5fa", size: 1.65 },
  { command: "301", label: "Moon", color: "#e5e7eb", size: 0.7 },
  { command: "499", label: "Mars", color: "#f87171", size: 1.3 },
  { command: "599", label: "Jupiter", color: "#fb923c", size: 2.6 },
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

/** Position interpolated between the two nearest real ephemeris samples,
 * so playback glides smoothly instead of jumping once per Horizons step. */
function vectorAt(series: Vector[], progress: number): Vector {
  if (series.length === 0) return { jd: 0, x: 0, y: 0, z: 0 };
  const i0 = Math.max(0, Math.min(series.length - 1, Math.floor(progress)));
  const i1 = Math.min(series.length - 1, i0 + 1);
  const t = progress - i0;
  const a = series[i0];
  const b = series[i1];
  return { jd: a.jd, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

function stepSizeDays(step: string): number {
  const m = step.match(/(\d+)d/);
  return m ? Number(m[1]) : 1;
}

const STAR_FIELD = Array.from({ length: 90 }, () => ({
  cx: Math.random() * 200,
  cy: Math.random() * 200,
  r: 0.15 + Math.random() * 0.45,
  o: 0.15 + Math.random() * 0.5,
}));

const GRID_RINGS = [0.25, 0.5, 0.75, 1];
const SPEEDS = [0.5, 1, 2, 4];

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
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [customBodies, setCustomBodies] = useState<Body[]>([]);
  const [bodyInput, setBodyInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [activeBody, setActiveBody] = useState<string | null>(null);
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

  const data = results.data ?? {};
  const maxLen = Math.max(0, ...Object.values(data).map((v) => v.length));

  /** Loads (or reloads) the 2D/3D scene for a given body list under the
   * current date range — shared by the Load button, checkbox toggles, and
   * "Add body" so a newly added/checked body actually appears without a
   * separate manual step. */
  const load = (bodies: string[]) => {
    setSubmitted({ start: startDate, end: endDate, step: stepSize, bodies });
    setProgress(0);
    setPlaying(false);
    setActiveBody(null);
  };

  const toggleBody = (command: string, checked: boolean) => {
    const next = checked ? [...selected, command] : selected.filter((c) => c !== command);
    setSelected(next);
    if (next.length > 0) load(next);
  };

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
      const body: Body = { command: trimmed, label: trimmed, color: colorFromName(trimmed), size: 1 };
      setCustomBodies((prev) => [...prev.filter((b) => b.command !== body.command), body]);
      const next = selected.includes(trimmed) ? selected : [...selected, trimmed];
      setSelected(next);
      setBodyInput("");
      load(next);
    } catch {
      setResolveError(`Couldn't resolve "${trimmed}" via JPL Horizons.`);
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (playing && maxLen > 0) {
      const tickMs = 50;
      const incrementPerTick = (tickMs / 200) * speed; // matches original 1 step / 200ms at 1x
      playRef.current = setInterval(() => {
        setProgress((p) => {
          const next = p + incrementPerTick;
          return next >= maxLen - 1 ? 0 : next;
        });
      }, tickMs);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, maxLen, speed]);

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

  const dayIndex = Math.round(progress);

  const activeDetail = useMemo(() => {
    if (!activeBody) return null;
    const body = allBodies.find((b) => b.command === activeBody);
    const series = data[activeBody] ?? [];
    if (!body || series.length === 0) return null;
    const here = vectorAt(series, progress);
    const distanceAu = Math.sqrt(here.x ** 2 + here.y ** 2 + here.z ** 2);

    const i0 = Math.max(0, dayIndex - 1);
    const i1 = Math.min(series.length - 1, dayIndex + 1);
    const a = series[i0];
    const b = series[i1];
    const daysBetween = Math.max(1, i1 - i0) * stepSizeDays(submitted?.step ?? stepSize);
    const deltaKm = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2) * KM_PER_AU;
    const speedKms = deltaKm / (daysBetween * SECONDS_PER_DAY);

    return { body, distanceAu, speedKms, position: here };
  }, [activeBody, allBodies, data, progress, dayIndex, submitted, stepSize]);

  const submit = () => load(selected);

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
        range) as its own real trajectory. Click a body in either view for its live distance and
        speed.
      </p>

      <div className="cosmos-orbit-controls">
        <div className="cosmos-orbit-bodies">
          {allBodies.map((b) => (
            <label key={b.command} className="cosmos-orbit-body-toggle">
              <input
                type="checkbox"
                checked={selected.includes(b.command)}
                onChange={(e) => toggleBody(b.command, e.target.checked)}
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
          <div className="cosmos-orbit-canvas-wrap">
            {activeDetail && (
              <div className="cosmos-orbit-info-card">
                <button type="button" onClick={() => setActiveBody(null)} aria-label="Close">
                  <X size={13} />
                </button>
                <h4 style={{ color: activeDetail.body.color }}>{activeDetail.body.label}</h4>
                <dl style={{ margin: 0 }}>
                  <dt>Distance from Sun</dt>
                  <dd>{activeDetail.distanceAu.toFixed(3)} AU</dd>
                  <dt>Speed</dt>
                  <dd>{activeDetail.speedKms.toFixed(2)} km/s</dd>
                  <dt>Position (AU)</dt>
                  <dd>
                    x {activeDetail.position.x.toFixed(2)}, y {activeDetail.position.y.toFixed(2)}, z{" "}
                    {activeDetail.position.z.toFixed(2)}
                  </dd>
                </dl>
              </div>
            )}

            {viewMode === "2d" ? (
              <svg viewBox="0 0 200 200" className="cosmos-orbit-canvas">
                <defs>
                  <radialGradient id="cosmos-sun-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffe6a0" stopOpacity={0.9} />
                    <stop offset="40%" stopColor="#fbbf24" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </radialGradient>
                </defs>

                {STAR_FIELD.map((s, i) => (
                  <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#e8ecff" opacity={s.o} />
                ))}

                {GRID_RINGS.map((f) => (
                  <g key={f}>
                    <circle cx={100} cy={100} r={f * 95} fill="none" stroke="rgba(140,160,255,0.16)" strokeDasharray="1.2 2" />
                    <text x={100 + f * 95} y={98} fontSize={3.2} fill="rgba(232,236,255,0.35)">
                      {(f * bounds).toFixed(1)} AU
                    </text>
                  </g>
                ))}

                <circle cx={100} cy={100} r={9} fill="url(#cosmos-sun-glow)" />
                <circle cx={100} cy={100} r={2.6} fill="#fde68a" />

                {submitted?.bodies.map((command) => {
                  const series = data[command] ?? [];
                  const body = allBodies.find((b) => b.command === command);
                  if (!body || series.length === 0) return null;

                  const points = series.map((v) => toSvg(v.x, v.y));
                  const path = points.map((p) => `${p.cx},${p.cy}`).join(" ");
                  const recentStart = Math.max(0, dayIndex - RECENT_TRAIL_POINTS);
                  const recentPath = points
                    .slice(recentStart, dayIndex + 1)
                    .map((p) => `${p.cx},${p.cy}`)
                    .join(" ");
                  const here = vectorAt(series, progress);
                  const current = toSvg(here.x, here.y);
                  const isActive = command === activeBody;

                  return (
                    <g key={command}>
                      <polyline points={path} fill="none" stroke={body.color} strokeWidth={0.3} opacity={0.25} />
                      <polyline points={recentPath} fill="none" stroke={body.color} strokeWidth={0.55} opacity={0.75} />
                      {isActive && <circle cx={current.cx} cy={current.cy} r={3.4} fill="none" stroke={body.color} strokeWidth={0.4} opacity={0.8} />}
                      <circle
                        cx={current.cx}
                        cy={current.cy}
                        r={1.3 * body.size + (isActive ? 0.6 : 0)}
                        fill={body.color}
                        stroke={isActive ? "#fff" : "none"}
                        strokeWidth={0.3}
                        style={{ cursor: "pointer" }}
                        onClick={() => setActiveBody(command)}
                      />
                      <text x={current.cx + 2.4} y={current.cy - 2} fontSize={3} fill={body.color} opacity={0.85}>
                        {body.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <CosmosOrbit3D
                data={data}
                bodies={allBodies}
                submittedBodies={submitted?.bodies ?? []}
                progress={progress}
                activeBody={activeBody}
                onBodyClick={setActiveBody}
              />
            )}
          </div>

          <div className="cosmos-orbit-timeline">
            <button type="button" className="cosmos-orbit-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, maxLen - 1)}
              value={dayIndex}
              onChange={(e) => {
                setPlaying(false);
                setProgress(Number(e.target.value));
              }}
              style={{ flex: 1 }}
            />
            <span className="cosmos-unavailable" style={{ fontStyle: "normal" }}>
              Step {dayIndex + 1}/{maxLen}
            </span>
            <label className="cosmos-orbit-speed">
              Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default CosmosOrbitExplorer;
