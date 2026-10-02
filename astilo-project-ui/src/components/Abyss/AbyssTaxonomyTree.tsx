import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchTaxonomyChildren, type TaxonNode } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const TreeNode = ({ node, depth }: { node: TaxonNode; depth: number }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["abyss", "taxonomy-children", node.aphiaId],
    queryFn: () => fetchTaxonomyChildren(node.aphiaId),
    enabled: expanded,
    staleTime: Infinity,
  });

  const isSpeciesRank = node.rank === "Species";

  return (
    <div style={{ marginLeft: depth * 1.25 + "rem" }}>
      <div className="flex items-center gap-1 py-1">
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(94,234,212,0.6)", padding: 2 }}
        >
          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} style={{ transform: expanded ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }} />}
        </button>
        <span className="text-xs uppercase tracking-wide text-white/35" style={{ minWidth: 70 }}>{node.rank}</span>
        <button
          type="button"
          className={isSpeciesRank ? "italic" : ""}
          style={{ background: "none", border: "none", color: "#e4f6f5", cursor: "pointer", fontSize: "0.88rem", textAlign: "left" }}
          onClick={() => (isSpeciesRank ? navigate(`${AppRoute.abyssSpecies}/${node.aphiaId}`) : setExpanded((e) => !e))}
        >
          {node.scientificName}
        </button>
        {node.isExtinct && <span className="abyss-unavailable">(extinct)</span>}
      </div>
      {expanded && data?.data.results.map((child) => <TreeNode key={child.aphiaId} node={child} depth={depth + 1} />)}
      {expanded && data && data.data.results.length === 0 && (
        <p className="abyss-unavailable" style={{ marginLeft: `${(depth + 1) * 1.25 + 1}rem` }}>
          No further accepted marine children in WoRMS.
        </p>
      )}
    </div>
  );
};

const AbyssTaxonomyTree = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "taxonomy-children", "root"],
    queryFn: () => fetchTaxonomyChildren(2),
    staleTime: Infinity,
  });

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Interactive Taxonomy Tree</p>
        <h1 className="abyss-title">Life, branch by branch.</h1>
        <p className="abyss-tagline">
          Browse the real WoRMS taxonomic hierarchy live — click any group to expand it, or a species
          name to open its full profile.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex items-center gap-2 mt-4 mb-4">
          <AbyssSourceBadge source="WoRMS" />
          <AbyssConfidenceBadge confidence="OBSERVED" />
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Loading Animalia…</p>}
      {isError && <p className="abyss-unavailable">Unavailable — backend may be offline.</p>}

      <Reveal>
        <div className="abyss-card">
          <div className="flex items-center gap-1 py-1 font-bold">
            <span style={{ width: 15 }} />
            <span className="text-xs uppercase tracking-wide text-white/35" style={{ minWidth: 70 }}>Kingdom</span>
            <span>Animalia</span>
          </div>
          {data?.data.results.map((child) => (
            <TreeNode key={child.aphiaId} node={child} depth={1} />
          ))}
        </div>
      </Reveal>
    </div>
  );
};

export default AbyssTaxonomyTree;
