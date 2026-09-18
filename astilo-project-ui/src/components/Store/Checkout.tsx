import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import { AppInput, PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { checkout, storeErrorMessage } from "../../lib/storeApi";
import { useProductStore } from "./useProductStore";

interface Address {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_ADDRESS: Address = { fullName: "", phone: "", line1: "", city: "", state: "", zip: "" };

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useProductStore();
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const navigate = useNavigate();
  const orderPlaced = useRef(false);

  const placeOrder = useMutation({
    mutationFn: () => checkout(cart.map((c) => ({ productId: c.productId, quantity: c.quantity }))),
    onSuccess: (order) => {
      orderPlaced.current = true;
      clearCart();
      toast.success(`Order #${order.id} placed — now complete your payment.`);
      navigate(`${AppRoute.storePayment}/${order.id}`, { replace: true });
    },
    onError: (err: unknown) => {
      toast.error(storeErrorMessage(err, "Couldn't place the order — please try again."));
    },
  });

  if (cart.length === 0 && !orderPlaced.current) return <Navigate to={AppRoute.storeCart} replace />;

  const set = (key: keyof Address) => (value: string) => setAddress((a) => ({ ...a, [key]: value }));

  const isValid = Object.values(address).every((v) => v.trim().length > 0);

  return (
    <section className="pb-16">
      <PageHeading eyebrow="✦ almost there">
        Delivery <span className="gradient-text">details</span>
      </PageHeading>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <form
          className="glass-card flex flex-col gap-4 p-5 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValid) {
              toast.error("Fill in every field so we know where to ship this.");
              return;
            }
            placeOrder.mutate();
          }}
        >
          <h2 className="font-display text-xl font-bold text-ink">Shipping address</h2>
          <AppInput label="Full name" value={address.fullName} onValueChange={set("fullName")} isRequired />
          <AppInput label="Phone number" value={address.phone} onValueChange={set("phone")} isRequired />
          <AppInput label="Address line" value={address.line1} onValueChange={set("line1")} isRequired />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AppInput label="City" value={address.city} onValueChange={set("city")} isRequired />
            <AppInput label="State" value={address.state} onValueChange={set("state")} isRequired />
            <AppInput label="ZIP / PIN" value={address.zip} onValueChange={set("zip")} isRequired />
          </div>
          <Button
            type="submit"
            radius="full"
            isDisabled={placeOrder.isPending}
            className="mt-2 self-start bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f] shadow-glow"
          >
            {placeOrder.isPending ? "Placing order…" : "Place order"}
          </Button>
        </form>

        <div className="glass-card h-fit p-5">
          <h2 className="mb-4 font-display text-xl font-bold text-ink">Order summary</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink/70">
            {cart.map((item) => (
              <li key={item.productId} className="flex justify-between gap-2">
                <span className="line-clamp-1">
                  {item.title} × {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-hair/20 pt-3 text-base font-bold text-ink">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <Link to={AppRoute.storeCart} className="mt-3 block text-center text-xs text-ink/50 hover:text-ink">
            ← Back to cart
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Checkout;
