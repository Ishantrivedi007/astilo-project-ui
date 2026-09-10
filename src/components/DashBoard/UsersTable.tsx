import { useState } from "react";
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
import { Chip, Input, Pagination } from "@heroui/react";
import { USERS, type UserRow } from "./dashboardData";
import { GlassPanel } from "../shared";

const statusColor: Record<UserRow["status"], "success" | "warning" | "danger"> = {
  active: "success",
  invited: "warning",
  suspended: "danger",
};

const roleColor: Record<UserRow["role"], "secondary" | "primary" | "default"> = {
  Admin: "secondary",
  Editor: "primary",
  Viewer: "default",
};

const col = createColumnHelper<UserRow>();

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

  const table = useReactTable({
    data: USERS,
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
        <Input
          size="sm"
          variant="bordered"
          placeholder="Search name or email…"
          value={globalFilter}
          onValueChange={setGlobalFilter}
          className="w-full max-w-[240px]"
          classNames={{ inputWrapper: "border-hair/40 bg-transparent" }}
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
            {table.getRowModel().rows.length === 0 && (
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
