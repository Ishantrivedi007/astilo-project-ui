import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Navigation } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal, Chart } from "../shared";
import { fetchSalinityProfile, fetchSurfaceCurrent, fetchTemperatureProfile } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const PRESETS = [
  { label: "Arabian Sea (off India)", lat: 15, lon: 72 },
  { label: "Gulf Stream (N. Atlantic)", lat: 35, lon: -70 },
  { label: "Equatorial Pacific", lat: 0, lon: -150 },
  { label: "Southern Ocean", lat: -60, lon: 0 },
  { label: "Mediterranean Sea", lat: 38, lon: 15 },
];

const AbyssOceanHeatExplorer = () => {
  const navigate = useNavigate();
  const [point, setPoint] = useState(PRESETS[0]);
  const [latInput, setLatInput] = useState(String(PRESETS[0].lat));
  const [lonInput, setLonInput] = useState(String(PRESETS[0].lon));

  const { data: tempEnv, isLoading: tempLoading, isError: tempError } = useQuery({
    queryKey: ["abyss", "copernicus-temp", point.lat, point.lon],
    queryFn: () => fetchTemperatureProfile(point.lat, point.lon),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  const { data: salEnv, isLoading: salLoading } = useQuery({
    queryKey: ["abyss", "copernicus-sal", point.lat, point.lon],
    queryFn: () => fetchSalinityProfile(point.lat, point.lon),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  const { data: curEnv, isLoading: curLoading } = useQuery({
    queryKey: ["abyss", "copernicus-cur", point.lat, point.lon],
    queryFn: () => fetchSurfaceCurrent(point.lat, point.lon),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latInput);
    const lon = Number(lonInput);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) setPoint({ label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon });
  };

  const tempProfile = tempEnv?.data.profile ?? [];
  const salProfile = salEnv?.data.profile ?? [];

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Ocean Heat, Salinity & Currents</p>
        <h1 className="abyss-title">Real gridded ocean data.</h1>
        <p className="abyss-tagline">
          Live from Copernicus Marine's Global Ocean Physics Analysis and Forecast — real
          temperature, salinity and current data, not hardcoded examples. Point-based, not yet a
          full animated particle-stream current map.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap gap-2 mt-4 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="abyss-source-badge"
              style={point.label === p.label ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              onClick={() => setPoint(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={submitCustom} className="flex gap-2 mb-6" style={{ maxWidth: 420 }}>
          <input
            className="abyss-search-input"
            style={{ width: 100, padding: "0.5rem 0.7rem", borderRadius: "0.6rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.82rem" }}
            type="number"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            placeholder="Lat"
          />
          <input
            className="abyss-search-input"
            style={{ width: 100, padding: "0.5rem 0.7rem", borderRadius: "0.6rem", border: "1px solid rgba(94,234,212,0.25)", background: "rgba(6,24,28,0.65)", color: "#e4f6f5", fontSize: "0.82rem" }}
            type="number"
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            placeholder="Lon"
          />
          <button type="submit" className="abyss-nav-tile" style={{ flexDirection: "row", alignItems: "center" }}>
            Go
          </button>
        </form>
      </Reveal>

      {tempError && <p className="abyss-unavailable mb-4">Copernicus Marine unavailable — check login or backend status.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Reveal>
          <div className="abyss-card">
            <p className="font-bold mb-2">Temperature by depth</p>
            {tempLoading && <p className="abyss-unavailable">Loading real profile…</p>}
            {tempProfile.length > 0 && (
              <Chart
                type="area"
                height={240}
                series={[{ name: "°C", data: tempProfile.map((p) => p.temperatureC) }]}
                options={{ xaxis: { categories: tempProfile.map((p) => `${p.depthMeters}m`), tickAmount: 6 } }}
              />
            )}
          </div>
        </Reveal>
        <Reveal>
          <div className="abyss-card">
            <p className="font-bold mb-2">Salinity by depth</p>
            {salLoading && <p className="abyss-unavailable">Loading real profile…</p>}
            {salProfile.length > 0 && (
              <Chart
                type="area"
                height={240}
                series={[{ name: "PSU", data: salProfile.map((p) => p.salinityPsu) }]}
                options={{ xaxis: { categories: salProfile.map((p) => `${p.depthMeters}m`), tickAmount: 6 } }}
              />
            )}
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="abyss-card mt-4">
          <p className="font-bold mb-2">Surface current</p>
          {curLoading && <p className="abyss-unavailable">Loading…</p>}
          {curEnv && curEnv.data.speedMs !== null && (
            <div className="flex items-center gap-3">
              <Navigation size={28} style={{ transform: `rotate(${curEnv.data.directionDeg}deg)` }} />
              <div>
                <p className="text-lg font-bold">{curEnv.data.speedMs} m/s</p>
                <p className="abyss-unavailable">{curEnv.data.directionDeg}° (oceanographic convention, clockwise from north)</p>
              </div>
            </div>
          )}
          {curEnv && curEnv.data.speedMs === null && <p className="abyss-unavailable">No current data at this point (likely on land).</p>}
        </div>
      </Reveal>

      <div className="flex items-center gap-2 mt-4">
        <AbyssSourceBadge source="Copernicus Marine" />
        <AbyssConfidenceBadge confidence="OBSERVED" />
        {tempEnv && <span className="abyss-unavailable">Model time: {tempEnv.data.observedAt}</span>}
      </div>
    </div>
  );
};

export default AbyssOceanHeatExplorer;
