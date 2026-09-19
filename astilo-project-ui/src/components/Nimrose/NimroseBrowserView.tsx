import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark as BookmarkIcon,
  Clock,
  ExternalLink,
  Plus,
  RotateCw,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  clearHistory,
  createBookmark,
  createBrowserSpace,
  createBrowserTab,
  deleteBookmark,
  deleteBrowserTab,
  fetchBookmarks,
  fetchBrowserSpaces,
  fetchBrowserTabs,
  fetchHistory,
  recordHistoryVisit,
  updateBrowserTab,
} from "../../lib/browserApi";
import { useNimrosePrompt } from "./NimrosePromptDialog";

const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Looks like a bare domain (no spaces, has a dot) — assume https.
  if (!trimmed.includes(" ") && /\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  // Otherwise treat it as a search query.
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
};

interface TabNav {
  stack: string[];
  index: number;
}

const LOAD_TIMEOUT_MS = 7000;

const NimroseBrowserView = () => {
  const queryClient = useQueryClient();
  const { prompt } = useNimrosePrompt();

  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [navByTab, setNavByTab] = useState<Record<number, TabNav>>({});
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "unknown">("loaded");
  const [sidePanel, setSidePanel] = useState<"none" | "bookmarks" | "history">("none");
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spacesQuery = useQuery({ queryKey: ["nimrose", "browser-spaces"], queryFn: fetchBrowserSpaces });
  const spaceId = activeSpaceId ?? spacesQuery.data?.[0]?.id ?? null;

  const tabsQuery = useQuery({
    queryKey: ["nimrose", "browser-tabs", spaceId],
    queryFn: () => fetchBrowserTabs(spaceId!),
    enabled: !!spaceId,
  });

  const tabId = activeTabId ?? tabsQuery.data?.[0]?.id ?? null;
  const activeTab = tabsQuery.data?.find((t) => t.id === tabId) ?? null;

  const bookmarksQuery = useQuery({
    queryKey: ["nimrose", "bookmarks", spaceId],
    queryFn: () => fetchBookmarks({ spaceId: spaceId ?? undefined }),
    enabled: sidePanel === "bookmarks",
  });
  const historyQuery = useQuery({
    queryKey: ["nimrose", "history"],
    queryFn: () => fetchHistory({ limit: 60 }),
    enabled: sidePanel === "history",
  });

  const invalidateTabs = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "browser-tabs"] });

  const createSpaceMutation = useMutation({
    mutationFn: createBrowserSpace,
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "browser-spaces"] });
      setActiveSpaceId(space.id);
    },
  });

  const createTabMutation = useMutation({
    mutationFn: ({ url, title }: { url: string; title?: string }) => createBrowserTab(spaceId!, url, title),
    onSuccess: (tab) => {
      invalidateTabs();
      setActiveTabId(tab.id);
      setAddressInput(tab.url);
      setNavByTab((prev) => ({ ...prev, [tab.id]: { stack: [tab.url], index: 0 } }));
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateBrowserTab>[2] }) =>
      updateBrowserTab(spaceId!, id, patch),
    onSuccess: invalidateTabs,
  });

  const closeTabMutation = useMutation({
    mutationFn: (id: number) => deleteBrowserTab(spaceId!, id),
    onSuccess: (_data, id) => {
      invalidateTabs();
      if (activeTabId === id) setActiveTabId(null);
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: createBookmark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "bookmarks"] }),
  });
  const removeBookmarkMutation = useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "bookmarks"] }),
  });
  const clearHistoryMutation = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nimrose", "history"] }),
  });

  // Keep the address bar and nav stack in sync whenever the active tab changes.
  useEffect(() => {
    if (!activeTab) return;
    setAddressInput(activeTab.url);
    setNavByTab((prev) => (prev[activeTab.id] ? prev : { ...prev, [activeTab.id]: { stack: [activeTab.url], index: 0 } }));
  }, [activeTab]);

  const currentNav = tabId ? navByTab[tabId] : undefined;
  const currentUrl = currentNav ? currentNav.stack[currentNav.index] : activeTab?.url ?? "";

  const navigateTo = (url: string, pushHistory = true) => {
    if (!tabId || !url) return;
    setNavByTab((prev) => {
      const nav = prev[tabId] ?? { stack: [], index: -1 };
      if (!pushHistory) return { ...prev, [tabId]: { ...nav, stack: [...nav.stack.slice(0, nav.index), url], index: nav.index } };
      const stack = [...nav.stack.slice(0, nav.index + 1), url];
      return { ...prev, [tabId]: { stack, index: stack.length - 1 } };
    });
    setAddressInput(url);
    updateTabMutation.mutate({ id: tabId, patch: { url } });
    recordHistoryVisit(url).catch(() => {});
    setLoadState("loading");
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => setLoadState("unknown"), LOAD_TIMEOUT_MS);
  };

  const goBack = () => {
    if (!tabId || !currentNav || currentNav.index <= 0) return;
    setNavByTab((prev) => ({ ...prev, [tabId]: { ...prev[tabId], index: prev[tabId].index - 1 } }));
  };
  const goForward = () => {
    if (!tabId || !currentNav || currentNav.index >= currentNav.stack.length - 1) return;
    setNavByTab((prev) => ({ ...prev, [tabId]: { ...prev[tabId], index: prev[tabId].index + 1 } }));
  };
  const reload = () => {
    if (!tabId) return;
    setLoadState("loading");
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => setLoadState("unknown"), LOAD_TIMEOUT_MS);
    setNavByTab((prev) => ({ ...prev }));
  };

  const submitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(normalizeUrl(addressInput));
  };

  const addTab = async () => {
    if (!spaceId) return;
    const url = await prompt({ title: "New tab", placeholder: "https://…", defaultValue: "https://" });
    if (url?.trim()) createTabMutation.mutate({ url: normalizeUrl(url) });
  };

  const isBookmarked = useMemo(
    () => !!bookmarksQuery.data?.some((b) => b.url === currentUrl),
    [bookmarksQuery.data, currentUrl]
  );

  useEffect(() => () => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  }, []);

  return (
    <div className="nimrose-browser">
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Browser</h1>
        </div>
      </div>

      <div className="nimrose-browser-spaces">
        {spacesQuery.data?.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`nimrose-chip ${spaceId === s.id ? "nimrose-chip--active" : ""}`}
            onClick={() => {
              setActiveSpaceId(s.id);
              setActiveTabId(null);
            }}
          >
            {s.name}
          </button>
        ))}
        <button
          type="button"
          className="nimrose-chip"
          onClick={async () => {
            const name = await prompt({ title: "New Space", placeholder: "e.g. Learning" });
            if (name?.trim()) createSpaceMutation.mutate(name.trim());
          }}
        >
          <Plus size={12} /> Space
        </button>
      </div>

      <div className="nimrose-browser-tabbar">
        {tabsQuery.data?.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`nimrose-browser-tab ${tabId === t.id ? "nimrose-browser-tab--active" : ""}`}
            onClick={() => setActiveTabId(t.id)}
          >
            <span>{t.title || t.url.replace(/^https?:\/\//, "").slice(0, 24)}</span>
            <X
              size={12}
              onClick={(e) => {
                e.stopPropagation();
                closeTabMutation.mutate(t.id);
              }}
            />
          </button>
        ))}
        <button type="button" className="nimrose-browser-tab nimrose-browser-tab--new" onClick={addTab} aria-label="New tab">
          <Plus size={14} />
        </button>
      </div>

      {!activeTab ? (
        <div className="nimrose-browser-viewport glass-card nimrose-browser-empty">
          <p className="nimrose-widget-empty">No tabs in this Space yet.</p>
          <button type="button" className="nimrose-chip" onClick={addTab}>
            <Plus size={12} /> New tab
          </button>
        </div>
      ) : (
        <>
          <div className="nimrose-browser-toolbar">
            <button type="button" className="nimrose-icon-btn" onClick={goBack} disabled={!currentNav || currentNav.index <= 0} aria-label="Back">
              <ArrowLeft size={15} />
            </button>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={goForward}
              disabled={!currentNav || currentNav.index >= currentNav.stack.length - 1}
              aria-label="Forward"
            >
              <ArrowRight size={15} />
            </button>
            <button type="button" className="nimrose-icon-btn" onClick={reload} aria-label="Reload">
              <RotateCw size={15} />
            </button>
            <form className="nimrose-browser-address-form" onSubmit={submitAddress}>
              <input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Search or enter address"
                aria-label="Address bar"
              />
            </form>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={() => {
                if (isBookmarked) {
                  const existing = bookmarksQuery.data?.find((b) => b.url === currentUrl);
                  if (existing) removeBookmarkMutation.mutate(existing.id);
                } else {
                  bookmarkMutation.mutate({ url: currentUrl, title: activeTab.title ?? undefined, spaceId: spaceId ?? undefined });
                }
              }}
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              <Star size={15} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={() => setSidePanel(sidePanel === "bookmarks" ? "none" : "bookmarks")}
              aria-label="Bookmarks"
            >
              <BookmarkIcon size={15} />
            </button>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={() => setSidePanel(sidePanel === "history" ? "none" : "history")}
              aria-label="History"
            >
              <Clock size={15} />
            </button>
          </div>

          <div className={`nimrose-browser-body ${sidePanel !== "none" ? "nimrose-browser-body--with-panel" : ""}`}>
            <div className="nimrose-browser-viewport glass-card">
              {currentUrl && (
                <iframe
                  key={currentUrl}
                  src={currentUrl}
                  title="Nimrose Browser"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  onLoad={() => {
                    setLoadState("loaded");
                    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
                  }}
                />
              )}
              {loadState === "unknown" && (
                <div className="nimrose-browser-blocked">
                  <p>
                    This site may not allow embedding (most major sites block it via
                    X-Frame-Options/CSP — a real browser limitation of embedding pages inside
                    another page, not a bug).
                  </p>
                  <a href={currentUrl} target="_blank" rel="noreferrer" className="nimrose-chip">
                    <ExternalLink size={12} /> Open in new tab
                  </a>
                  <button type="button" className="nimrose-chip" onClick={() => setLoadState("loaded")}>
                    It loaded fine
                  </button>
                </div>
              )}
            </div>

            {sidePanel !== "none" && (
              <div className="nimrose-browser-side-panel glass-card">
                {sidePanel === "bookmarks" && (
                  <>
                    <p className="nimrose-modal-section-title">
                      <BookmarkIcon size={13} /> Bookmarks
                    </p>
                    {bookmarksQuery.data?.length === 0 && <p className="nimrose-widget-empty">No bookmarks yet.</p>}
                    <ul className="nimrose-browser-list">
                      {bookmarksQuery.data?.map((b) => (
                        <li key={b.id}>
                          <button type="button" onClick={() => navigateTo(b.url)}>
                            {b.readLater && <Clock size={11} />}
                            <span>{b.title || b.url}</span>
                          </button>
                          <button type="button" onClick={() => removeBookmarkMutation.mutate(b.id)} aria-label="Remove">
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {sidePanel === "history" && (
                  <>
                    <div className="nimrose-modal-header">
                      <p className="nimrose-modal-section-title">
                        <Clock size={13} /> History
                      </p>
                      <button type="button" className="nimrose-widget-footnote" onClick={() => clearHistoryMutation.mutate()}>
                        Clear
                      </button>
                    </div>
                    {historyQuery.data?.length === 0 && <p className="nimrose-widget-empty">No history yet.</p>}
                    <ul className="nimrose-browser-list">
                      {historyQuery.data?.map((h) => (
                        <li key={h.id}>
                          <button type="button" onClick={() => navigateTo(h.url)}>
                            <span>{h.title || h.url}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NimroseBrowserView;
