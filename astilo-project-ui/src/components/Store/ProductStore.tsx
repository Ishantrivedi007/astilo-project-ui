import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { toast } from "sonner";
import { Card, CardBody, CardFooter, Chip, Button, Badge } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading, Reveal } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { fetchProducts, fetchCategories, FALLBACK_PRODUCTS, type StoreProduct } from "../../lib/store";
import { useProductStore } from "./useProductStore";

const emojiFor = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("cloth") || c.includes("shirt")) return "👕";
  if (c.includes("shoe")) return "👟";
  if (c.includes("jewel")) return "💍";
  if (c.includes("elec")) return "🔌";
  if (c.includes("furni")) return "🛋️";
  if (c.includes("bag")) return "🎒";
  return "🛍️";
};

const ProductStore = () => {
  const [gridRef] = useAutoAnimate<HTMLDivElement>();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const { addToCart, cartCount } = useProductStore();

  const { data: categories } = useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-products", categoryId],
    queryFn: () => fetchProducts({ limit: 24, categoryId: categoryId ?? undefined }),
    staleTime: 1000 * 60 * 5,
  });

  const products: StoreProduct[] = isError || !data?.length ? FALLBACK_PRODUCTS : data;

  return (
    <section>
      <PageHeading
        eyebrow="✦ treat yourself"
        action={
          <Badge content={cartCount || undefined} color="danger" isInvisible={!cartCount}>
            <Button
              radius="full"
              variant="bordered"
              className="border-hair/40 font-semibold text-ink"
              onPress={() => toast.message("Cart drawer coming soon — items are saved though!")}
            >
              🛒 Cart
            </Button>
          </Badge>
        }
      >
        The <span className="gradient-text">drip</span> shop
      </PageHeading>

      {categories && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            className={`pill-filter ${categoryId === null ? "is-active" : ""}`}
            onClick={() => setCategoryId(null)}
          >
            ✦ All
          </button>
          {categories.slice(0, 8).map((c) => (
            <button
              key={c.id}
              className={`pill-filter ${categoryId === c.id ? "is-active" : ""}`}
              onClick={() => setCategoryId(c.id)}
            >
              {emojiFor(c.name)} {c.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading the goods…" />
        </div>
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
                        src={p.images[0]}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2"
                      />
                    </div>
                    <Chip
                      size="sm"
                      className="absolute left-2 top-2 bg-black/60 text-[10px] text-white backdrop-blur"
                    >
                      {emojiFor(p.category.name)} {p.category.name}
                    </Chip>
                  </CardBody>
                  <p className="line-clamp-2 min-h-[2.5rem] px-3 pt-3 text-sm font-semibold text-ink">
                    {p.title}
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
                    onPress={() => {
                      addToCart({ productId: p.id, title: p.title, image: p.images[0], price: p.price });
                      toast.success(`Added "${p.title}" to cart 🛒`);
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
    </section>
  );
};

export default ProductStore;
