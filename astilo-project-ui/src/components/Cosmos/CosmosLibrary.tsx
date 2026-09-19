import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { deleteCosmosItem, fetchCosmosLibrary } from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const CosmosLibrary = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["cosmos", "library"],
    queryFn: () => fetchCosmosLibrary(),
  });

  const remove = async (id: number) => {
    await deleteCosmosItem(id);
    queryClient.invalidateQueries({ queryKey: ["cosmos", "library"] });
  };

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

      {isLoading && <p className="mt-6 text-sm text-white/60">Loading your library…</p>}

      {items && items.length === 0 && (
        <p className="mt-6 cosmos-unavailable">
          Nothing saved yet — search for a planet, asteroid, star or exoplanet and hit Save.
        </p>
      )}

      <div className="cosmos-result-list mt-6">
        {items?.map((item) => (
          <div key={item.id} className="cosmos-card flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {item.source && <CosmosSourceBadge source={item.source} />}
                <span className="cosmos-chip">{item.objectType}</span>
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
