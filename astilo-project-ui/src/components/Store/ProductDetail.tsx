import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Chip } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { AppInput, AppTextarea } from "../shared";
import Chart from "../shared/Chart";
import { AppRoute } from "../../app/AppRoute";
import {
  addToWishlist,
  fetchPriceHistory,
  fetchProduct,
  fetchProducts,
  fetchWishlist,
  removeFromWishlist,
  storeErrorMessage,
  type Product,
  type SpecGroup,
} from "../../lib/storeApi";
import { useProductStore, type ProductReview } from "./useProductStore";
import { required } from "../../lib/validators";
import SaveToVaultButton from "../Vault/SaveToVaultButton";

const PLACEHOLDER_IMAGE = "https://placehold.co/500x500?text=%F0%9F%9B%8D%EF%B8%8F";

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

const iconForGroup = (group: string) => {
  const g = group.toLowerCase();
  if (g.includes("display") || g.includes("screen")) return "🖥️";
  if (g.includes("camera")) return "📷";
  if (g.includes("battery") || g.includes("charg")) return "🔋";
  if (g.includes("performance") || g.includes("processor") || g.includes("chip")) return "⚡";
  if (g.includes("connect") || g.includes("port") || g.includes("network")) return "🔌";
  if (g.includes("audio") || g.includes("sound")) return "🔊";
  if (g.includes("health") || g.includes("fitness")) return "❤️";
  if (g.includes("build") || g.includes("material") || g.includes("design")) return "🏗️";
  if (g.includes("capacity") || g.includes("fit")) return "📦";
  if (g.includes("ergonom")) return "🧭";
  return "📋";
};

const SpecTable = ({ groups }: { groups: SpecGroup[] }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {groups.map((group) => (
      <div key={group.group} className="glass-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-ink">
          <span aria-hidden>{iconForGroup(group.group)}</span>
          {group.group}
        </h3>
        <dl className="divide-y divide-hair/10">
          {group.items.map((item) => (
            <div key={item.label} className="flex justify-between gap-4 py-1.5 text-sm">
              <dt className="text-ink/50">{item.label}</dt>
              <dd className="text-right font-medium text-ink/85">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    ))}
  </div>
);

const StarRating = ({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => {
      const n = i + 1;
      return (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none transition-transform ${
            readOnly ? "" : "hover:scale-125"
          } ${n <= value ? "text-amber-400" : "text-ink/20"}`}
          aria-label={`${n} of 5`}
        >
          ★
        </button>
      );
    })}
  </div>
);

const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const ReviewCard = ({ review, onDelete }: { review: ProductReview; onDelete: (id: string) => void }) => (
  <article className="glass-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">
          {review.author.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{review.author}</p>
          <p className="text-xs text-ink/40">{timeAgo(review.createdAt)}</p>
        </div>
      </div>
      <StarRating value={review.rating} readOnly />
    </div>
    {review.body && <p className="mt-3 whitespace-pre-wrap text-sm text-ink/80">{review.body}</p>}
    <button
      type="button"
      onClick={() => onDelete(review.id)}
      className="mt-2 text-xs text-ink/30 hover:text-danger"
    >
      remove
    </button>
  </article>
);

const PriceHistoryChart = ({ productId }: { productId: number }) => {
  const { data: history } = useQuery({
    queryKey: ["store-price-history", productId],
    queryFn: () => fetchPriceHistory(productId),
    staleTime: 1000 * 60 * 5,
  });

  const points = (history ?? []).filter((h) => h.recordedAt);
  if (points.length < 2) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-2xl font-bold text-ink">Price history</h2>
      <div className="glass-card p-4">
        <Chart
          type="area"
          height={220}
          series={[
            {
              name: "Price",
              data: points.map((p) => ({ x: new Date(p.recordedAt as string).getTime(), y: p.price })),
            },
          ]}
          options={{
            xaxis: { type: "datetime" },
            yaxis: { labels: { formatter: (v: number) => `$${v.toFixed(0)}` } },
            tooltip: { x: { format: "MMM d, yyyy" }, y: { formatter: (v: number) => `$${v.toFixed(2)}` } },
          }}
        />
      </div>
    </section>
  );
};

const ProductDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { addToCart, reviewsFor, addReview, deleteReview } = useProductStore();
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ["store-product", id],
    queryFn: () => fetchProduct(id),
    staleTime: 1000 * 60 * 5,
  });

  const { data: related } = useQuery({
    queryKey: ["store-related", product?.category],
    queryFn: () => fetchProducts(product?.category ?? undefined),
    enabled: Boolean(product?.category),
  });

  const { data: wishlist } = useQuery({
    queryKey: ["store-wishlist"],
    queryFn: fetchWishlist,
    staleTime: 1000 * 30,
  });
  const isWishlisted = useMemo(
    () => Boolean(product && wishlist?.some((w) => w.productId === product.id)),
    [wishlist, product]
  );

  const addWishlistMutation = useMutation({
    mutationFn: (productId: number) => addToWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
      toast.success(`Added "${product?.name}" to your wishlist ♡`);
    },
    onError: (err: unknown) => toast.error(storeErrorMessage(err, "Couldn't add that to your wishlist.")),
  });

  const removeWishlistMutation = useMutation({
    mutationFn: (productId: number) => removeFromWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
      toast.success(`Removed "${product?.name}" from your wishlist`);
    },
    onError: (err: unknown) => toast.error(storeErrorMessage(err, "Couldn't remove that from your wishlist.")),
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setQuantity(1);
  }, [id]);

  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [reviewTouched, setReviewTouched] = useState(false);
  const authorError = required(author, "Your name");

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading product…" />
      </div>
    );

  if (isError || !product)
    return (
      <div className="py-32 text-center">
        <p className="text-ink/60">Couldn't load this product.</p>
        <Link to={AppRoute.store} className="mt-3 inline-block text-accent-2 underline">
          ← Back to the shop
        </Link>
      </div>
    );

  const reviews = reviewsFor(product.id);
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewTouched(true);
    if (authorError) return;
    addReview({ productId: product.id, author: author.trim(), rating, body: body.trim() });
    setBody("");
    setReviewTouched(false);
    toast.success("Review posted!");
  };

  const recommendations = (related ?? []).filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <div className="pb-16">
      <Link
        to={AppRoute.store}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
      >
        ← All products
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="glass-card grid aspect-square place-items-center overflow-hidden bg-white p-8">
            <img
              src={product.imageUrl || PLACEHOLDER_IMAGE}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Chip className="bg-ink/10 text-xs text-ink/70">
              {emojiFor(product.category)} {product.category}
            </Chip>
          )}
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-2 flex items-center gap-2">
            <StarRating value={Math.round(avgRating)} readOnly />
            <span className="text-sm text-ink/50">
              {reviews.length > 0
                ? `${avgRating.toFixed(1)} · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                : "No reviews yet"}
            </span>
          </div>

          <p className="mt-4 gradient-text font-display text-3xl font-extrabold">
            ${product.price.toFixed(2)}
          </p>

          <p className="mt-2 text-xs font-semibold text-ink/50">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70">{product.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-hair/30">
              <button
                className="px-3 py-2 text-ink/60 hover:text-ink"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold text-ink">{quantity}</span>
              <button
                className="px-3 py-2 text-ink/60 hover:text-ink"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              >
                +
              </button>
            </div>
            <Button
              radius="full"
              isDisabled={product.stock <= 0}
              className="bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f] shadow-glow transition-transform hover:scale-105"
              onPress={() => {
                addToCart(
                  { productId: product.id, title: product.name, image: product.imageUrl ?? "", price: product.price },
                  quantity
                );
                toast.success(`Added ${quantity} × "${product.name}" to cart 🛒`);
              }}
            >
              🛒 Add to cart
            </Button>
            <Button
              radius="full"
              variant="bordered"
              className={`border-hair/40 font-semibold ${isWishlisted ? "text-danger" : "text-ink"}`}
              isLoading={addWishlistMutation.isPending || removeWishlistMutation.isPending}
              onPress={() =>
                isWishlisted ? removeWishlistMutation.mutate(product.id) : addWishlistMutation.mutate(product.id)
              }
            >
              {isWishlisted ? "♥ Wishlisted" : "♡ Wishlist"}
            </Button>
            <SaveToVaultButton
              title={product.name}
              itemType="product"
              url={`${AppRoute.store}/${product.id}`}
              thumbnailUrl={product.imageUrl ?? undefined}
              sourceModule="store"
              content={product.description ?? undefined}
              metadata={{ price: product.price, category: product.category }}
            />
          </div>
        </div>
      </div>

      {/* Specifications */}
      {product.specs && product.specs.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-2xl font-bold text-ink">Specifications</h2>
          <SpecTable groups={product.specs} />
        </section>
      )}

      <PriceHistoryChart productId={product.id} />

      {/* Reviews */}
      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">
          Reviews {reviews.length > 0 && <span className="text-ink/40">({reviews.length})</span>}
        </h2>

        <form onSubmit={submitReview} className="glass-card mb-6 flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <AppInput
              placeholder="Your name"
              value={author}
              onValueChange={setAuthor}
              className="max-w-[220px]"
              isInvalid={reviewTouched && Boolean(authorError)}
              errorMessage={authorError}
            />
            <StarRating value={rating} onChange={setRating} />
          </div>
          <AppTextarea
            placeholder="What did you think? (optional)"
            value={body}
            onValueChange={setBody}
            minRows={2}
          />
          <Button type="submit" radius="full" className="self-start bg-ink/10 font-semibold text-ink">
            Post review
          </Button>
        </form>

        {reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} onDelete={deleteReview} />
            ))}
          </div>
        ) : (
          <p className="glass-card p-6 text-center text-sm text-ink/50">
            No reviews yet — be the first to leave one.
          </p>
        )}
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-2xl font-bold text-ink">More like this</h2>
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar">
            {recommendations.map((r) => (
              <Link
                key={r.id}
                to={`${AppRoute.store}/${r.id}`}
                className="group w-[150px] shrink-0 snap-start"
              >
                <div className="glass-card grid aspect-square place-items-center overflow-hidden bg-white p-3 transition-transform duration-300 group-hover:-translate-y-1.5">
                  <img
                    src={r.imageUrl || PLACEHOLDER_IMAGE}
                    alt={r.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-ink/50">${r.price.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
