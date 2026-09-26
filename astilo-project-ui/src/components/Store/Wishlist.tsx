import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { fetchWishlist, removeFromWishlist, storeErrorMessage } from "../../lib/storeApi";
import { useProductStore } from "./useProductStore";

const PLACEHOLDER_IMAGE = "https://placehold.co/200x200?text=%F0%9F%9B%8D%EF%B8%8F";

const Wishlist = () => {
  const queryClient = useQueryClient();
  const { addToCart } = useProductStore();
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  const { data: items, isLoading } = useQuery({
    queryKey: ["store-wishlist"],
    queryFn: fetchWishlist,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => removeFromWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
      toast.success("Removed from wishlist.");
    },
    onError: (err: unknown) => toast.error(storeErrorMessage(err, "Couldn't remove that from your wishlist.")),
  });

  return (
    <section className="pb-16">
      <PageHeading eyebrow="✦ saved for later">
        Your <span className="gradient-text">wishlist</span>
      </PageHeading>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading your wishlist…" />
        </div>
      ) : !items || items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-lg text-ink/60">Nothing saved yet.</p>
          <Link to={AppRoute.store} className="mt-4 inline-block text-accent-2 underline">
            ← Browse the shop
          </Link>
        </div>
      ) : (
        <div ref={listRef} className="flex flex-col gap-3">
          {items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <div key={item.id} className="glass-card flex items-center gap-4 p-3">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                  <img
                    src={p.imageUrl || PLACEHOLDER_IMAGE}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`${AppRoute.store}/${p.id}`}
                    className="line-clamp-2 text-sm font-semibold text-ink hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-accent-2">${p.price.toFixed(2)}</p>
                  <p className="text-xs text-ink/50">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  radius="full"
                  className="bg-ink/10 text-sm transition-transform hover:scale-110"
                  aria-label="Add to cart"
                  isDisabled={p.stock <= 0}
                  onPress={() => {
                    addToCart({ productId: p.id, title: p.name, image: p.imageUrl ?? "", price: p.price });
                    toast.success(`Added "${p.name}" to cart 🛒`);
                  }}
                >
                  🛒
                </Button>
                <button
                  className="text-xs text-ink/30 hover:text-danger"
                  onClick={() => removeMutation.mutate(p.id)}
                  aria-label="Remove from wishlist"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Wishlist;
