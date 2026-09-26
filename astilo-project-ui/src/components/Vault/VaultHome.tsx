import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";

import { PageHeading, AppInput } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { deleteVaultItem, fetchVaultItems } from "../../lib/vaultApi";

const SOURCE_LABEL: Record<string, string> = {
  store: "Store",
  cosmos: "Cosmos",
  markets: "Markets",
  nimrose: "Nimrose",
  manual: "Manual",
};

const VaultHome = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["vault-items"],
    queryFn: () => fetchVaultItems(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVaultItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-items"] });
      toast.success("Removed from Vault.");
    },
    onError: () => toast.error("Couldn't remove that item."),
  });

  const all = query.data ?? [];
  const types = useMemo(() => Array.from(new Set(all.map((i) => i.itemType))), [all]);

  const filtered = all.filter((i) => {
    if (typeFilter && i.itemType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !(i.content ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const open = (url: string | null) => {
    if (!url) return;
    if (url.startsWith("/")) navigate(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="pb-16">
      <PageHeading eyebrow="✦ save everything">
        Your <span className="gradient-text">Vault</span>
      </PageHeading>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AppInput
          placeholder="Search your Vault…"
          value={search}
          onValueChange={setSearch}
          className="max-w-xs"
        />
        {types.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              className={`pill-filter ${typeFilter === null ? "is-active" : ""}`}
              onClick={() => setTypeFilter(null)}
            >
              ✦ All
            </button>
            {types.map((t) => (
              <button
                key={t}
                className={`pill-filter ${typeFilter === t ? "is-active" : ""}`}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading your vault…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Archive size={28} className="mx-auto mb-3 text-ink/30" />
          <p className="text-lg text-ink/60">
            {all.length === 0 ? "Nothing saved yet." : "Nothing matches that filter."}
          </p>
          <p className="mt-1 text-sm text-ink/40">
            Look for a "Save to Vault" button around the app — products, articles, anything worth keeping.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.id} className="glass-card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink/40">
                    {item.itemType}
                    {item.sourceModule && ` · ${SOURCE_LABEL[item.sourceModule] ?? item.sourceModule}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="shrink-0 text-ink/30 hover:text-danger"
                  aria-label="Remove from Vault"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {item.content && <p className="line-clamp-3 text-xs text-ink/60">{item.content}</p>}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] text-ink/60">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {item.url && (
                <Button
                  size="sm"
                  radius="full"
                  variant="light"
                  className="mt-1 w-fit gap-1 text-xs text-ink/60"
                  onPress={() => open(item.url)}
                >
                  <ExternalLink size={12} /> Open
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default VaultHome;
