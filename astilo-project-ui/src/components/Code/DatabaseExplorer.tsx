import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import { AlertCircle, ArrowLeft, Check, Columns3, Database, Eye, Play, Plug, Plus, Save, Table2, Trash2, X } from "lucide-react";
import Editor from "@monaco-editor/react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { useTheme } from "../../theme/ThemeProvider";
import {
  deleteSqlQuery,
  fetchDbColumns,
  fetchDbTables,
  fetchSavedQueries,
  runDbQuery,
  saveSqlQuery,
  updateSqlQuery,
  type DbColumn,
  type DbQueryResult,
  type DbTable,
} from "../../lib/codeApi";
import { extractApiErrorMessage } from "../../lib/apiError";
import "./Code.scss";

/** Connects to whatever connection string you give it — nothing is saved
 * server-side (see code_controller.py's DatabaseTablesController), so the
 * string only ever lives in this component's own state unless you keep it
 * in your password manager or wherever you copied it from. Saved SQL files
 * (name + SQL text only, never the connection string — see SavedSqlQuery's
 * docstring) let you keep multiple scripts around and switch between them.
 * Admin-only and off unless the backend has CODE_DATABASE_ENABLED=true. */
const DatabaseExplorer = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [connectionString, setConnectionString] = useState("");
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState<DbTable[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [mode, setMode] = useState<"query" | "structure">("query");
  const [activeTable, setActiveTable] = useState<DbTable | null>(null);

  const [openQueryIds, setOpenQueryIds] = useState<number[]>([]);
  const [activeQueryId, setActiveQueryId] = useState<number | null>(null);
  const [sql, setSql] = useState("SELECT 1;");
  const [dirty, setDirty] = useState(false);

  const [result, setResult] = useState<DbQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const savedQueriesQuery = useQuery({ queryKey: ["code", "sql-queries"], queryFn: fetchSavedQueries, enabled: connected });
  const openTabs = openQueryIds.map((id) => savedQueriesQuery.data?.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q);

  const connectMutation = useMutation({
    mutationFn: () => fetchDbTables(connectionString),
    onSuccess: (data) => {
      setTables(data.tables);
      setConnected(true);
      setConnectError(null);
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setDisabled(true);
        return;
      }
      setConnectError(extractApiErrorMessage(err, "Couldn't connect."));
      setConnected(false);
    },
  });

  const queryMutation = useMutation({
    mutationFn: (query: string) => runDbQuery(connectionString, query),
    onSuccess: (data) => {
      setResult(data);
      setQueryError(null);
    },
    onError: (err) => {
      setQueryError(extractApiErrorMessage(err, "Query failed."));
      setResult(null);
    },
  });

  const columnsQuery = useQuery({
    queryKey: ["code", "db-columns", connectionString, activeTable?.schema, activeTable?.name],
    queryFn: () => fetchDbColumns(connectionString, activeTable!.name, activeTable!.schema),
    enabled: mode === "structure" && !!activeTable,
  });

  const invalidateSaved = () => queryClient.invalidateQueries({ queryKey: ["code", "sql-queries"] });

  const createQueryMutation = useMutation({
    mutationFn: () => saveSqlQuery({ name: "untitled query", sql: "SELECT 1;" }),
    onSuccess: (q) => {
      invalidateSaved();
      openQuery(q.id, q.sql ?? "");
    },
  });

  const saveQueryMutation = useMutation({
    mutationFn: () => updateSqlQuery(activeQueryId!, { sql }),
    onSuccess: () => {
      invalidateSaved();
      setDirty(false);
      toast.success("Saved");
    },
  });

  const deleteQueryMutation = useMutation({
    mutationFn: (id: number) => deleteSqlQuery(id),
    onSuccess: (_, id) => {
      invalidateSaved();
      closeQuery(id);
    },
  });

  const openQuery = (id: number, queryText: string) => {
    setOpenQueryIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveQueryId(id);
    setSql(queryText);
    setDirty(false);
    setMode("query");
  };

  const closeQuery = (id: number) => {
    setOpenQueryIds((prev) => {
      const next = prev.filter((t) => t !== id);
      if (activeQueryId === id) {
        const fallback = next.length ? savedQueriesQuery.data?.find((q) => q.id === next[next.length - 1]) : null;
        setActiveQueryId(fallback?.id ?? null);
        setSql(fallback?.sql ?? "SELECT 1;");
        setDirty(false);
      }
      return next;
    });
  };

  const runSql = (query: string) => {
    setMode("query");
    queryMutation.mutate(query);
  };

  const openTableData = (table: DbTable) => {
    const q = `SELECT * FROM ${table.schema ? `${table.schema}.` : ""}${table.name} LIMIT 100;`;
    setSql(q);
    setActiveQueryId(null);
    setDirty(false);
    runSql(q);
  };

  const openTableStructure = (table: DbTable) => {
    setActiveTable(table);
    setMode("structure");
  };

  const statusPill = () => {
    if (queryMutation.isPending) {
      return (
        <span className="code-api-status-pill" style={{ background: "rgb(var(--accent-rgb) / 0.16)", color: "rgb(var(--accent-rgb))" }}>
          Running…
        </span>
      );
    }
    if (queryError) {
      return (
        <span className="code-api-status-pill code-api-status-err">
          <AlertCircle size={11} /> Error
        </span>
      );
    }
    if (result) {
      return (
        <span className="code-api-status-pill code-api-status-ok">
          <Check size={11} /> {result.rowCount} row{result.rowCount === 1 ? "" : "s"} · {result.durationMs}ms
          {result.truncated ? " · truncated" : ""}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="code-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.code)}>
        <ArrowLeft size={12} /> Code
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="code-eyebrow">Astilo Code</p>
          <h1 className="code-title" style={{ fontSize: "1.5rem" }}>
            <Database size={20} style={{ display: "inline", verticalAlign: "-3px", marginRight: 8 }} />
            Database
          </h1>
        </div>
      </div>

      {disabled && (
        <div className="code-disabled-banner">
          <Database size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Database Explorer is disabled on this server. Set CODE_DATABASE_ENABLED=true in the backend's .env to enable it.</span>
        </div>
      )}

      <div className="code-db-connect">
        <input
          className="code-api-url-input"
          style={{ minWidth: 320 }}
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          placeholder="postgresql://user:pass@host:5432/dbname  or  sqlite:///path/to/file.db"
          spellCheck={false}
        />
        <button
          type="button"
          className="nimrose-chip"
          onClick={() => connectMutation.mutate()}
          disabled={!connectionString.trim() || connectMutation.isPending}
        >
          <Plug size={12} /> {connectMutation.isPending ? "Connecting…" : "Connect"}
        </button>
      </div>

      {connectError && <p style={{ color: "#fb7185", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{connectError}</p>}

      {connected && (
        <div className="code-db-layout">
          <div className="glass-card p-3">
            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.4, marginBottom: "0.4rem" }}>
              Tables ({tables.length})
            </p>
            <div className="code-db-tables">
              {tables.map((t) => {
                const isActiveStructure = mode === "structure" && activeTable?.name === t.name && activeTable?.schema === t.schema;
                return (
                  <div key={`${t.schema ?? ""}.${t.name}`} style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <button
                      type="button"
                      className="code-db-table-item"
                      style={{ flex: 1, fontWeight: isActiveStructure ? 700 : 500 }}
                      onClick={() => openTableStructure(t)}
                      title="View structure"
                    >
                      <Table2 size={12} style={{ marginRight: 4, opacity: 0.5 }} />
                      {t.schema ? `${t.schema}.` : ""}
                      {t.name}
                    </button>
                    <button type="button" aria-label="Browse data" title="Browse data" onClick={() => openTableData(t)}>
                      <Eye size={12} style={{ opacity: 0.4 }} />
                    </button>
                  </div>
                );
              })}
              {tables.length === 0 && <p className="nimrose-widget-empty">No tables found.</p>}
            </div>

            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.4, margin: "0.9rem 0 0.4rem" }}>
              Saved queries
            </p>
            <div className="code-db-tables">
              {(savedQueriesQuery.data ?? []).map((q) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                  <button
                    type="button"
                    className="code-db-table-item"
                    style={{ flex: 1, fontWeight: activeQueryId === q.id ? 700 : 500 }}
                    onClick={() => openQuery(q.id, q.sql ?? "")}
                  >
                    {q.name}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete query"
                    onClick={async () => {
                      const ok = await confirm({ title: "Delete query?", message: `Delete "${q.name}"?`, confirmLabel: "Delete", danger: true });
                      if (ok) deleteQueryMutation.mutate(q.id);
                    }}
                  >
                    <Trash2 size={12} style={{ opacity: 0.4 }} />
                  </button>
                </div>
              ))}
              {(savedQueriesQuery.data ?? []).length === 0 && <p className="nimrose-widget-empty">None yet.</p>}
            </div>
            <button type="button" className="nimrose-chip" style={{ marginTop: "0.5rem" }} onClick={() => createQueryMutation.mutate()}>
              <Plus size={12} /> New query
            </button>
          </div>

          <div>
            {openTabs.length > 0 && (
              <div className="office-tab-strip">
                {openTabs.map((tab) => (
                  <div key={tab.id} className={`office-tab ${activeQueryId === tab.id ? "active" : ""}`} onClick={() => openQuery(tab.id, tab.sql ?? "")}>
                    <span className="truncate">
                      {tab.name}
                      {activeQueryId === tab.id && dirty ? " •" : ""}
                    </span>
                    <button
                      type="button"
                      aria-label={`Close ${tab.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeQuery(tab.id);
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mode === "structure" && activeTable ? (
              <div>
                <div className="nimrose-notes-editor-toolbar">
                  <p style={{ fontWeight: 700, flex: 1 }}>
                    <Columns3 size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
                    {activeTable.schema ? `${activeTable.schema}.` : ""}
                    {activeTable.name}
                  </p>
                  <button type="button" className="nimrose-chip" onClick={() => openTableData(activeTable)}>
                    <Eye size={12} /> Browse data
                  </button>
                  <button type="button" className="nimrose-chip" onClick={() => setMode("query")}>
                    <Play size={12} /> Back to query
                  </button>
                </div>
                <div className="code-db-results">
                  {columnsQuery.isLoading && <p className="nimrose-widget-empty">Loading…</p>}
                  {!columnsQuery.isLoading && (
                    <table className="code-db-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Type</th>
                          <th>Nullable</th>
                          <th>Key</th>
                          <th>Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(columnsQuery.data?.columns ?? []).map((c: DbColumn) => (
                          <tr key={c.name}>
                            <td style={{ fontWeight: 700 }}>{c.name}</td>
                            <td>{c.type}</td>
                            <td>{c.nullable ? "yes" : "no"}</td>
                            <td>{c.primaryKey ? "PK" : ""}</td>
                            <td style={{ opacity: 0.6 }}>{c.default ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <button type="button" className="nimrose-chip" onClick={() => runSql(sql)} disabled={queryMutation.isPending}>
                    <Play size={12} /> Run
                  </button>
                  <button
                    type="button"
                    className="nimrose-chip"
                    onClick={() => (activeQueryId ? saveQueryMutation.mutate() : createQueryMutation.mutate())}
                    disabled={saveQueryMutation.isPending}
                  >
                    <Save size={12} /> Save
                  </button>
                  {statusPill()}
                </div>

                <div className="code-api-body-editor" style={{ marginBottom: "0.75rem" }}>
                  <Editor
                    height="200px"
                    language="sql"
                    value={sql}
                    onChange={(v) => {
                      setSql(v ?? "");
                      setDirty(true);
                    }}
                    theme={theme.mode === "dark" ? "vs-dark" : "light"}
                    options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                  />
                </div>

                {queryError && <p style={{ color: "#fb7185", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{queryError}</p>}

                {result && result.columns.length > 0 && (
                  <div className="code-db-results">
                    <table className="code-db-table">
                      <thead>
                        <tr>
                          {result.columns.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>{cell === null ? <em style={{ opacity: 0.4 }}>null</em> : String(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseExplorer;
