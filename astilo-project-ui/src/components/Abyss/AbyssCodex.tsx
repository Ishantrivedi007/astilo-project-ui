import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { deleteCodexItem, fetchCodex } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import "./Abyss.scss";

const AbyssCodex = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "codex"],
    queryFn: () => fetchCodex(),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCodexItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["abyss", "codex"] }),
  });

  const counts = (data ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.objectType] = (acc[item.objectType] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Abyss Codex</p>
        <h1 className="abyss-title">Your discoveries.</h1>
        <p className="abyss-tagline">Species, occurrences and habitats you've saved while exploring.</p>
      </Reveal>

      <Reveal>
        <div className="abyss-card mt-6 mb-6">
          <p className="text-sm text-white/60 mb-2">Discovered {data?.length ?? 0}</p>
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            {Object.entries(counts).map(([type, count]) => (
              <span key={type}>
                {type} <strong className="text-white">{count}</strong>
              </span>
            ))}
            {data && data.length === 0 && <span className="abyss-unavailable">Nothing saved yet — search for a species and save it to your Codex.</span>}
          </div>
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable">Loading your Codex…</p>}
      {isError && <p className="abyss-unavailable">Codex unavailable — sign in or check the backend.</p>}

      <div className="grid gap-3">
        {data?.map((item) => (
          <Reveal key={item.id}>
            <div className="abyss-card flex items-center justify-between gap-3">
              <button
                type="button"
                className="text-left flex-1"
                onClick={() => item.objectType === "species" && navigate(`${AppRoute.abyssSpecies}/${item.externalId}`)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.source && <AbyssSourceBadge source={item.source} />}
                  <span className="text-xs uppercase tracking-wide text-white/40">{item.objectType}</span>
                </div>
                <p className="font-bold italic">{item.title ?? item.externalId}</p>
                {item.notes && <p className="text-xs text-white/50 mt-1">{item.notes}</p>}
              </button>
              <button
                type="button"
                className="abyss-source-badge"
                onClick={() => deleteMutation.mutate(item.id)}
                aria-label="Remove from Codex"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default AbyssCodex;
