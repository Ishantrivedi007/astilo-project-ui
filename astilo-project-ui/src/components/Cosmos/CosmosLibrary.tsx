import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { deleteCosmosItem, fetchCosmosLibrary } from "../../lib/cosmosApi";
import { COLLECTIONS } from "./CosmosSearch";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const CosmosLibrary = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["cosmos", "library"],
    queryFn: () => fetchCosmosLibrary(),
  });

  const remove = async (id: number) => {
    await deleteCosmosItem(id);
    queryClient.invalidateQueries({ queryKey: ["cosmos", "library"] });
  };

  const visibleItems = activeCollection ? items?.filter((i) => i.collection === activeCollection) : items;
  const usedCollections = new Set(items?.map((i) => i.collection));

  return (
    <div className="cosmos-page">
      <button
        type="button"
        className="cosmos-chip mb-4 inline-flex items-center gap-1"
        onClick={() => navigate(AppRoute.cosmos)}
      >
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Your saved objects</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Cosmos Library
      </h1>
      <p className="cosmos-tagline">
        Every search result has a Save button that lets you pick a collection — items land here,
        grouped by the collection you chose.
      </p>

      {items && items.length > 0 && (
        <div className="cosmos-search-examples" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="cosmos-chip"
            style={activeCollection === null ? { borderColor: "rgba(127,176,255,0.6)", color: "#fff" } : undefined}
            onClick={() => setActiveCollection(null)}
          >
            All ({items.length})
          </button>
          {COLLECTIONS.filter((c) => usedCollections.has(c.value)).map((c) => (
            <button
              key={c.value}
              type="button"
              className="cosmos-chip"
              style={activeCollection === c.value ? { borderColor: "rgba(127,176,255,0.6)", color: "#fff" } : undefined}
              onClick={() => setActiveCollection(c.value)}
            >
              {c.label} ({items.filter((i) => i.collection === c.value).length})
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="mt-6 text-sm text-white/60">Loading your library…</p>}

      {items && items.length === 0 && (
        <p className="mt-6 cosmos-unavailable">
          Nothing saved yet — search for a planet, asteroid, star or exoplanet and hit Save.
        </p>
      )}

      <div className="cosmos-result-list mt-6">
        {visibleItems?.map((item) => (
          <div key={item.id} className="cosmos-card flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {item.source && <CosmosSourceBadge source={item.source} />}
                <span className="cosmos-chip">{item.objectType}</span>
                <span className="cosmos-chip">
                  {COLLECTIONS.find((c) => c.value === item.collection)?.label ?? item.collection}
                </span>
              </div>
              <h3 className="text-base font-bold">{item.title ?? item.externalId}</h3>
              {item.createdAt && (
                <p className="text-xs text-white/40">
                  Saved {new Date(item.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              type="button"
              className="cosmos-chip"
              onClick={() => remove(item.id)}
              aria-label="Remove from library"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CosmosLibrary;
