import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchOceanChemistry } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssOceanChemistry = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "ocean-chemistry"],
    queryFn: () => fetchOceanChemistry(),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Ocean Chemistry</p>
        <h1 className="abyss-title">Typical ocean chemistry by depth.</h1>
        <p className="abyss-tagline">
          Generalized published ranges — not a live measurement at a specific point. For a real
          point reading, use Ocean Explorer's satellite and bathymetry layers.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-2">
          <AbyssSourceBadge source="Astilo reference" />
          <AbyssConfidenceBadge confidence="CURATED" />
        </div>
        <div className="abyss-card abyss-table-wrap">
          {isLoading && <p className="abyss-unavailable">Loading…</p>}
          {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}
          {data && (
            <table className="abyss-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Salinity (PSU)</th>
                  <th>pH (approx.)</th>
                  <th>Dissolved oxygen (mg/L)</th>
                </tr>
              </thead>
              <tbody>
                {data.data.zones.map((z) => (
                  <tr key={z.zoneId}>
                    <td className="font-semibold">{z.zoneLabel}</td>
                    <td>{z.salinityPsu}</td>
                    <td>{z.phApprox}</td>
                    <td>{z.dissolvedOxygenMgL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Reveal>
    </div>
  );
};

export default AbyssOceanChemistry;
