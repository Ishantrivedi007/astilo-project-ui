import axios from "axios";

/**
 * Platzi Fake Store API (https://fakeapi.platzi.com) — free, keyless, real
 * multi-image products across real categories. Used for catalogue browsing
 * only; checkout/cart stay local (see useProductStore) since these ids don't
 * exist in our own backend's Product table.
 */
const client = axios.create({ baseURL: "https://api.escuelajs.co/api/v1" });

export interface StoreCategory {
  id: number;
  name: string;
  image: string;
}

export interface StoreProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  images: string[];
  category: StoreCategory;
}

interface RawProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  images: string[];
  category: { id: number; name: string; image: string };
}

const cleanImages = (images: string[]) =>
  images
    .map((src) => src.replace(/[[\]"]/g, "")) // the API sometimes returns stringified arrays like '["url"]'
    .filter((src) => /^https?:\/\//.test(src));

const normalize = (raw: RawProduct): StoreProduct => ({
  id: raw.id,
  title: raw.title,
  price: raw.price,
  description: raw.description,
  images: cleanImages(raw.images ?? []),
  category: raw.category,
});

export async function fetchProducts(opts: { limit?: number; categoryId?: number } = {}): Promise<StoreProduct[]> {
  const { limit = 24, categoryId } = opts;
  const path = categoryId ? `/categories/${categoryId}/products` : "/products";
  const { data } = await client.get<RawProduct[]>(path, { params: categoryId ? undefined : { limit } });
  const list = categoryId ? data.slice(0, limit) : data;
  return list.filter((p) => p.title && p.images?.length).map(normalize);
}

export async function fetchProduct(id: number | string): Promise<StoreProduct> {
  const { data } = await client.get<RawProduct>(`/products/${id}`);
  return normalize(data);
}

export async function fetchCategories(): Promise<StoreCategory[]> {
  const { data } = await client.get<StoreCategory[]>("/categories", { params: { limit: 10 } });
  const seen = new Set<number>();
  return data.filter((c) => {
    if (seen.has(c.id) || !c.name) return false;
    seen.add(c.id);
    return true;
  });
}

// --- keyless fallback (used only if the demo API is unreachable) ---

export const FALLBACK_PRODUCTS: StoreProduct[] = [
  {
    id: 1,
    title: "Fjallraven Backpack",
    price: 109.95,
    description: "Your perfect pack for everyday use and walks in the forest. Stash your laptop, books, and everyday essentials.",
    images: ["https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg"],
    category: { id: 0, name: "bags", image: "" },
  },
  {
    id: 2,
    title: "Casual Premium Slim Fit T-Shirt",
    price: 22.3,
    description: "Slim-fitting style, contrast raglan long sleeve, three-button henley placket.",
    images: ["https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg"],
    category: { id: 0, name: "clothing", image: "" },
  },
  {
    id: 3,
    title: "WD 2TB Portable Hard Drive",
    price: 64,
    description: "USB 3.0 and USB 2.0 compatibility, automatic backup software.",
    images: ["https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_.jpg"],
    category: { id: 0, name: "electronics", image: "" },
  },
];
