import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, MessageCircle, Palette, Pencil, QrCode, Send, Trash2, UserPlus, X } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { useConfirm } from "../shared";
import { useNimrosePrompt } from "../Nimrose/NimrosePromptDialog";
import {
  addMyContact,
  deleteDirectMessage,
  editDirectMessage,
  fetchConversations,
  fetchDirectMessages,
  fetchMyContacts,
  qrCodeUrl,
  removeMyContact,
  renameMyContact,
  sendDirectMessage,
  startConversation,
  type DirectMessage,
} from "../../lib/messengerApi";
import "../Nimrose/Nimrose.scss";
import "./Messenger.scss";

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const formatTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");

const Avatar = ({ name, avatar, size = 38 }: { name: string; avatar?: string | null; size?: number }) =>
  avatar ? (
    <img src={avatar} alt={name} className="msgr-avatar" style={{ width: size, height: size }} />
  ) : (
    <span className="msgr-avatar" style={{ width: size, height: size }}>
      {initials(name)}
    </span>
  );

const BACKGROUNDS: { id: string; label: string; css: string }[] = [
  { id: "default", label: "Default", css: "" },
  { id: "midnight", label: "Midnight", css: "linear-gradient(160deg, #0f1228, #1a1030)" },
  { id: "forest", label: "Forest", css: "linear-gradient(160deg, #0f2418, #0a3324)" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(160deg, #2b1420, #3a1a12)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(160deg, #0a1e2e, #0d2b3f)" },
];
const BG_KEY = "messenger-background";
const readBg = () => {
  try {
    return localStorage.getItem(BG_KEY) ?? "default";
  } catch {
    return "default";
  }
};

const MessengerHome = () => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { prompt } = useNimrosePrompt();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"chats" | "contacts">("chats");
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [addContactValue, setAddContactValue] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [bg, setBg] = useState(readBg);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({ queryKey: ["messenger", "conversations"], queryFn: fetchConversations, refetchInterval: 5000 });
  const myContactsQuery = useQuery({ queryKey: ["messenger", "my-contacts"], queryFn: fetchMyContacts });

  const conversations = conversationsQuery.data ?? [];
  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ["messenger", "messages", activeConvId],
    queryFn: () => fetchDirectMessages(activeConvId!),
    enabled: !!activeConvId,
    refetchInterval: 3000,
  });
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, activeConvId]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["messenger", "conversations"] });
    queryClient.invalidateQueries({ queryKey: ["messenger", "messages", activeConvId] });
  };

  const startConvMutation = useMutation({
    mutationFn: (userId: number) => startConversation(userId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["messenger", "conversations"] });
      setActiveConvId(res.id);
      setTab("chats");
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (lookup: string) => addMyContact(lookup),
    onSuccess: () => {
      setAddContactValue("");
      queryClient.invalidateQueries({ queryKey: ["messenger", "my-contacts"] });
    },
  });

  const renameContactMutation = useMutation({
    mutationFn: ({ id, nickname }: { id: number; nickname: string | null }) => renameMyContact(id, nickname),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messenger", "my-contacts"] }),
  });

  const removeContactMutation = useMutation({
    mutationFn: (id: number) => removeMyContact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messenger", "my-contacts"] }),
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendDirectMessage(activeConvId!, body),
    onSuccess: () => {
      setDraft("");
      invalidateAll();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => editDirectMessage(id, body),
    onSuccess: () => {
      setEditingId(null);
      invalidateAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDirectMessage(id),
    onSuccess: invalidateAll,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConvId) return;
    sendMutation.mutate(text);
  };

  const removeMessage = async (m: DirectMessage) => {
    const ok = await confirm({ title: "Delete message?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });
    if (ok) deleteMutation.mutate(m.id);
  };

  const contactFor = (conv: (typeof conversations)[number]) => conv.participants[0];
  const activeBg = BACKGROUNDS.find((b) => b.id === bg) ?? BACKGROUNDS[0];
  const myConnectCode = user?.email ? `astilo-connect:${user.email}` : "";

  return (
    <div className="msgr-page">
      <div className="nimrose-home-header" style={{ marginBottom: "0.5rem" }}>
        <div>
          <p className="nimrose-eyebrow">Astilo</p>
          <h1 className="nimrose-page-title">
            <MessageCircle size={22} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
            Messenger
          </h1>
        </div>
        <button type="button" className="nimrose-chip" onClick={() => setShowQr(true)}>
          <QrCode size={12} /> My QR code
        </button>
      </div>

      <div className="msgr-layout">
        <div className="msgr-sidebar">
          <div className="msgr-tabs">
            <button type="button" className={`msgr-tab ${tab === "chats" ? "active" : ""}`} onClick={() => setTab("chats")}>
              Chats
            </button>
            <button type="button" className={`msgr-tab ${tab === "contacts" ? "active" : ""}`} onClick={() => setTab("contacts")}>
              Contacts
            </button>
          </div>

          {tab === "contacts" && (
            <form
              className="msgr-add-contact"
              onSubmit={(e) => {
                e.preventDefault();
                if (addContactValue.trim()) addContactMutation.mutate(addContactValue.trim());
              }}
            >
              <input
                value={addContactValue}
                onChange={(e) => setAddContactValue(e.target.value)}
                placeholder="Email, phone, or QR code…"
                aria-label="Add contact by email or phone"
              />
              <button type="submit" className="nimrose-chip" disabled={addContactMutation.isPending}>
                <UserPlus size={12} />
              </button>
            </form>
          )}
          {addContactMutation.isError && <p className="msgr-empty" style={{ color: "#f87171", padding: "0 0.6rem" }}>No Astilo user found with that email or phone.</p>}

          <div className="msgr-list">
            {tab === "chats" &&
              (conversations.length === 0 ? (
                <p className="msgr-empty">No conversations yet — start one from Contacts.</p>
              ) : (
                conversations.map((c) => {
                  const other = contactFor(c);
                  return (
                    <button key={c.id} type="button" className={`msgr-list-item ${activeConvId === c.id ? "active" : ""}`} onClick={() => setActiveConvId(c.id)}>
                      <Avatar name={c.name} avatar={other?.avatar} />
                      <span className="msgr-list-body">
                        <span className="msgr-list-name">
                          {c.name}
                          {c.unreadCount > 0 && <span className="msgr-unread-badge">{c.unreadCount}</span>}
                        </span>
                        <span className="msgr-list-preview">{c.lastMessage ? c.lastMessage.body : "No messages yet"}</span>
                      </span>
                    </button>
                  );
                })
              ))}

            {tab === "contacts" &&
              (myContactsQuery.data?.length === 0 ? (
                <p className="msgr-empty">No contacts yet — add one by email, phone, or QR code above.</p>
              ) : (
                myContactsQuery.data?.map((c) => (
                  <div key={c.id} className="msgr-contact-row">
                    <button type="button" className="msgr-list-item" style={{ flex: 1 }} onClick={() => startConvMutation.mutate(c.contactId)}>
                      <Avatar name={c.name} avatar={c.avatar} />
                      <span className="msgr-list-body">
                        <span className="msgr-list-name">{c.name}</span>
                        <span className="msgr-list-preview">{c.email}</span>
                      </span>
                    </button>
                    <span className="msgr-contact-actions">
                      <button
                        type="button"
                        aria-label="Rename contact"
                        onClick={async () => {
                          const name = await prompt({ title: "Nickname", defaultValue: c.nickname ?? c.realName });
                          if (name !== null) renameContactMutation.mutate({ id: c.id, nickname: name.trim() || null });
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove contact"
                        onClick={async () => {
                          const ok = await confirm({ title: "Remove contact?", message: `Remove ${c.name} from your contacts?`, confirmLabel: "Remove", danger: true });
                          if (ok) removeContactMutation.mutate(c.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </div>
                ))
              ))}
          </div>
        </div>

        <div className="msgr-thread">
          {!activeConv ? (
            <p className="msgr-empty">Select a conversation, or start one from Contacts.</p>
          ) : (
            <>
              <div className="msgr-thread-header">
                <Avatar name={activeConv.name} avatar={contactFor(activeConv)?.avatar} size={34} />
                <div style={{ flex: 1 }}>
                  <h2>{activeConv.name}</h2>
                </div>
                <button type="button" className="nimrose-icon-btn" onClick={() => setShowThemes((s) => !s)} aria-label="Chat background">
                  <Palette size={15} />
                </button>
              </div>

              {showThemes && (
                <div className="msgr-theme-row">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`msgr-theme-swatch ${bg === b.id ? "active" : ""}`}
                      style={{ background: b.css || "rgba(15,18,40,0.6)" }}
                      title={b.label}
                      onClick={() => {
                        setBg(b.id);
                        try {
                          localStorage.setItem(BG_KEY, b.id);
                        } catch {
                          /* ignore */
                        }
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="msgr-messages" ref={scrollRef} style={activeBg.css ? { background: activeBg.css } : undefined}>
                {messages.length === 0 && <p className="msgr-empty">No messages yet. Say hello!</p>}
                {messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`msgr-bubble-row ${mine ? "mine" : ""}`}>
                      <div>
                        {editingId === m.id ? (
                          <input
                            value={editingText}
                            autoFocus
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editingText.trim()) editMutation.mutate({ id: m.id, body: editingText.trim() });
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => editingText.trim() && editMutation.mutate({ id: m.id, body: editingText.trim() })}
                            style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(127,176,255,0.4)", borderRadius: 8, padding: "0.4rem 0.6rem", color: "#fff" }}
                          />
                        ) : (
                          <div className="msgr-bubble">{m.body}</div>
                        )}
                        <div className="msgr-bubble-meta">
                          {formatTime(m.createdAt)}
                          {m.editedAt ? " · edited" : ""}
                          {mine && (m.readAt ? <CheckCheck size={12} color="#4ade80" /> : <Check size={12} />)}
                        </div>
                        {mine && editingId !== m.id && (
                          <div className="msgr-bubble-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(m.id);
                                setEditingText(m.body);
                              }}
                            >
                              <Pencil size={10} /> Edit
                            </button>
                            <button type="button" onClick={() => removeMessage(m)}>
                              <Trash2 size={10} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form className="msgr-composer" onSubmit={submit}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${activeConv.name}`} aria-label="Message" />
                <button type="submit" className="nimrose-chip" disabled={sendMutation.isPending || !draft.trim()}>
                  <Send size={13} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {showQr && (
        <div className="msgr-qr-overlay" onClick={() => setShowQr(false)}>
          <div className="msgr-qr-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="msgr-qr-close" onClick={() => setShowQr(false)} aria-label="Close">
              <X size={16} />
            </button>
            <h3>Your connect code</h3>
            <p>Others can add you by scanning this, or pasting the code below into "Add contact".</p>
            {myConnectCode && <img src={qrCodeUrl(myConnectCode)} alt="Your Astilo connect QR code" />}
            <code>{myConnectCode}</code>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessengerHome;
