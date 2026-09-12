import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store for the Store experience: a cart plus
 * per-product reviews/comments. No backend — the catalogue comes from a
 * public demo API (Platzi) whose ids don't exist in our own database, so
 * cart + reviews stay local, same pattern as the Movies watchlist/reviews.
 */

export interface CartItem {
  productId: number;
  title: string;
  image: string;
  price: number;
  quantity: number;
}

export interface ProductReview {
  id: string;
  productId: number;
  author: string;
  rating: number; // 1..5
  body: string;
  createdAt: number;
}

interface StoreShape {
  cart: CartItem[];
  reviews: ProductReview[];
}

const KEY = "astilo.store.v1";
const empty: StoreShape = { cart: [], reviews: [] };

const read = (): StoreShape => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
};

let cache: StoreShape = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const write = (next: StoreShape) => {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — keep in-memory */
  }
  emit();
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = read();
      emit();
    }
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => cache;

export function useProductStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const existing = cache.cart.find((c) => c.productId === item.productId);
    write({
      ...cache,
      cart: existing
        ? cache.cart.map((c) =>
            c.productId === item.productId ? { ...c, quantity: c.quantity + quantity } : c
          )
        : [...cache.cart, { ...item, quantity }],
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    write({ ...cache, cart: cache.cart.filter((c) => c.productId !== productId) });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      write({ ...cache, cart: cache.cart.filter((c) => c.productId !== productId) });
      return;
    }
    write({
      ...cache,
      cart: cache.cart.map((c) => (c.productId === productId ? { ...c, quantity } : c)),
    });
  }, []);

  const clearCart = useCallback(() => write({ ...cache, cart: [] }), []);

  const addReview = useCallback((r: Omit<ProductReview, "id" | "createdAt">) => {
    write({
      ...cache,
      reviews: [{ ...r, id: crypto.randomUUID(), createdAt: Date.now() }, ...cache.reviews],
    });
  }, []);

  const deleteReview = useCallback((id: string) => {
    write({ ...cache, reviews: cache.reviews.filter((r) => r.id !== id) });
  }, []);

  const reviewsFor = useCallback(
    (productId: number) =>
      state.reviews.filter((r) => r.productId === productId).sort((a, b) => b.createdAt - a.createdAt),
    [state.reviews]
  );

  const cartCount = state.cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = state.cart.reduce((sum, c) => sum + c.quantity * c.price, 0);

  return {
    cart: state.cart,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    setQuantity,
    clearCart,
    reviews: state.reviews,
    addReview,
    deleteReview,
    reviewsFor,
  };
}
