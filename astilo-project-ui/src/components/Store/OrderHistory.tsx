import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { fetchMyOrders, type OrderStatus } from "../../lib/storeApi";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-500",
  paid: "bg-sky-500/15 text-sky-500",
  shipped: "bg-violet-500/15 text-violet-500",
  delivered: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-danger/15 text-danger",
};

const OrderHistory = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["store-my-orders"],
    queryFn: fetchMyOrders,
  });

  return (
    <section className="pb-16">
      <PageHeading eyebrow="✦ order history">
        My <span className="gradient-text">orders</span>
      </PageHeading>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading orders…" />
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-ink/60">No orders yet.</p>
          <Link to={AppRoute.store} className="mt-3 inline-block text-accent-2 underline">
            Start shopping →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`${AppRoute.storeOrders}/${order.id}/track`}
              className="glass-card flex flex-wrap items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5"
            >
              <div>
                <p className="text-sm font-semibold text-ink">Order #{order.id}</p>
                <p className="text-xs text-ink/50">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""} ·{" "}
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-ink">${order.total.toFixed(2)}</span>
                <Chip size="sm" className={`text-xs font-semibold capitalize ${STATUS_STYLE[order.status]}`}>
                  {order.status}
                </Chip>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default OrderHistory;
