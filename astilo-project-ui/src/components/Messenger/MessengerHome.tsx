import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { useConfirm } from "../shared";
import {
  deleteDirectMessage,
  editDirectMessage,
  fetchContacts,
  fetchConversations,
  fetchDirectMessages,
  sendDirectMessage,
  startConversation,
  type DirectMessage,
} from "../../lib/messengerApi";
import "../Nimrose/Nimrose.scss";
import "./Messenger.scss";

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const formatTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");

const lastSeenLabel = (iso: string | null) => {
  if (!iso) return "Never signed in";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 2) return "Online just now";
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${new Date(iso).toLocaleDateString()}`;
};

const Avatar = ({ name, avatar, size = 38 }: { name: string; avatar?: string | null; size?: number }) =>
  avatar ? (
    <img src={avatar} alt={name} className="msgr-avatar" style={{ width: size, height: size }} />
  ) : (
    <span className="msgr-avatar" style={{ width: size, height: size }}>
      {initials(name)}
    </span>
  );

const MessengerHome = () => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"chats" | "contacts">("chats");
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({ queryKey: ["messenger", "conversations"], queryFn: fetchConversations, refetchInterval: 5000 });
  const contactsQuery = useQuery({ queryKey: ["messenger", "contacts"], queryFn: fetchContacts });

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
              (contactsQuery.data?.length === 0 ? (
                <p className="msgr-empty">No other Astilo users yet.</p>
              ) : (
                contactsQuery.data?.map((c) => (
                  <button key={c.id} type="button" className="msgr-list-item" onClick={() => startConvMutation.mutate(c.id)}>
                    <Avatar name={c.name} avatar={c.avatar} />
                    <span className="msgr-list-body">
                      <span className="msgr-list-name">{c.name}</span>
                      <span className="msgr-list-preview">{lastSeenLabel(c.lastSeen)}</span>
                    </span>
                  </button>
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
                <div>
                  <h2>{activeConv.name}</h2>
                  <p>{lastSeenLabel(contactsQuery.data?.find((c) => c.id === contactFor(activeConv)?.id)?.lastSeen ?? null)}</p>
                </div>
              </div>

              <div className="msgr-messages" ref={scrollRef}>
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
    </div>
  );
};

export default MessengerHome;
