import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { AppRoute } from "../../app/AppRoute";
import { fetchOrder } from "../../lib/storeApi";

const OrderConfirmation = () => {
  const { orderId = "" } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ["store-order", orderId],
    queryFn: () => fetchOrder(orderId),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading order…" />
      </div>
    );

  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <div className="glass-card p-10">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-r from-accent to-accent-2 text-3xl">
          ✓
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent-2">✦ order placed</p>
        <h1 className="section-heading text-ink">Thank you!</h1>
        <p className="mt-2 text-sm text-ink/60">
          Order <span className="font-semibold text-ink">#{orderId}</span> is confirmed.
        </p>

        {order && (
          <div className="mt-6 flex flex-col gap-2 text-left text-sm text-ink/70">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>
                  {i.productName} × {i.quantity}
                </span>
                <span>${(i.unitPrice * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-hair/20 pt-2 font-bold text-ink">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={`${AppRoute.storeOrders}/${orderId}/track`}>
            <Button
              radius="full"
              className="bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f] shadow-glow"
            >
              Track order
            </Button>
          </Link>
          <Link to={AppRoute.store}>
            <Button radius="full" variant="bordered" className="border-hair/40 font-semibold text-ink">
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OrderConfirmation;
