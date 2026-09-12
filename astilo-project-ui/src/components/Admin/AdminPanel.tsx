import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, Tab, Button, Chip } from "@heroui/react";
import { PageHeading, GlassPanel, StatCard, Chart, BarList, AppInput, AppTextarea } from "../shared";
import DashBoard from "../DashBoard/Dashboard";
import { useAuth } from "../../auth/AuthProvider";
import { avatarUrl } from "../../lib/avatar";
import {
  fetchUsers,
  updateUserRole,
  deleteUser,
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAllOrders,
  type AdminUser,
  type AdminProduct,
  type AdminOrder,
  type ProductInput,
} from "../../lib/adminApi";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
const usd = (n: number) => `$${Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;

/** Bucket ISO timestamps by day, returning a running (cumulative) count per day. */
const cumulativeByDay = (dates: (string | null)[]) => {
  const days = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 10))
    .sort();
  const counts = new Map<string, number>();
  days.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1));
  let running = 0;
  const labels: string[] = [];
  const values: number[] = [];
  [...counts.entries()].forEach(([day, count]) => {
    running += count;
    labels.push(day);
    values.push(running);
  });
  return { labels, values };
};

/** Sum a numeric field per day (not cumulative) — for revenue-per-day. */
const sumByDay = (rows: { date: string | null; amount: number }[]) => {
  const totals = new Map<string, number>();
  rows.forEach(({ date, amount }) => {
    if (!date) return;
    const day = date.slice(0, 10);
    totals.set(day, (totals.get(day) ?? 0) + amount);
  });
  const labels = [...totals.keys()].sort();
  return { labels, values: labels.map((d) => totals.get(d)!) };
};

// ---------------------------------------------------------------------------

const UsersTab = () => {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "user" | "admin" }) => updateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Couldn't update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User removed");
    },
    onError: () => toast.error("Couldn't remove user"),
  });

  return (
    <GlassPanel title="Users" subtitle={users ? `${users.length} accounts` : undefined}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hair/20 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Joined</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u: AdminUser) => (
              <tr key={u.id} className="border-b border-hair/10 hover:bg-ink/5">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl(u.email)}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full bg-ink/10 ring-2 ring-hair/20"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{u.name}</p>
                      <p className="truncate text-xs text-ink/45">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Chip size="sm" variant="flat" color={u.role === "admin" ? "secondary" : "default"}>
                    {u.role}
                  </Chip>
                </td>
                <td className="py-3 pr-4 text-ink/60">{fmtDate(u.createdAt)}</td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="bordered"
                      className="border-hair/40"
                      isDisabled={u.id === me?.id || roleMutation.isPending}
                      onPress={() =>
                        roleMutation.mutate({ id: u.id, role: u.role === "admin" ? "user" : "admin" })
                      }
                    >
                      {u.role === "admin" ? "Demote" : "Promote"}
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      isDisabled={u.id === me?.id || deleteMutation.isPending}
                      onPress={() => deleteMutation.mutate(u.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (users ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-ink/50">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

const emptyProduct: ProductInput = { name: "", description: "", price: 0, imageUrl: "", category: "", stock: 0 };

const ProductsTab = () => {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: fetchAdminProducts });
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyProduct);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidate();
      toast.success("Product created");
      setEditingId(null);
    },
    onError: () => toast.error("Couldn't create product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ProductInput> }) => updateProduct(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("Product updated");
      setEditingId(null);
    },
    onError: () => toast.error("Couldn't update product"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      invalidate();
      toast.success("Product deleted");
    },
    onError: () => toast.error("Couldn't delete product"),
  });

  const startEdit = (p?: AdminProduct) => {
    if (p) {
      setForm({
        name: p.name,
        description: p.description ?? "",
        price: p.price,
        imageUrl: p.imageUrl ?? "",
        category: p.category ?? "",
        stock: p.stock,
      });
      setEditingId(p.id);
    } else {
      setForm(emptyProduct);
      setEditingId("new");
    }
  };

  const submit = () => {
    if (!form.name.trim() || form.price <= 0) {
      toast.error("Name and a positive price are required.");
      return;
    }
    if (editingId === "new") createMutation.mutate(form);
    else if (typeof editingId === "number") updateMutation.mutate({ id: editingId, input: form });
  };

  return (
    <GlassPanel
      title="Products"
      subtitle={products ? `${products.length} in your catalogue` : undefined}
      action={
        <Button size="sm" radius="full" className="bg-ink/10 font-semibold text-ink" onPress={() => startEdit()}>
          + New product
        </Button>
      }
    >
      {editingId !== null && (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-hair/20 p-4 sm:grid-cols-2">
          <AppInput
            label="Name"
            placeholder="Product name"
            value={form.name}
            onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <AppInput
            label="Category"
            placeholder="e.g. Audio"
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
          />
          <AppInput
            type="number"
            label="Price"
            placeholder="0.00"
            value={String(form.price)}
            onValueChange={(v) => setForm((f) => ({ ...f, price: Number(v) || 0 }))}
          />
          <AppInput
            type="number"
            label="Stock"
            placeholder="0"
            value={String(form.stock)}
            onValueChange={(v) => setForm((f) => ({ ...f, stock: Number(v) || 0 }))}
          />
          <AppInput
            label="Image URL"
            placeholder="https://…"
            value={form.imageUrl}
            onValueChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
            className="sm:col-span-2"
          />
          <AppTextarea
            label="Description"
            placeholder="What makes this product great?"
            value={form.description}
            onValueChange={(v) => setForm((f) => ({ ...f, description: v }))}
            className="sm:col-span-2"
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button
              radius="full"
              className="bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f]"
              isDisabled={createMutation.isPending || updateMutation.isPending}
              onPress={submit}
            >
              {editingId === "new" ? "Create" : "Save changes"}
            </Button>
            <Button radius="full" variant="light" onPress={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hair/20 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-b border-hair/10 hover:bg-ink/5">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink/10 text-xs">🛍️</span>
                    )}
                    <span className="font-semibold text-ink">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-ink/60">{p.category || "—"}</td>
                <td className="py-3 pr-4 font-semibold text-ink">${p.price.toFixed(2)}</td>
                <td className="py-3 pr-4 text-ink/60">{p.stock}</td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="bordered" className="border-hair/40" onPress={() => startEdit(p)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      isDisabled={deleteMutation.isPending}
                      onPress={() => deleteMutation.mutate(p.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (products ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink/50">
                  No products in your own catalogue yet — the public Store page browses a separate demo
                  API, so anything you add here won&apos;t show there until that's wired together.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

const OrdersTab = () => {
  const { data: orders, isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: fetchAllOrders });

  return (
    <GlassPanel title="Orders" subtitle={orders ? `${orders.length} placed` : undefined}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hair/20 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-hair/10 hover:bg-ink/5">
                <td className="py-3 pr-4 font-semibold text-ink">#{o.id}</td>
                <td className="py-3 pr-4 text-ink/70">{o.userEmail || `user #${o.userId}`}</td>
                <td className="py-3 pr-4 text-ink/60">{o.items.length}</td>
                <td className="py-3 pr-4 font-semibold text-ink">${o.total.toFixed(2)}</td>
                <td className="py-3 pr-4">
                  <Chip size="sm" variant="flat">
                    {o.status}
                  </Chip>
                </td>
                <td className="py-3 pr-4 text-ink/60">{fmtDate(o.createdAt)}</td>
              </tr>
            ))}
            {!isLoading && (orders ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/50">
                  No orders yet — remember, checkout only persists here for orders placed against your
                  own product catalogue, not the public demo Store.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
};

// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  paid: "#22c55e",
  shipped: "#3b82f6",
  cancelled: "#ef4444",
};

const OverviewTab = ({
  users,
  products,
  orders,
}: {
  users: AdminUser[];
  products: AdminProduct[];
  orders: AdminOrder[];
}) => {
  const signupGrowth = useMemo(() => cumulativeByDay(users.map((u) => u.createdAt)), [users]);

  const revenueByDay = useMemo(
    () => sumByDay(orders.map((o) => ({ date: o.createdAt, amount: o.total }))),
    [orders]
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    return [...counts.entries()];
  }, [orders]);

  const categoryStock = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const key = p.category || "Uncategorised";
      counts.set(key, (counts.get(key) ?? 0) + p.stock);
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const recentUsers = useMemo(
    () => [...users].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 8),
    [users]
  );

  return (
    <div className="flex flex-col gap-6">
      {recentUsers.length > 0 && (
        <GlassPanel title="Newest members" subtitle="Most recent signups">
          <div className="flex flex-wrap gap-4">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex flex-col items-center gap-1.5 text-center">
                <img
                  src={avatarUrl(u.email, 96)}
                  alt=""
                  className="h-14 w-14 rounded-full bg-ink/10 ring-2 ring-hair/25"
                />
                <p className="max-w-[72px] truncate text-xs font-semibold text-ink">
                  {u.name.split(" ")[0]}
                </p>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel title="User growth" subtitle="Cumulative signups" className="lg:col-span-2">
          {signupGrowth.labels.length > 0 ? (
            <Chart
              type="area"
              height={260}
              series={[{ name: "Users", data: signupGrowth.values }]}
              options={{ xaxis: { categories: signupGrowth.labels } }}
            />
          ) : (
            <p className="py-16 text-center text-sm text-ink/50">Not enough data yet.</p>
          )}
        </GlassPanel>

        <GlassPanel title="Orders by status">
          {statusCounts.length > 0 ? (
            <>
              <Chart
                type="donut"
                height={220}
                series={statusCounts.map(([, count]) => count)}
                options={{
                  labels: statusCounts.map(([status]) => status),
                  colors: statusCounts.map(([status]) => STATUS_COLORS[status] ?? "#94a3b8"),
                  legend: { position: "bottom" },
                  stroke: { width: 0 },
                  plotOptions: { pie: { donut: { size: "68%" } } },
                }}
              />
            </>
          ) : (
            <p className="py-16 text-center text-sm text-ink/50">No orders yet.</p>
          )}
        </GlassPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel title="Revenue" subtitle="By day">
          {revenueByDay.labels.length > 0 ? (
            <Chart
              type="bar"
              height={260}
              series={[{ name: "Revenue", data: revenueByDay.values }]}
              options={{
                xaxis: { categories: revenueByDay.labels },
                plotOptions: { bar: { columnWidth: "45%", borderRadius: 6 } },
                fill: { type: "solid", opacity: 0.9 },
                stroke: { width: 0 },
                tooltip: { y: { formatter: (v: number) => usd(v) } },
              }}
            />
          ) : (
            <p className="py-16 text-center text-sm text-ink/50">No revenue yet.</p>
          )}
        </GlassPanel>

        <GlassPanel title="Stock by category">
          {categoryStock.length > 0 ? (
            <BarList data={categoryStock} valueFormatter={(n) => `${n} units`} />
          ) : (
            <p className="py-16 text-center text-sm text-ink/50">No products yet.</p>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const AdminPanel = () => {
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const { data: products } = useQuery({ queryKey: ["admin-products"], queryFn: fetchAdminProducts });
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: fetchAllOrders });

  const revenue = (orders ?? []).reduce((s, o) => s + o.total, 0);
  const admins = (users ?? []).filter((u) => u.role === "admin").length;
  const signupSpark = useMemo(
    () => cumulativeByDay((users ?? []).map((u) => u.createdAt)).values,
    [users]
  );
  const revenueSpark = useMemo(
    () => sumByDay((orders ?? []).map((o) => ({ date: o.createdAt, amount: o.total }))).values,
    [orders]
  );

  return (
    <div className="pb-16">
      <PageHeading eyebrow="✦ behind the scenes">
        Admin <span className="gradient-text">panel</span>
      </PageHeading>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={String(users?.length ?? 0)} spark={signupSpark} />
        <StatCard label="Admins" value={String(admins)} />
        <StatCard label="Products" value={String(products?.length ?? 0)} />
        <StatCard label="Revenue" value={usd(revenue)} spark={revenueSpark} />
      </div>

      <Tabs
        aria-label="Admin sections"
        variant="underlined"
        defaultSelectedKey="dashboard"
        classNames={{ tabList: "gap-6", cursor: "bg-accent" }}
      >
        <Tab key="dashboard" title="Dashboard">
          <div className="mt-4">
            <DashBoard />
          </div>
        </Tab>
        <Tab key="overview" title="Overview">
          <div className="mt-4">
            <OverviewTab users={users ?? []} products={products ?? []} orders={orders ?? []} />
          </div>
        </Tab>
        <Tab key="users" title="Users">
          <div className="mt-4">
            <UsersTab />
          </div>
        </Tab>
        <Tab key="products" title="Products">
          <div className="mt-4">
            <ProductsTab />
          </div>
        </Tab>
        <Tab key="orders" title="Orders">
          <div className="mt-4">
            <OrdersTab />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
