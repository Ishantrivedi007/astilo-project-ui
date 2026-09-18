import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Chip, Pagination } from "@heroui/react";
import { fetchUsers, type AdminUser } from "../../lib/adminApi";
import { avatarUrl } from "../../lib/avatar";
import { AppInput, GlassPanel } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";

/** Real accounts, decorated with a few deterministic display-only fields
 * (status/plan/spend) that the backend doesn't model — stable per user id
 * rather than random, so the table doesn't reshuffle on every render. */
interface DisplayRow {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: "Admin" | "User";
  status: "active" | "invited" | "suspended";
  plan: "Free" | "Pro" | "Team";
  spend: string;
  joined: string;
}

const STATUSES: DisplayRow["status"][] = ["active", "active", "active", "invited", "suspended"];
const PLANS: DisplayRow["plan"][] = ["Free", "Pro", "Team"];

const toDisplayRow = (u: AdminUser): DisplayRow => {
  const status = STATUSES[u.id % STATUSES.length];
  const plan = u.role === "admin" ? "Team" : PLANS[u.id % PLANS.length];
  const spend = status === "suspended" ? 35 : plan === "Team" ? 800 + (u.id * 137) % 1400 : plan === "Pro" ? 150 + (u.id * 53) % 700 : 0;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || avatarUrl(u.email, 96),
    role: u.role === "admin" ? "Admin" : "User",
    status,
    plan,
    spend: `$${spend.toLocaleString()}`,
    joined: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : "—",
  };
};

const statusColor: Record<DisplayRow["status"], "success" | "warning" | "danger"> = {
  active: "success",
  invited: "warning",
  suspended: "danger",
};

const roleColor: Record<DisplayRow["role"], "secondary" | "default"> = {
  Admin: "secondary",
  User: "default",
};

const col = createColumnHelper<DisplayRow>();

const columns = [
  col.accessor("name", {
    header: "User",
    cell: (c) => {
      const u = c.row.original;
      return (
        <div className="flex items-center gap-3">
          <img
            src={u.avatar}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-hair/30"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{u.name}</p>
            <p className="truncate text-xs text-ink/45">{u.email}</p>
          </div>
        </div>
      );
    },
  }),
  col.accessor("role", {
    header: "Role",
    cell: (c) => (
      <Chip size="sm" variant="flat" color={roleColor[c.getValue()]}>
        {c.getValue()}
      </Chip>
    ),
  }),
  col.accessor("status", {
    header: "Status",
    cell: (c) => (
      <Chip
        size="sm"
        variant="dot"
        color={statusColor[c.getValue()]}
        className="capitalize"
      >
        {c.getValue()}
      </Chip>
    ),
  }),
  col.accessor("plan", { header: "Plan" }),
  col.accessor("spend", {
    header: "Spend",
    sortingFn: (a, b) =>
      Number(a.original.spend.replace(/[^0-9.]/g, "")) -
      Number(b.original.spend.replace(/[^0-9.]/g, "")),
    cell: (c) => <span className="font-medium text-ink">{c.getValue()}</span>,
  }),
  col.accessor("joined", { header: "Joined" }),
];

const ROWS_PER_PAGE = 5;

const UsersTable = () => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: users, isLoading } = useQuery({ queryKey: ["dashboard-users"], queryFn: fetchUsers });
  const data = useMemo(() => (users ?? []).map(toDisplayRow), [users]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: ROWS_PER_PAGE } },
    globalFilterFn: "includesString",
  });

  const pageCount = table.getPageCount();

  return (
    <GlassPanel
      title="Team members"
      subtitle={`${table.getFilteredRowModel().rows.length} people`}
      action={
        <AppInput
          size="sm"
          placeholder="Search name or email…"
          value={globalFilter}
          onValueChange={setGlobalFilter}
          className="w-full max-w-[240px]"
        />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-hair/20">
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="select-none whitespace-nowrap py-2 pr-4 text-[11px] font-semibold uppercase tracking-widest text-ink/50 hover:text-ink/80"
                      role="button"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <span className="ml-1 text-accent">
                        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-hair/10 transition-colors hover:bg-ink/5"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-3 pr-4 text-ink/80">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center">
                  <AppLoader label="loading members…" />
                </td>
              </tr>
            )}
            {!isLoading && table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-ink/50">
                  No members match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex justify-end">
          <Pagination
            size="sm"
            showControls
            page={table.getState().pagination.pageIndex + 1}
            total={pageCount}
            onChange={(p) => table.setPageIndex(p - 1)}
            classNames={{ cursor: "bg-accent text-[#17131f]" }}
          />
        </div>
      )}
    </GlassPanel>
  );
};

export default UsersTable;
