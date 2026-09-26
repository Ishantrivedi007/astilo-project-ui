import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { toast } from "sonner";
import { Card, CardBody, CardFooter, Chip, Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading, Reveal } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { fetchProducts, type Product } from "../../lib/storeApi";
import { useProductStore } from "./useProductStore";

const emojiFor = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("cloth") || c.includes("shirt")) return "👕";
  if (c.includes("shoe")) return "👟";
  if (c.includes("jewel")) return "💍";
  if (c.includes("mobile") || c.includes("phone")) return "📱";
  if (c.includes("laptop") || c.includes("computer")) return "💻";
  if (c.includes("wearable") || c.includes("watch")) return "⌚";
  if (c.includes("audio") || c.includes("sound") || c.includes("headphone") || c.includes("speaker")) return "🎧";
  if (c.includes("elec")) return "🔌";
  if (c.includes("furni")) return "🛋️";
  if (c.includes("bag")) return "🎒";
  return "🛍️";
};

const MAX_COMPARE = 4;

const ProductStore = () => {
  const [gridRef] = useAutoAnimate<HTMLDivElement>();
  const [category, setCategory] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const navigate = useNavigate();
  const { addToCart, cartCount } = useProductStore();

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_COMPARE) {
        toast.error(`You can compare up to ${MAX_COMPARE} products at once.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-products"],
    queryFn: () => fetchProducts(),
    staleTime: 1000 * 60 * 5,
  });

  const allProducts: Product[] = useMemo(() => (isError || !data ? [] : data), [isError, data]);
  const categories = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.category).filter((c): c is string => Boolean(c)))),
    [allProducts]
  );
  const products = category ? allProducts.filter((p) => p.category === category) : allProducts;

  return (
    <section>
      <PageHeading
        eyebrow="✦ treat yourself"
        action={
          <div className="flex items-center gap-2">
            <Button
              radius="full"
              variant="bordered"
              className="gap-2 border-hair/40 font-semibold text-ink"
              onPress={() => navigate(AppRoute.storeWishlist)}
            >
              <span aria-hidden>♡</span>
              <span>Wishlist</span>
            </Button>
            <div className="relative inline-flex self-center">
              <Button
                radius="full"
                variant="bordered"
                className="gap-2 border-hair/40 font-semibold text-ink"
                onPress={() => navigate(AppRoute.storeCart)}
              >
                <span aria-hidden>🛒</span>
                <span>Cart</span>
              </Button>
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full border-2 border-[rgb(var(--surface-rgb))] bg-danger px-1 text-[11px] font-bold leading-none text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
          </div>
        }
      >
        The <span className="gradient-text">drip</span> shop
      </PageHeading>

      {categories.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            className={`pill-filter ${category === null ? "is-active" : ""}`}
            onClick={() => setCategory(null)}
          >
            ✦ All
          </button>
          {categories.slice(0, 8).map((c) => (
            <button
              key={c}
              className={`pill-filter ${category === c ? "is-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {emojiFor(c)} {c}
            </button>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <p className="mb-4 text-xs text-ink/40">
          Tap <span className="mx-0.5 inline-grid h-4 w-4 place-items-center rounded-full bg-black/50 align-middle text-[9px] text-white/90">⇄</span> on a product to add it to comparison.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading the goods…" />
        </div>
      ) : products.length === 0 ? (
        <p className="glass-card p-8 text-center text-sm text-ink/50">
          No products yet — check back soon.
        </p>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {products.map((p, i) => (
            <Reveal key={p.id} index={i}>
              <Card
                className="group glass-card w-full overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-glow"
                style={{ rotate: `${(i % 2 ? 1 : -1) * 0.6}deg` }}
              >
                <Link to={`${AppRoute.store}/${p.id}`}>
                  <CardBody className="relative overflow-visible p-0">
                    <div className="flex h-44 items-center justify-center bg-white p-4">
                      <img
                        src={p.imageUrl || "https://placehold.co/300x300?text=%F0%9F%9B%8D%EF%B8%8F"}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2"
                      />
                    </div>
                    {p.category && (
                      <Chip
                        size="sm"
                        className="absolute left-2 top-2 bg-black/60 text-[10px] text-white backdrop-blur"
                      >
                        {emojiFor(p.category)} {p.category}
                      </Chip>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleCompare(p.id);
                      }}
                      aria-pressed={compareIds.includes(p.id)}
                      aria-label={`Select ${p.name} to compare`}
                      title="Add to compare"
                      className={`absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold backdrop-blur transition-all ${
                        compareIds.includes(p.id)
                          ? "border-accent bg-accent text-[#17131f] shadow-glow"
                          : "border-white/80 bg-black/50 text-white/90 hover:scale-110 hover:border-white"
                      }`}
                    >
                      {compareIds.includes(p.id) ? "✓" : "⇄"}
                    </button>
                  </CardBody>
                  <p className="line-clamp-2 min-h-[2.5rem] px-3 pt-3 text-sm font-semibold text-ink">
                    {p.name}
                  </p>
                </Link>
                <CardFooter className="flex w-full items-center justify-between p-3 pt-2">
                  <span className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-2.5 py-1 text-xs font-bold text-[#17131f]">
                    ${p.price.toFixed(2)}
                  </span>
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
                </CardFooter>
              </Card>
            </Reveal>
          ))}
        </div>
      )}

      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="glass-card flex items-center gap-3 px-4 py-2.5 shadow-glow">
            <span className="text-sm font-semibold text-ink">
              {compareIds.length} selected · up to {MAX_COMPARE}
            </span>
            <Button
              radius="full"
              size="sm"
              variant="light"
              className="font-semibold text-ink/60"
              onPress={() => setCompareIds([])}
            >
              Clear
            </Button>
            <Button
              radius="full"
              size="sm"
              isDisabled={compareIds.length < 2}
              className="bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f]"
              onPress={() => navigate(`${AppRoute.storeCompare}?ids=${compareIds.join(",")}`)}
            >
              Compare
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductStore;
