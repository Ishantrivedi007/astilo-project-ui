import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchOceanVsSpaceWorlds } from "../../lib/abyssApi";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

const ROWS: { key: "water" | "sunlight" | "temperatureC" | "pressureAtm" | "energySource" | "knownLife"; label: string }[] = [
  { key: "water", label: "Water" },
  { key: "sunlight", label: "Sunlight" },
  { key: "temperatureC", label: "Temperature" },
  { key: "pressureAtm", label: "Pressure" },
  { key: "energySource", label: "Energy source" },
  { key: "knownLife", label: "Known life" },
];

const AbyssOceanVsSpace = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "ocean-vs-space"],
    queryFn: () => fetchOceanVsSpaceWorlds(),
    staleTime: Infinity,
    retry: false,
  });

  const worlds = data?.data.worlds ?? [];

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Ocean vs Space</p>
        <h1 className="abyss-title">Earth's abyss, and beyond.</h1>
        <p className="abyss-tagline">
          Real mission findings for Europa and Enceladus's subsurface oceans — their potential for
          life is explicitly unknown, never presented as confirmed.
        </p>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-6">Loading…</p>}
      {isError && <p className="abyss-unavailable mt-6">Unavailable — backend may be offline.</p>}

      <div className="grid gap-4 mt-6">
        {worlds.map((w) => (
          <Reveal key={w.id}>
            <div className="abyss-card abyss-media-card">
              {w.imageUrl ? (
                <div style={{ position: "relative", height: 180, borderRadius: "0.9rem", overflow: "hidden" }}>
                  <img src={w.imageUrl} alt={w.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0.3rem 0.5rem", fontSize: "0.62rem", color: "rgba(255,255,255,0.75)", background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
                    {w.imageCredit}
                  </div>
                </div>
              ) : (
                <AbyssSpeciesImage title={w.imageTopic ?? w.label} height={180} />
              )}
              <div>
                <p className="text-lg font-bold mb-2">{w.label}</p>
                <p className="text-sm text-white/70 mb-3">{w.summary}</p>
                {w.id !== "earth-abyss" && (
                  <button
                    type="button"
                    className="abyss-nav-tile"
                    style={{ flexDirection: "row", alignItems: "center" }}
                    onClick={() => navigate(`${AppRoute.abyssBuildACreature}?world=${encodeURIComponent(w.label)}`)}
                  >
                    Design a possible organism
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {worlds.length > 0 && (
        <Reveal>
          <div className="abyss-card abyss-table-wrap mt-6">
            <table className="abyss-table">
              <thead>
                <tr>
                  <th></th>
                  {worlds.map((w) => (
                    <th key={w.id}>{w.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key}>
                    <th>{row.label}</th>
                    {worlds.map((w) => (
                      <td key={w.id}>
                        {row.key === "knownLife" ? (
                          <div className="flex flex-col gap-1">
                            <AbyssConfidenceBadge confidence={w.lifeStatus === "CONFIRMED" ? "OBSERVED" : "UNKNOWN"} />
                            <span>{w[row.key]}</span>
                          </div>
                        ) : (
                          w[row.key]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssOceanVsSpace;
