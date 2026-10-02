import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchDataSources } from "../../lib/abyssApi";
import "./Abyss.scss";

const AbyssDataSources = () => {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "data-sources"],
    queryFn: () => fetchDataSources({ module: "abyss" }),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ License Registry</p>
        <h1 className="abyss-title">Data sources</h1>
        <p className="abyss-tagline">
          Every external dataset Abyss can draw on, with its license, attribution requirement and
          whether it's currently enabled under Astilo's configured reuse policy. Nothing here is
          assumed "free to reuse" just because it's publicly accessible — a dataset whose license
          conflicts with policy is disabled rather than silently ingested.
        </p>
      </Reveal>

      <Reveal>
        <div className="abyss-card abyss-table-wrap mt-6">
          {isLoading && <p className="abyss-unavailable">Loading registry…</p>}
          {isError && <p className="abyss-unavailable">Registry unavailable — backend may be offline.</p>}
          {data && (
            <table className="abyss-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Dataset</th>
                  <th>License</th>
                  <th>Commercial use</th>
                  <th>Attribution</th>
                  <th>Status</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {data.dataSources.map((row) => (
                  <tr key={row.id} data-disabled={!row.enabled}>
                    <td className="font-semibold">{row.provider}</td>
                    <td>{row.dataset}</td>
                    <td>{row.license}</td>
                    <td>{row.commercialAllowed === null ? "Varies" : row.commercialAllowed ? "Yes" : "No"}</td>
                    <td>{row.attributionRequired ? "Required" : "Not required"}</td>
                    <td>
                      {row.enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 size={14} /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-white/40">
                          <XCircle size={14} /> Disabled
                        </span>
                      )}
                    </td>
                    <td>
                      {row.sourceUrl && (
                        <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                          Source
                        </a>
                      )}
                      {row.sourceUrl && row.termsUrl && " · "}
                      {row.termsUrl && (
                        <a href={row.termsUrl} target="_blank" rel="noreferrer">
                          Terms
                        </a>
                      )}
                    </td>
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

export default AbyssDataSources;
