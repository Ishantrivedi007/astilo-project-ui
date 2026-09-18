import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { cancelOrder, fetchOrder, storeErrorMessage, type Order } from "../../lib/storeApi";

const STEPS: { key: keyof Order | "createdAt"; label: string; icon: string }[] = [
  { key: "createdAt", label: "Placed", icon: "🧾" },
  { key: "paidAt", label: "Paid", icon: "💳" },
  { key: "shippedAt", label: "Shipped", icon: "📦" },
  { key: "deliveredAt", label: "Delivered", icon: "🏠" },
];

const OrderTracking = () => {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["store-order", orderId],
    queryFn: () => fetchOrder(orderId),
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: () => {
      toast.success("Order cancelled.");
      queryClient.invalidateQueries({ queryKey: ["store-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["store-my-orders"] });
    },
    onError: (err: unknown) => toast.error(storeErrorMessage(err, "Couldn't cancel this order.")),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading order…" />
      </div>
    );

  if (!order)
    return (
      <div className="py-32 text-center">
        <p className="text-ink/60">Couldn't find this order.</p>
        <Link to={AppRoute.storeOrders} className="mt-3 inline-block text-accent-2 underline">
          ← My orders
        </Link>
      </div>
    );

  const isCancelled = order.status === "cancelled";
  const activeStepIndex = isCancelled
    ? -1
    : STEPS.reduce((idx, step, i) => (order[step.key as keyof Order] ? i : idx), 0);
  const canCancel = order.status === "pending" || order.status === "paid";

  // Circles sit at the centre of equal grid columns, so the connecting line only
  // needs to span between the first and last circle's centres, not edge to edge.
  const halfCol = 100 / (2 * STEPS.length);
  const spanWidth = 100 - 2 * halfCol;
  const progressPercent = activeStepIndex <= 0 ? 0 : (activeStepIndex / (STEPS.length - 1)) * spanWidth;

  return (
    <section className="pb-16">
      <Link
        to={AppRoute.storeOrders}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
      >
        ← My orders
      </Link>
      <PageHeading eyebrow="✦ tracking">
        Order <span className="gradient-text">#{order.id}</span>
      </PageHeading>

      {isCancelled ? (
        <div className="glass-card p-6 text-center">
          <p className="text-lg font-semibold text-danger">This order was cancelled.</p>
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="relative">
            {/* base line, spanning from the first step's circle centre to the last's */}
            <div
              className="absolute top-5 h-0.5 bg-hair/30"
              style={{ left: `${halfCol}%`, right: `${halfCol}%` }}
            />
            {/* progress overlay */}
            <div
              className="absolute top-5 h-0.5 bg-accent transition-all"
              style={{ left: `${halfCol}%`, width: `${progressPercent}%` }}
            />
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center text-center">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${
                      i <= activeStepIndex
                        ? "bg-gradient-to-r from-accent to-accent-2 text-[#17131f]"
                        : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      i <= activeStepIndex ? "text-ink" : "text-ink/40"
                    }`}
                  >
                    {step.label}
                  </p>
                  {order[step.key as keyof Order] && (
                    <p className="text-[10px] text-ink/40">
                      {new Date(order[step.key as keyof Order] as string).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="glass-card mt-6 p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Items</h2>
        <div className="flex flex-col gap-2 text-sm text-ink/70">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between">
              <span>
                {i.productName} × {i.quantity}
              </span>
              <span>${(i.unitPrice * i.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-hair/20 pt-3 text-base font-bold text-ink">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>

      {canCancel && (
        <Button
          radius="full"
          variant="bordered"
          className="mt-6 border-danger/40 font-semibold text-danger"
          isDisabled={cancel.isPending}
          onPress={() => cancel.mutate()}
        >
          {cancel.isPending ? "Cancelling…" : "Cancel order"}
        </Button>
      )}
    </section>
  );
};

export default OrderTracking;
