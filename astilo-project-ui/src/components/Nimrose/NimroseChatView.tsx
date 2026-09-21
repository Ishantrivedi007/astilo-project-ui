import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Hash, MessageCircle, Pencil, Plus, QrCode, Send, Trash2, UserPlus, Users, X } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { useConfirm } from "../shared";
import {
  createChatChannel,
  deleteChatChannel,
  deleteChatMessage,
  editChatMessage,
  fetchChatChannels,
  fetchChatMessages,
  sendChatMessage,
  updateChatChannel,
  type ChatMessage,
} from "../../lib/chatApi";
import {
  addMyContact,
  fetchMyContacts,
  qrCodeUrl,
  removeMyContact,
  renameMyContact,
  startConversation,
} from "../../lib/messengerApi";
import { useNimrosePrompt } from "./NimrosePromptDialog";
import "./Chat.scss";
import "../Messenger/Messenger.scss";

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const formatTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");

const NimroseChatView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { prompt } = useNimrosePrompt();
  const queryClient = useQueryClient();
  const [sidebarTab, setSidebarTab] = useState<"channels" | "contacts">("channels");
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [addContactValue, setAddContactValue] = useState("");
  const [showQr, setShowQr] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myContactsQuery = useQuery({ queryKey: ["messenger", "my-contacts"], queryFn: fetchMyContacts, enabled: sidebarTab === "contacts" });
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
  const messageContactMutation = useMutation({
    mutationFn: (userId: number) => startConversation(userId),
    onSuccess: () => navigate(AppRoute.messenger),
  });
  const myConnectCode = user?.email ? `astilo-connect:${user.email}` : "";

  const channelsQuery = useQuery({ queryKey: ["chat", "channels"], queryFn: fetchChatChannels });
  const channels = channelsQuery.data ?? [];
  const activeId = activeChannelId ?? channels[0]?.id ?? null;
  const activeChannel = channels.find((c) => c.id === activeId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", activeId],
    queryFn: () => fetchChatMessages(activeId!),
    enabled: !!activeId,
    refetchInterval: 3000,
  });
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, activeId]);

  const invalidateChannels = () => queryClient.invalidateQueries({ queryKey: ["chat", "channels"] });
  const invalidateMessages = () => queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeId] });

  const createChannelMutation = useMutation({
    mutationFn: (name: string) => createChatChannel(name),
    onSuccess: (channel) => {
      invalidateChannels();
      setActiveChannelId(channel.id);
    },
  });

  const renameChannelMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateChatChannel(id, { name }),
    onSuccess: invalidateChannels,
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id: number) => deleteChatChannel(id),
    onSuccess: () => {
      invalidateChannels();
      setActiveChannelId(null);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendChatMessage(activeId!, body),
    onSuccess: () => {
      setDraft("");
      invalidateMessages();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => editChatMessage(id, body),
    onSuccess: () => {
      setEditingId(null);
      invalidateMessages();
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id: number) => deleteChatMessage(id),
    onSuccess: invalidateMessages,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    sendMutation.mutate(text);
  };

  const removeMessage = async (m: ChatMessage) => {
    const ok = await confirm({ title: "Delete message?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });
    if (ok) deleteMessageMutation.mutate(m.id);
  };

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Chat</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {sidebarTab === "channels" && (
            <button
              type="button"
              className="nimrose-chip"
              onClick={async () => {
                const name = await prompt({ title: "New channel", placeholder: "e.g. project-x" });
                if (name?.trim()) createChannelMutation.mutate(name.trim());
              }}
            >
              <Plus size={12} /> Channel
            </button>
          )}
          {sidebarTab === "contacts" && (
            <button type="button" className="nimrose-chip" onClick={() => setShowQr(true)}>
              <QrCode size={12} /> My QR code
            </button>
          )}
        </div>
      </div>

      <div className="chat-layout">
        <div className="chat-channel-sidebar">
          <div className="chat-sidebar-tabs">
            <button type="button" className={sidebarTab === "channels" ? "active" : ""} onClick={() => setSidebarTab("channels")}>
              <Hash size={12} /> Channels
            </button>
            <button type="button" className={sidebarTab === "contacts" ? "active" : ""} onClick={() => setSidebarTab("contacts")}>
              <Users size={12} /> Contacts
            </button>
          </div>

          {sidebarTab === "contacts" && (
            <>
              <form
                className="chat-add-contact"
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
              {addContactMutation.isError && <p className="chat-empty" style={{ color: "#f87171", padding: "0 0.6rem" }}>No Astilo user found with that email or phone.</p>}

              {myContactsQuery.data?.length === 0 && <p className="chat-empty">No contacts yet — add one above.</p>}
              {myContactsQuery.data?.map((c) => (
                <div key={c.id} className="chat-contact-row">
                  <span className="chat-contact-avatar">{initials(c.name)}</span>
                  <span className="chat-contact-body">
                    <span className="name">{c.name}</span>
                    <span className="email">{c.email}</span>
                  </span>
                  <span className="chat-contact-actions">
                    <button type="button" aria-label="Message" onClick={() => messageContactMutation.mutate(c.contactId)}>
                      <MessageCircle size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Rename contact"
                      onClick={async () => {
                        const name = await prompt({ title: "Nickname", defaultValue: c.nickname ?? c.realName });
                        if (name !== null) renameContactMutation.mutate({ id: c.id, nickname: name.trim() || null });
                      }}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove contact"
                      onClick={async () => {
                        const ok = await confirm({ title: "Remove contact?", message: `Remove ${c.name} from your contacts?`, confirmLabel: "Remove", danger: true });
                        if (ok) removeContactMutation.mutate(c.id);
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </span>
                </div>
              ))}
            </>
          )}

          {sidebarTab === "channels" && channels.map((c) => (
            <div key={c.id} className={`chat-channel-item ${activeId === c.id ? "active" : ""}`} onClick={() => setActiveChannelId(c.id)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                <Hash size={13} /> {c.name}
              </span>
              <span className="chat-channel-actions">
                <button
                  type="button"
                  aria-label="Rename channel"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const name = await prompt({ title: "Rename channel", defaultValue: c.name });
                    if (name?.trim()) renameChannelMutation.mutate({ id: c.id, name: name.trim() });
                  }}
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  aria-label="Delete channel"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = await confirm({ title: "Delete channel?", message: `Delete #${c.name} and all its messages?`, confirmLabel: "Delete", danger: true });
                    if (ok) deleteChannelMutation.mutate(c.id);
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="chat-main">
          {!activeChannel ? (
            <p className="chat-empty">Create a channel to start chatting.</p>
          ) : (
            <>
              <div className="chat-main-header">
                <h2># {activeChannel.name}</h2>
                <p>Try /help, /wiki &lt;topic&gt;, /joke, or /time — Astilo Bot answers in-channel.</p>
              </div>

              <div className="chat-messages" ref={scrollRef}>
                {messages.length === 0 && <p className="chat-empty">No messages yet. Say hello, or try /help.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`chat-message ${m.isBot ? "bot" : ""}`}>
                    <span className="chat-message-avatar">{m.isBot ? <Bot size={15} /> : initials(m.authorName)}</span>
                    <div className="chat-message-body">
                      <div className="chat-message-head">
                        <span className="name">{m.authorName}</span>
                        {m.isBot && <span className="bot-badge">BOT</span>}
                        <span className="time">
                          {formatTime(m.createdAt)}
                          {m.editedAt ? " (edited)" : ""}
                        </span>
                      </div>
                      {editingId === m.id ? (
                        <input
                          className="chat-message-edit-input"
                          value={editingText}
                          autoFocus
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingText.trim()) editMutation.mutate({ id: m.id, body: editingText.trim() });
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => editingText.trim() && editMutation.mutate({ id: m.id, body: editingText.trim() })}
                          style={{ width: "100%", background: "transparent", border: "1px solid rgba(127,176,255,0.4)", borderRadius: 6, padding: "0.2rem 0.4rem", color: "inherit" }}
                        />
                      ) : (
                        <p className="chat-message-text">{m.body}</p>
                      )}
                      {!m.isBot && m.authorName === user?.name && editingId !== m.id && (
                        <span className="chat-message-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(m.id);
                              setEditingText(m.body);
                            }}
                          >
                            Edit
                          </button>
                          <button type="button" onClick={() => removeMessage(m)}>
                            Delete
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form className="chat-composer" onSubmit={submit}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  aria-label="Message"
                />
                <button type="submit" className="nimrose-chip" disabled={sendMutation.isPending || !draft.trim()}>
                  <Send size={13} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {showQr &&
        createPortal(
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default NimroseChatView;
