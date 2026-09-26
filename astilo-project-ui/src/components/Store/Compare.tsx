import { Fragment, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { fetchProduct, type Product } from "../../lib/storeApi";
import { useProductStore } from "./useProductStore";

const PLACEHOLDER_IMAGE = "https://placehold.co/300x300?text=%F0%9F%9B%8D%EF%B8%8F";

/** Every distinct spec label across the compared products, grouped the same
 * way the single-product spec table is (see ProductDetail's SpecTable) —
 * a product missing a group/label just shows a dash in that row. */
const collectSpecRows = (products: Product[]) => {
  const groups = new Map<string, Set<string>>();
  for (const p of products) {
    for (const g of p.specs ?? []) {
      const labels = groups.get(g.group) ?? new Set<string>();
      for (const item of g.items) labels.add(item.label);
      groups.set(g.group, labels);
    }
  }
  return Array.from(groups.entries()).map(([group, labels]) => ({
    group,
    labels: Array.from(labels),
  }));
};

const specValue = (product: Product, group: string, label: string) => {
  const g = product.specs?.find((s) => s.group === group);
  return g?.items.find((i) => i.label === label)?.value ?? "—";
};

const Compare = () => {
  const [params] = useSearchParams();
  const { addToCart } = useProductStore();

  const ids = useMemo(
    () =>
      Array.from(
        new Set(
          (params.get("ids") ?? "")
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0)
        )
      ),
    [params]
  );

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["store-product", String(id)],
      queryFn: () => fetchProduct(id),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const products = results.map((r) => r.data).filter((p): p is Product => Boolean(p));
  const specRows = useMemo(() => collectSpecRows(products), [products]);

  return (
    <section className="pb-16">
      <PageHeading eyebrow="✦ side by side">
        Compare <span className="gradient-text">products</span>
      </PageHeading>

      {ids.length < 2 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-lg text-ink/60">Pick at least 2 products from the shop to compare.</p>
          <Link to={AppRoute.store} className="mt-4 inline-block text-accent-2 underline">
            ← Back to the shop
          </Link>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading products…" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-40" />
                {products.map((p) => (
                  <th key={p.id} className="glass-card p-4 text-left align-top">
                    <Link to={`${AppRoute.store}/${p.id}`}>
                      <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-white p-3">
                        <img
                          src={p.imageUrl || PLACEHOLDER_IMAGE}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{p.name}</p>
                    </Link>
                    <p className="mt-1 font-display text-lg font-extrabold text-accent-2">
                      ${p.price.toFixed(2)}
                    </p>
                    <Button
                      radius="full"
                      size="sm"
                      isDisabled={p.stock <= 0}
                      className="mt-2 w-full bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f]"
                      onPress={() =>
                        addToCart({ productId: p.id, title: p.name, image: p.imageUrl ?? "", price: p.price })
                      }
                    >
                      🛒 Add to cart
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Category
                </td>
                {products.map((p) => (
                  <td key={p.id} className="border-t border-hair/10 px-4 py-2 text-sm text-ink/80">
                    {p.category ?? "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Stock
                </td>
                {products.map((p) => (
                  <td key={p.id} className="border-t border-hair/10 px-4 py-2 text-sm text-ink/80">
                    {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                  </td>
                ))}
              </tr>
              {specRows.map(({ group, labels }) => (
                <Fragment key={group}>
                  <tr>
                    <td
                      colSpan={products.length + 1}
                      className="border-t border-hair/10 px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-ink/60"
                    >
                      {group}
                    </td>
                  </tr>
                  {labels.map((label) => (
                    <tr key={`${group}-${label}`}>
                      <td className="px-3 py-2 text-xs text-ink/50">{label}</td>
                      {products.map((p) => (
                        <td key={p.id} className="border-t border-hair/10 px-4 py-2 text-sm text-ink/80">
                          {specValue(p, group, label)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default Compare;
