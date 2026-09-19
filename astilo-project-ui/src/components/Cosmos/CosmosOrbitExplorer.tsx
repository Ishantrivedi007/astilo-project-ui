import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchHorizonsEphemeris } from "../../lib/cosmosApi";
import "./Cosmos.scss";

const KM_PER_AU = 149597870.7;

const BODIES = [
  { command: "199", label: "Mercury", color: "#a1a1aa" },
  { command: "299", label: "Venus", color: "#facc15" },
  { command: "399", label: "Earth", color: "#60a5fa" },
  { command: "301", label: "Moon", color: "#e5e7eb" },
  { command: "499", label: "Mars", color: "#f87171" },
  { command: "599", label: "Jupiter", color: "#fb923c" },
];

interface Vector {
  jd: number;
  x: number;
  y: number;
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
      vectors.push({ jd, x: Number(xyz[1]) / KM_PER_AU, y: Number(xyz[2]) / KM_PER_AU });
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
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        Positions come straight from JPL Horizons (heliocentric, ecliptic plane) — not a
        simulation. A 2D top-down view for now; full 3D is a documented future addition.
      </p>

      <div className="cosmos-orbit-controls">
        <div className="cosmos-orbit-bodies">
          {BODIES.map((b) => (
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
      </div>

      {results.isLoading && <p className="mt-4 text-sm text-white/60">Fetching ephemeris from JPL Horizons…</p>}
      {results.isError && <p className="mt-4 cosmos-unavailable">Couldn't load ephemeris data.</p>}

      {maxLen > 0 && (
        <>
          <div className="cosmos-orbit-canvas-wrap">
            <svg viewBox="0 0 200 200" className="cosmos-orbit-canvas">
              <circle cx={100} cy={100} r={3} fill="#fbbf24" />
              {submitted?.bodies.map((command) => {
                const series = data[command] ?? [];
                const body = BODIES.find((b) => b.command === command);
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
