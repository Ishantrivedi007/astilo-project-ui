import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Check, Plus, Save, Send, Trash2, X } from "lucide-react";
import Editor from "@monaco-editor/react";

import { AppRoute } from "../../app/AppRoute";
import { useTheme } from "../../theme/ThemeProvider";
import { useConfirm } from "../shared";
import { extractApiErrorMessage } from "../../lib/apiError";
import {
  deleteApiStudioRequest,
  fetchApiStudioRequests,
  saveApiStudioRequest,
  sendApiStudioRequest,
  type ApiStudioResponse,
} from "../../lib/codeApi";
import "./Code.scss";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];
type ReqTab = "params" | "auth" | "headers" | "body";
type RespTab = "pretty" | "raw" | "preview" | "headers";
type AuthType = "none" | "bearer" | "basic";

const headersToText = (headers: Record<string, string>) =>
  Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

const textToHeaders = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
};

/** JSON if the body parses as JSON, HTML if it looks like a document, XML
 * if it looks like a tag soup that isn't HTML, otherwise plain text —
 * content-type header wins when it says something definite. */
const detectFormat = (contentType: string | undefined, body: string): "json" | "html" | "xml" | "text" => {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("html")) return "html";
  if (ct.includes("xml")) return "xml";
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      /* not actually JSON, fall through */
    }
  }
  if (trimmed.startsWith("<")) return trimmed.toLowerCase().includes("<html") ? "html" : "xml";
  return "text";
};

const prettyPrint = (body: string, format: string): string => {
  if (format !== "json") return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

const ApiStudio = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://");
  const [reqTab, setReqTab] = useState<ReqTab>("params");
  const [headersText, setHeadersText] = useState("");
  const [body, setBody] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");

  const [respTab, setRespTab] = useState<RespTab>("pretty");
  const [response, setResponse] = useState<ApiStudioResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const savedQuery = useQuery({ queryKey: ["code", "api-studio", "requests"], queryFn: fetchApiStudioRequests });

  const parsedUrl = useMemo(() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }, [url]);
  const queryParams = parsedUrl ? Array.from(parsedUrl.searchParams.entries()) : [];

  const setQueryParams = (entries: [string, string][]) => {
    if (!parsedUrl) return;
    const next = new URL(parsedUrl.toString());
    next.search = "";
    entries.forEach(([k, v]) => {
      if (k) next.searchParams.append(k, v);
    });
    setUrl(next.toString());
  };

  const effectiveHeaders = (): Record<string, string> => {
    const headers = textToHeaders(headersText);
    if (authType === "bearer" && authToken.trim()) headers["Authorization"] = `Bearer ${authToken.trim()}`;
    if (authType === "basic" && authUser.trim()) headers["Authorization"] = `Basic ${btoa(`${authUser}:${authPass}`)}`;
    return headers;
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      sendApiStudioRequest({
        method,
        url,
        headers: effectiveHeaders(),
        body: method === "GET" || method === "HEAD" ? undefined : body,
      }),
    onSuccess: (data) => {
      setResponse(data);
      setErrorMessage(null);
      setRespTab("pretty");
    },
    onError: (err) => {
      setResponse(null);
      setErrorMessage(extractApiErrorMessage(err, "Request failed."));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => saveApiStudioRequest({ name: url, method, url, headers: effectiveHeaders(), body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["code", "api-studio", "requests"] });
      toast.success("Saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApiStudioRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["code", "api-studio", "requests"] });
      setSelectedId(null);
    },
  });

  const loadSaved = (id: number) => {
    const item = savedQuery.data?.find((r) => r.id === id);
    if (!item) return;
    setSelectedId(id);
    setMethod(item.method);
    setUrl(item.url);
    setHeadersText(headersToText(item.headers));
    setBody(item.body ?? "");
    setResponse(null);
    setErrorMessage(null);
    setAuthType("none");
  };

  const responseContentType = response?.headers["content-type"] ?? response?.headers["Content-Type"];
  const responseFormat = response ? detectFormat(responseContentType, response.body) : "text";
  const statusOk = response ? response.status < 400 : false;

  return (
    <div className="code-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.code)}>
        <ArrowLeft size={12} /> Code
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="code-eyebrow">Astilo Code</p>
          <h1 className="code-title" style={{ fontSize: "1.5rem" }}>
            <Send size={18} style={{ display: "inline", verticalAlign: "-3px", marginRight: 8 }} />
            API Studio
          </h1>
        </div>
        <button type="button" className="nimrose-chip" onClick={() => saveMutation.mutate()} disabled={!url.trim() || saveMutation.isPending}>
          <Save size={12} /> Save
        </button>
      </div>

      <div className="code-api-layout">
        <div className="glass-card p-3">
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.4, marginBottom: "0.4rem" }}>
            Saved requests
          </p>
          <div className="code-db-tables">
            {(savedQuery.data ?? []).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                <button
                  type="button"
                  className="code-db-table-item"
                  style={{ flex: 1, minWidth: 0, fontWeight: selectedId === r.id ? 700 : 500 }}
                  onClick={() => loadSaved(r.id)}
                >
                  <span style={{ opacity: 0.5, marginRight: 4 }}>{r.method}</span>
                  <span className="truncate">{r.name}</span>
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    const ok = await confirm({ title: "Delete request?", message: `Delete "${r.name}"?`, confirmLabel: "Delete", danger: true });
                    if (ok) deleteMutation.mutate(r.id);
                  }}
                >
                  <Trash2 size={12} style={{ opacity: 0.4 }} />
                </button>
              </div>
            ))}
            {(savedQuery.data ?? []).length === 0 && <p className="nimrose-widget-empty">Nothing saved yet.</p>}
          </div>
          <button
            type="button"
            className="nimrose-chip"
            style={{ marginTop: "0.6rem" }}
            onClick={() => {
              setSelectedId(null);
              setMethod("GET");
              setUrl("https://");
              setHeadersText("");
              setBody("");
              setResponse(null);
              setErrorMessage(null);
              setAuthType("none");
            }}
          >
            <Plus size={12} /> New request
          </button>
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="code-api-request-row">
            <select className="code-api-method-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="code-api-url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/resource"
              spellCheck={false}
            />
            <button type="button" className="nimrose-chip" onClick={() => sendMutation.mutate()} disabled={!url.trim() || sendMutation.isPending}>
              <Send size={12} /> {sendMutation.isPending ? "Sending…" : "Send"}
            </button>
          </div>

          <div className="code-api-tabs">
            {(["params", "auth", "headers", "body"] as ReqTab[]).map((t) => (
              <button key={t} type="button" className={`nimrose-chip ${reqTab === t ? "nimrose-chip--active" : ""}`} onClick={() => setReqTab(t)}>
                {t === "params" ? `Params${queryParams.length ? ` (${queryParams.length})` : ""}` : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {reqTab === "params" && (
            <div className="glass-card p-2" style={{ marginBottom: "1rem" }}>
              {!parsedUrl && <p className="nimrose-widget-empty">Enter a valid URL to edit its query params.</p>}
              {parsedUrl && queryParams.length === 0 && <p className="nimrose-widget-empty">No query params yet.</p>}
              {parsedUrl &&
                queryParams.map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.3rem" }}>
                    <input
                      className="code-api-url-input"
                      value={k}
                      onChange={(e) => {
                        const next = [...queryParams];
                        next[i] = [e.target.value, v];
                        setQueryParams(next);
                      }}
                      placeholder="key"
                    />
                    <input
                      className="code-api-url-input"
                      value={v}
                      onChange={(e) => {
                        const next = [...queryParams];
                        next[i] = [k, e.target.value];
                        setQueryParams(next);
                      }}
                      placeholder="value"
                    />
                    <button type="button" onClick={() => setQueryParams(queryParams.filter((_, idx) => idx !== i))} aria-label="Remove param">
                      <X size={14} style={{ opacity: 0.5 }} />
                    </button>
                  </div>
                ))}
              {parsedUrl && (
                <button type="button" className="nimrose-chip" onClick={() => setQueryParams([...queryParams, ["", ""]])}>
                  <Plus size={12} /> Add param
                </button>
              )}
            </div>
          )}

          {reqTab === "auth" && (
            <div className="glass-card p-3" style={{ marginBottom: "1rem" }}>
              <select className="office-code-lang-select" value={authType} onChange={(e) => setAuthType(e.target.value as AuthType)} style={{ marginBottom: "0.6rem" }}>
                <option value="none">No auth</option>
                <option value="bearer">Bearer token</option>
                <option value="basic">Basic auth</option>
              </select>
              {authType === "bearer" && (
                <input
                  className="code-api-url-input"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Token"
                  spellCheck={false}
                />
              )}
              {authType === "basic" && (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <input className="code-api-url-input" style={{ flex: 1 }} value={authUser} onChange={(e) => setAuthUser(e.target.value)} placeholder="Username" />
                  <input
                    className="code-api-url-input"
                    style={{ flex: 1 }}
                    type="password"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    placeholder="Password"
                  />
                </div>
              )}
              {authType === "none" && <p className="nimrose-widget-empty">No authorization header will be added.</p>}
            </div>
          )}

          {reqTab === "headers" && (
            <textarea
              className="code-api-body-editor"
              style={{
                width: "100%",
                height: 180,
                padding: "0.75rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.78rem",
                marginBottom: "1rem",
                background: "rgb(var(--surface-rgb) / 0.4)",
                color: "rgb(var(--ink-rgb))",
                resize: "vertical",
              }}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder={"Content-Type: application/json\nX-Custom-Header: value"}
              spellCheck={false}
            />
          )}

          {reqTab === "body" && (
            <div className="code-api-body-editor" style={{ marginBottom: "1rem" }}>
              <Editor
                height="180px"
                language="json"
                value={body}
                onChange={(v) => setBody(v ?? "")}
                theme={theme.mode === "dark" ? "vs-dark" : "light"}
                options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
              />
            </div>
          )}

          {errorMessage && (
            <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#fb7185", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
              <AlertCircle size={13} /> {errorMessage}
            </p>
          )}

          {response && (
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span className={`code-api-status-pill ${statusOk ? "code-api-status-ok" : "code-api-status-err"}`}>
                  {statusOk ? <Check size={11} /> : <AlertCircle size={11} />} {response.status} {response.statusText}
                </span>
                <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                  {response.durationMs}ms{response.truncated ? " · truncated" : ""}
                </span>

                <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto", flexWrap: "wrap" }}>
                  {(["pretty", "raw", "preview", "headers"] as RespTab[]).map((t) => {
                    if (t === "preview" && responseFormat !== "html") return null;
                    return (
                      <button key={t} type="button" className={`nimrose-chip ${respTab === t ? "nimrose-chip--active" : ""}`} onClick={() => setRespTab(t)}>
                        {t[0].toUpperCase() + t.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {respTab === "headers" ? (
                <div className="code-db-results">
                  <table className="code-db-table">
                    <thead>
                      <tr>
                        <th>Header</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(response.headers).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ fontWeight: 700 }}>{k}</td>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : respTab === "preview" ? (
                <div className="glass-card p-0" style={{ height: "360px", overflow: "hidden" }}>
                  <iframe
                    title="Response preview"
                    srcDoc={response.body}
                    sandbox="allow-scripts"
                    style={{ width: "100%", height: "100%", border: "none", background: "#fff", borderRadius: "0.9rem" }}
                  />
                </div>
              ) : (
                <div className="code-api-body-editor">
                  <Editor
                    height="360px"
                    language={responseFormat === "text" ? "plaintext" : responseFormat}
                    value={respTab === "pretty" ? prettyPrint(response.body, responseFormat) : response.body}
                    theme={theme.mode === "dark" ? "vs-dark" : "light"}
                    options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiStudio;
