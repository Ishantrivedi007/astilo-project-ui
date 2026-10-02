import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookmarkPlus, Check, MapPin } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchSpeciesProfile, saveCodexItem } from "../../lib/abyssApi";
import { clearNereusContext, setNereusContext } from "../../lib/nereusContext";
import { useScientificMode } from "../../lib/useScientificMode";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import AbyssSpeciesImage from "./AbyssSpeciesImage";
import "./Abyss.scss";

type Tab = "overview" | "taxonomy" | "distribution" | "observations" | "sources";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "taxonomy", label: "Taxonomy" },
  { id: "distribution", label: "Distribution" },
  { id: "observations", label: "Observations" },
  { id: "sources", label: "Sources" },
];

const AbyssSpeciesProfile = () => {
  const navigate = useNavigate();
  const { aphiaId } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();
  const scientificMode = useScientificMode();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "species", aphiaId],
    queryFn: () => fetchSpeciesProfile(Number(aphiaId)),
    enabled: Boolean(aphiaId),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const record = data!.taxonomy.data;
      return saveCodexItem({
        objectType: "species",
        externalId: String(record.aphiaId),
        collection: "codex",
        title: record.scientificName,
        source: "WoRMS",
        sourceDataset: "AphiaRecordByAphiaID",
        data: record,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["abyss", "codex"] }),
  });

  // Nereus Context Engine: tell Nereus what the user is looking at so it
  // can ground answers without the user re-typing the species name.
  useEffect(() => {
    if (data) {
      setNereusContext({ module: "species_profile", selectedSpecies: data.taxonomy.data.scientificName, selectedSpeciesAphiaId: data.taxonomy.data.aphiaId });
    }
    return () => clearNereusContext(["selectedSpecies", "selectedSpeciesAphiaId"]);
  }, [data]);

  if (isLoading) return <div className="abyss-page"><p className="abyss-unavailable">Loading species profile…</p></div>;
  if (isError || !data) return <div className="abyss-page"><p className="abyss-unavailable">Species not found or backend unavailable.</p></div>;

  const { taxonomy, classification, distribution, occurrences } = data;
  const record = taxonomy.data;

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyssSearch)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Search
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="abyss-eyebrow">{record.rank ?? "Species"}</p>
            <h1 className="abyss-title">{record.scientificName}</h1>
            {record.authority && <p className="abyss-tagline">{record.authority}</p>}
          </div>
          <button
            type="button"
            className="abyss-nav-tile"
            style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || saveMutation.isSuccess}
          >
            {saveMutation.isSuccess ? <Check size={16} /> : <BookmarkPlus size={16} />}
            <span>{saveMutation.isSuccess ? "Saved to Codex" : "Save to Codex"}</span>
          </button>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-4">
          <AbyssSpeciesImage title={record.scientificName} height={260} />
        </div>
      </Reveal>

      <div className="flex flex-wrap gap-2 mt-6 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="abyss-source-badge"
            style={tab === t.id ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Reveal>
          <div className="abyss-card">
            <div className="flex items-center gap-2 mb-3">
              <AbyssSourceBadge source="WoRMS" />
              <AbyssConfidenceBadge confidence={taxonomy.confidence} />
            </div>
            <dl className="abyss-field-grid">
              <div className="abyss-field"><dt>Kingdom</dt><dd>{record.kingdom ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Phylum</dt><dd>{record.phylum ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Class</dt><dd>{record.className ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Order</dt><dd>{record.order ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Family</dt><dd>{record.family ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Genus</dt><dd>{record.genus ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Status</dt><dd>{record.status ?? "—"}</dd></div>
              <div className="abyss-field"><dt>Marine</dt><dd>{record.isMarine ? "Yes" : "No"}</dd></div>
              <div className="abyss-field"><dt>Observations (OBIS)</dt><dd>{occurrences.data.total.toLocaleString()}</dd></div>
            </dl>
          </div>
        </Reveal>
      )}

      {tab === "taxonomy" && (
        <Reveal>
          <div className="abyss-card">
            <div className="flex items-center gap-2 mb-3">
              <AbyssSourceBadge source="WoRMS" />
              <AbyssConfidenceBadge confidence={classification.confidence} />
            </div>
            {classification.data.lineage.length === 0 && <p className="abyss-unavailable">No classification lineage available.</p>}
            <ol className="flex flex-col gap-1">
              {classification.data.lineage.map((node, i) => (
                <li key={node.aphiaId ?? i} className="text-sm text-white/75" style={{ marginLeft: `${i * 1.1}rem` }}>
                  <span className="text-white/40 text-xs uppercase tracking-wide mr-2">{node.rank}</span>
                  {node.scientificName}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      )}

      {tab === "distribution" && (
        <Reveal>
          <div className="abyss-card">
            <div className="flex items-center gap-2 mb-3">
              <AbyssSourceBadge source="WoRMS" />
              <AbyssConfidenceBadge confidence={distribution.confidence} />
            </div>
            {distribution.data.results.length === 0 && <p className="abyss-unavailable">No curated distribution records available.</p>}
            <div className="grid gap-2">
              {distribution.data.results.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {d.locality ?? d.higherGeography ?? "Unspecified location"}
                    {d.establishmentMeans && <span className="text-white/40"> · {d.establishmentMeans}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {tab === "observations" && (
        <Reveal>
          <div className="abyss-card">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <AbyssSourceBadge source="OBIS" />
                <AbyssConfidenceBadge confidence={occurrences.confidence} />
              </div>
              <span className="abyss-unavailable">
                {occurrences.data.total.toLocaleString()} records total · showing {occurrences.data.results.length}
              </span>
            </div>
            <div className="abyss-table-wrap">
              <table className="abyss-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Depth (m)</th>
                    <th>Basis</th>
                    <th>Dataset</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.data.results.map((o) => (
                    <tr key={o.id}>
                      <td>{o.eventDate ?? "—"}</td>
                      <td>{o.decimalLatitude?.toFixed(3) ?? "—"}</td>
                      <td>{o.decimalLongitude?.toFixed(3) ?? "—"}</td>
                      <td>{o.depth ?? "—"}</td>
                      <td>{o.basisOfRecord ?? "—"}</td>
                      <td>{o.datasetName ?? o.institutionCode ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {tab === "sources" && (
        <Reveal>
          <div className="abyss-card">
            <p className="text-sm text-white/70 mb-3">Every field on this page traces back to one of these:</p>
            <ul className="flex flex-col gap-3">
              {[
                { env: taxonomy, label: "Taxonomy" },
                { env: classification, label: "Classification lineage" },
                { env: distribution, label: "Distribution" },
                { env: occurrences, label: "Occurrence records" },
              ].map(({ env, label }) => (
                <li key={label} className="flex flex-col gap-1 text-sm text-white/70 border-b border-white/10 pb-2">
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="flex items-center gap-2">
                      <AbyssSourceBadge source={`${env.source} · ${env.sourceDataset}`} />
                      <AbyssConfidenceBadge confidence={env.confidence} />
                      <span className="text-xs text-white/40">{new Date(env.retrievedAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                  {scientificMode && (
                    <div className="text-xs text-white/40" style={{ fontFamily: "monospace" }}>
                      retrievedAt: {env.retrievedAt} · externalId: {env.externalId ?? "null"} · aphiaId: {aphiaId}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {scientificMode && (
              <button
                type="button"
                className="abyss-source-badge mt-3"
                onClick={() => navigate(`${AppRoute.abyssDataInspector}`)}
              >
                View raw JSON in Data Inspector
              </button>
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
};

export default AbyssSpeciesProfile;
