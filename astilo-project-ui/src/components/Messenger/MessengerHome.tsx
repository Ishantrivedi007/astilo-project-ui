import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCheck,
  Contact,
  Download,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  Palette,
  Pencil,
  QrCode,
  Send,
  Smile,
  Sticker,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { useConfirm } from "../shared";
import { useNimrosePrompt } from "../Nimrose/NimrosePromptDialog";
import {
  addMyContact,
  attachmentFileUrl,
  deleteDirectMessage,
  editDirectMessage,
  fetchConversations,
  fetchDirectMessages,
  fetchMyContacts,
  qrCodeUrl,
  removeMyContact,
  renameMyContact,
  sendContactMessage,
  sendDirectMessage,
  sendAttachmentMessage,
  sendStickerMessage,
  startConversation,
  uploadMessageAttachment,
  type DirectMessage,
  type PersonalContact,
} from "../../lib/messengerApi";
import "../Nimrose/Nimrose.scss";
import "./Messenger.scss";

const EMOJI_GROUPS: { label: string; emoji: string[] }[] = [
  { label: "Smileys", emoji: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😜", "🤪", "😝", "🤑", "🤗", "🤔", "🤨", "😐", "😴", "😪", "🤤", "😷", "🤒", "🥵", "🥶", "😎", "🤓", "😡", "🥳"] },
  { label: "Gestures", emoji: ["👍", "👎", "👏", "🙌", "🙏", "🤝", "💪", "👋", "🤙", "✌️", "🤞", "👌", "🫶", "❤️", "🔥", "💯", "✅", "🎉", "🎂", "🥳"] },
  { label: "Objects", emoji: ["📎", "📷", "🎥", "📄", "📁", "📌", "💰", "⏰", "🔔", "🎁", "🚀", "⭐", "☀️", "🌙", "☕", "🍕", "🍔", "🍺"] },
];

const STICKERS = ["😂", "😭", "🥹", "😎", "🤩", "🥳", "😴", "🤯", "🫡", "🙈", "🫠", "🤡", "👻", "💀", "👽", "🐶", "🐱", "🦄", "🐸", "🍩", "🎈", "🌈", "⚡", "🔥", "💖", "✨", "🎯", "🏆"];

const fileSize = (bytes: number | null | undefined) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [bg, setBg] = useState(readBg);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    clearPendingFile();
    setShowEmoji(false);
    setDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

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

  const attachMutation = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const uploaded = await uploadMessageAttachment(file);
      return sendAttachmentMessage(activeConvId!, uploaded, caption);
    },
    onSuccess: () => {
      clearPendingFile();
      setDraft("");
      invalidateAll();
    },
  });

  const stickerMutation = useMutation({
    mutationFn: (emoji: string) => sendStickerMessage(activeConvId!, emoji),
    onSuccess: () => {
      setShowEmoji(false);
      invalidateAll();
    },
  });

  const contactShareMutation = useMutation({
    mutationFn: (contact: PersonalContact) =>
      sendContactMessage(activeConvId!, { userId: contact.contactId, name: contact.name, email: contact.email, avatar: contact.avatar }),
    onSuccess: () => {
      setShowContactPicker(false);
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

  const clearPendingFile = () => {
    setPendingFile(null);
    setPendingPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const pickFile = (file: File | null) => {
    if (!file || !activeConvId) return;
    clearPendingFile();
    setPendingFile(file);
    if (file.type.startsWith("image/")) setPendingPreview(URL.createObjectURL(file));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId) return;
    if (pendingFile) {
      attachMutation.mutate({ file: pendingFile, caption: draft.trim() });
      return;
    }
    const text = draft.trim();
    if (!text) return;
    sendMutation.mutate(text);
  };

  const insertEmoji = (emoji: string) => {
    setDraft((d) => d + emoji);
    draftInputRef.current?.focus();
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
                <button type="button" className="nimrose-icon-btn" onClick={() => setShowContactPicker(true)} aria-label="Share a contact">
                  <Contact size={15} />
                </button>
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
                      <div className="msgr-bubble-wrap">
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
                            style={{ width: "100%", background: "rgb(var(--ink-rgb) / 0.08)", border: "1px solid rgba(127,176,255,0.4)", borderRadius: 8, padding: "0.4rem 0.6rem", color: "rgb(var(--ink-rgb))" }}
                          />
                        ) : (
                          <div className={`msgr-bubble ${m.kind === "sticker" ? "msgr-bubble-sticker-shell" : ""}`}>
                            {m.kind === "sticker" ? (
                              <span className="msgr-bubble-sticker">{m.body}</span>
                            ) : m.kind === "image" && m.attachment ? (
                              <>
                                <img
                                  src={attachmentFileUrl(m.attachment)}
                                  alt={m.attachment.fileName}
                                  className="msgr-bubble-image"
                                  onClick={() => setLightbox(attachmentFileUrl(m.attachment!))}
                                />
                                {m.body && <div className="msgr-bubble-caption">{m.body}</div>}
                              </>
                            ) : m.kind === "file" && m.attachment ? (
                              <a href={attachmentFileUrl(m.attachment)} download={m.attachment.fileName} className="msgr-bubble-file">
                                <span className="msgr-file-icon">
                                  <FileIcon size={18} />
                                </span>
                                <span className="msgr-file-info">
                                  <strong>{m.attachment.fileName}</strong>
                                  <span>
                                    {fileSize(m.attachment.sizeBytes)} <Download size={10} style={{ display: "inline", verticalAlign: "-1px" }} />
                                  </span>
                                </span>
                              </a>
                            ) : m.kind === "contact" && m.contact ? (
                              <div className="msgr-bubble-contact">
                                <Avatar name={m.contact.name} avatar={m.contact.avatar} size={34} />
                                <span className="msgr-list-body">
                                  <strong>{m.contact.name}</strong>
                                  <span>{m.contact.email}</span>
                                </span>
                                {m.contact.userId !== user?.id && (
                                  <button type="button" onClick={() => startConvMutation.mutate(m.contact!.userId)}>
                                    Message
                                  </button>
                                )}
                              </div>
                            ) : (
                              m.body
                            )}
                          </div>
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

              {pendingFile && (
                <div className="msgr-attach-preview">
                  {pendingPreview ? (
                    <img src={pendingPreview} alt={pendingFile.name} />
                  ) : (
                    <span className="msgr-attach-file-icon">
                      <FileIcon size={18} />
                    </span>
                  )}
                  <span className="msgr-attach-info">
                    <strong>{pendingFile.name}</strong>
                    <span>{fileSize(pendingFile.size)}</span>
                  </span>
                  <button type="button" onClick={clearPendingFile} aria-label="Remove attachment">
                    <X size={16} />
                  </button>
                </div>
              )}

              <form className="msgr-composer" onSubmit={submit}>
                <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                <input
                  type="file"
                  accept="image/gif"
                  ref={gifInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.xlsx,.csv,.zip,.ppt,.pptx,application/pdf,application/msword,text/plain"
                  ref={docInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />

                <button
                  type="button"
                  className={`msgr-composer-btn ${showAttachMenu ? "active" : ""}`}
                  onClick={() => setShowAttachMenu((s) => !s)}
                  aria-label="Attach"
                >
                  <Paperclip size={16} />
                </button>

                {showAttachMenu && (
                  <div className="msgr-attach-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                    >
                      <span className="msgr-attach-menu-icon image">
                        <ImageIcon size={15} />
                      </span>
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        docInputRef.current?.click();
                      }}
                    >
                      <span className="msgr-attach-menu-icon doc">
                        <FileText size={15} />
                      </span>
                      Document
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowContactPicker(true);
                      }}
                    >
                      <span className="msgr-attach-menu-icon contact">
                        <Contact size={15} />
                      </span>
                      Contact
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className={`msgr-composer-btn ${showEmoji ? "active" : ""}`}
                  onClick={() => setShowEmoji((s) => !s)}
                  aria-label="Insert emoji, GIF, or sticker"
                >
                  <Smile size={16} />
                </button>

                {showEmoji && (
                  <div className="msgr-emoji-popover">
                    <div className="msgr-emoji-tabs">
                      <button type="button" className={emojiTab === "emoji" ? "active" : ""} onClick={() => setEmojiTab("emoji")}>
                        <Smile size={13} /> Emoji
                      </button>
                      <button type="button" className={emojiTab === "gif" ? "active" : ""} onClick={() => setEmojiTab("gif")}>
                        GIF
                      </button>
                      <button type="button" className={emojiTab === "sticker" ? "active" : ""} onClick={() => setEmojiTab("sticker")}>
                        <Sticker size={13} /> Stickers
                      </button>
                    </div>

                    {emojiTab === "emoji" &&
                      EMOJI_GROUPS.map((group) => (
                        <div key={group.label}>
                          <p className="msgr-emoji-cat">{group.label}</p>
                          <div className="msgr-emoji-grid">
                            {group.emoji.map((e) => (
                              <button key={e} type="button" className="msgr-emoji-btn" onClick={() => insertEmoji(e)}>
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                    {emojiTab === "gif" && (
                      <div className="msgr-emoji-empty">
                        <p>Pick a .gif file from your device — it sends and plays just like on WhatsApp.</p>
                        <button
                          type="button"
                          className="nimrose-chip"
                          onClick={() => {
                            setShowEmoji(false);
                            gifInputRef.current?.click();
                          }}
                        >
                          Choose a GIF
                        </button>
                      </div>
                    )}

                    {emojiTab === "sticker" && (
                      <div className="msgr-emoji-grid msgr-sticker-grid">
                        {STICKERS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="msgr-emoji-btn"
                            disabled={stickerMutation.isPending}
                            onClick={() => stickerMutation.mutate(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={draftInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={pendingFile ? "Add a caption…" : `Message ${activeConv.name}`}
                  aria-label="Message"
                />
                <button
                  type="submit"
                  className="nimrose-chip"
                  disabled={sendMutation.isPending || attachMutation.isPending || (!pendingFile && !draft.trim())}
                >
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

      {showContactPicker &&
        createPortal(
          <div className="msgr-qr-overlay" onClick={() => setShowContactPicker(false)}>
            <div className="msgr-picker-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="msgr-qr-close" onClick={() => setShowContactPicker(false)} aria-label="Close">
                <X size={16} />
              </button>
              <h3>Share a contact</h3>
              <div className="msgr-list">
                {(myContactsQuery.data ?? []).length === 0 ? (
                  <p className="msgr-empty">No contacts to share yet.</p>
                ) : (
                  myContactsQuery.data?.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="msgr-list-item"
                      disabled={contactShareMutation.isPending}
                      onClick={() => contactShareMutation.mutate(c)}
                    >
                      <Avatar name={c.name} avatar={c.avatar} />
                      <span className="msgr-list-body">
                        <span className="msgr-list-name">{c.name}</span>
                        <span className="msgr-list-preview">{c.email}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {lightbox &&
        createPortal(
          <div className="msgr-lightbox-overlay" onClick={() => setLightbox(null)}>
            <button type="button" className="msgr-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">
              <X size={18} />
            </button>
            <img src={lightbox} alt="Attachment" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}
    </div>
  );
};

export default MessengerHome;
