import { Link, useNavigate } from "react-router-dom";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Button } from "@heroui/react";
import { PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { useProductStore } from "./useProductStore";

const SHIPPING_FLAT = 4.99;
const FREE_SHIPPING_THRESHOLD = 50;

const PLACEHOLDER_IMAGE = "https://placehold.co/200x200?text=%F0%9F%9B%8D%EF%B8%8F";

const Cart = () => {
  const { cart, setQuantity, removeFromCart, cartTotal } = useProductStore();
  const navigate = useNavigate();
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  const shipping = cart.length === 0 || cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = cartTotal + shipping;

  return (
    <section className="pb-16">
      <PageHeading eyebrow="✦ your basket">
        Shopping <span className="gradient-text">cart</span>
      </PageHeading>

      {cart.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-lg text-ink/60">Your cart is empty.</p>
          <Link to={AppRoute.store} className="mt-4 inline-block text-accent-2 underline">
            ← Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div ref={listRef} className="flex flex-col gap-3 lg:col-span-2">
            {cart.map((item) => (
              <div key={item.productId} className="glass-card flex items-center gap-4 p-3">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                  <img
                    src={item.image || PLACEHOLDER_IMAGE}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`${AppRoute.store}/${item.productId}`}
                    className="line-clamp-2 text-sm font-semibold text-ink hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-accent-2">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center rounded-full border border-hair/30">
                  <button
                    className="px-3 py-1.5 text-ink/60 hover:text-ink"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-ink">
                    {item.quantity}
                  </span>
                  <button
                    className="px-3 py-1.5 text-ink/60 hover:text-ink"
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="text-xs text-ink/30 hover:text-danger"
                  onClick={() => removeFromCart(item.productId)}
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="glass-card h-fit p-5">
            <h2 className="mb-4 font-display text-xl font-bold text-ink">Order summary</h2>
            <div className="flex justify-between text-sm text-ink/70">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-ink/70">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-hair/20 pt-3 text-base font-bold text-ink">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Button
              radius="full"
              className="mt-5 w-full bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f] shadow-glow"
              onPress={() => navigate(AppRoute.storeCheckout)}
            >
              Proceed to checkout
            </Button>
            <Link
              to={AppRoute.store}
              className="mt-3 block text-center text-xs text-ink/50 hover:text-ink"
            >
              ← Continue shopping
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default Cart;
