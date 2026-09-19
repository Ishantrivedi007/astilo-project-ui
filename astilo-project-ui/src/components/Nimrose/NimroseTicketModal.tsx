import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File as FileIcon, Link2, Paperclip, Send, Trash2, X } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { useConfirm } from "../shared";
import {
  addTicketComment,
  addTicketLink,
  attachmentFileUrl,
  deleteTicket,
  deleteTicketAttachment,
  fetchBoardColumns,
  fetchTicketActivity,
  fetchTicketComments,
  fetchTicket,
  fetchTickets,
  removeTicketLink,
  updateTicket,
  uploadTicketAttachment,
  type TicketLinkRelation,
  type TicketPriority,
  type TicketType,
} from "../../lib/kanbanApi";

const TYPES: TicketType[] = ["feature", "bug", "task", "improvement", "research", "design", "documentation"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];
const RELATIONS: TicketLinkRelation[] = ["blocks", "blocked_by", "depends_on", "related_to", "duplicate", "parent", "child"];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RELATION_LABEL: Record<TicketLinkRelation, string> = {
  blocks: "Blocks",
  blocked_by: "Blocked by",
  depends_on: "Depends on",
  related_to: "Related to",
  duplicate: "Duplicate of",
  parent: "Parent of",
  child: "Subtask of",
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const NimroseTicketModal = ({ ticketId, onClose }: { ticketId: number; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [commentDraft, setCommentDraft] = useState("");
  const [linkKey, setLinkKey] = useState("");
  const [linkRelation, setLinkRelation] = useState<TicketLinkRelation>("blocks");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketQuery = useQuery({ queryKey: ["nimrose", "ticket", ticketId], queryFn: () => fetchTicket(ticketId) });
  const columnsQuery = useQuery({
    queryKey: ["nimrose", "board-columns", ticketQuery.data?.projectId],
    queryFn: () => fetchBoardColumns(ticketQuery.data!.projectId),
    enabled: !!ticketQuery.data,
  });
  const commentsQuery = useQuery({
    queryKey: ["nimrose", "ticket-comments", ticketId],
    queryFn: () => fetchTicketComments(ticketId),
  });
  const activityQuery = useQuery({
    queryKey: ["nimrose", "ticket-activity", ticketId],
    queryFn: () => fetchTicketActivity(ticketId),
  });
  const allTicketsQuery = useQuery({ queryKey: ["nimrose", "tickets", "all-for-link"], queryFn: () => fetchTickets() });

  const invalidateBoard = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "tickets"] });
  const invalidateTicket = () => {
    queryClient.invalidateQueries({ queryKey: ["nimrose", "ticket", ticketId] });
    invalidateBoard();
  };

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateTicket>[1]) => updateTicket(ticketId, patch),
    onSuccess: invalidateTicket,
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => addTicketComment(ticketId, body),
    onSuccess: () => {
      setCommentDraft("");
      queryClient.invalidateQueries({ queryKey: ["nimrose", "ticket-comments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["nimrose", "ticket-activity", ticketId] });
      invalidateBoard();
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ relation, linkedTicketId }: { relation: TicketLinkRelation; linkedTicketId: number }) =>
      addTicketLink(ticketId, relation, linkedTicketId),
    onSuccess: () => {
      setLinkKey("");
      invalidateTicket();
      queryClient.invalidateQueries({ queryKey: ["nimrose", "ticket-activity", ticketId] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: number) => removeTicketLink(ticketId, linkId),
    onSuccess: invalidateTicket,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTicket(ticketId),
    onSuccess: () => {
      invalidateBoard();
      onClose();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadTicketAttachment(ticketId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "ticket", ticketId] });
      invalidateBoard();
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteTicketAttachment(ticketId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nimrose", "ticket", ticketId] });
      invalidateBoard();
    },
  });

  const ticket = ticketQuery.data;

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const body = commentDraft.trim();
    if (!body) return;
    commentMutation.mutate(body);
  };

  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    const target = allTicketsQuery.data?.find((t) => t.key.toLowerCase() === linkKey.trim().toLowerCase());
    if (!target) return;
    linkMutation.mutate({ relation: linkRelation, linkedTicketId: target.id });
  };

  return (
    <div className="nimrose-modal-overlay" onClick={onClose}>
      <div className="nimrose-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nimrose-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {!ticket ? (
          <p className="nimrose-widget-empty">Loading ticket…</p>
        ) : (
          <>
            <div className="nimrose-modal-header">
              <span className="nimrose-ticket-key">{ticket.key}</span>
              <button
                type="button"
                className="nimrose-icon-btn"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete ticket?",
                    message: `Delete ${ticket.key} — "${ticket.title}"? This can't be undone.`,
                    confirmLabel: "Delete",
                    danger: true,
                  });
                  if (ok) deleteMutation.mutate();
                }}
                aria-label="Delete ticket"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <input
              className="nimrose-modal-title"
              defaultValue={ticket.title}
              onBlur={(e) => {
                const title = e.target.value.trim();
                if (title && title !== ticket.title) updateMutation.mutate({ title });
              }}
              aria-label="Ticket title"
            />

            <div className="nimrose-modal-field-row">
              <label>
                Type
                <select value={ticket.type} onChange={(e) => updateMutation.mutate({ type: e.target.value as TicketType })}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={ticket.status} onChange={(e) => updateMutation.mutate({ status: e.target.value as never })}>
                  {columnsQuery.data?.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                  {/* Covers a status that no longer matches any current column
                      (e.g. its column was renamed) so the select still shows it. */}
                  {columnsQuery.data && !columnsQuery.data.some((c) => c.slug === ticket.status) && (
                    <option value={ticket.status}>{ticket.status}</option>
                  )}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={ticket.priority}
                  onChange={(e) => updateMutation.mutate({ priority: e.target.value as TicketPriority })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="nimrose-modal-field-row">
              <label>
                Assignee
                <input
                  defaultValue={ticket.assignee ?? ""}
                  placeholder="Unassigned"
                  onBlur={(e) => updateMutation.mutate({ assignee: e.target.value.trim() || null })}
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  defaultValue={ticket.dueDate ?? ""}
                  onBlur={(e) => updateMutation.mutate({ dueDate: e.target.value })}
                />
              </label>
              <label>
                Story points
                <input
                  type="number"
                  min={0}
                  defaultValue={ticket.storyPoints ?? ""}
                  onBlur={(e) => updateMutation.mutate({ storyPoints: e.target.value ? Number(e.target.value) : undefined })}
                />
              </label>
            </div>

            <label className="nimrose-modal-description-label">
              Description
              <textarea
                defaultValue={ticket.description ?? ""}
                placeholder="Add a description…"
                onBlur={(e) => updateMutation.mutate({ description: e.target.value })}
              />
            </label>

            <div className="nimrose-modal-section">
              <p className="nimrose-modal-section-title">
                <Link2 size={13} /> Relationships
              </p>
              {ticket.links && ticket.links.length > 0 ? (
                <ul className="nimrose-link-list">
                  {ticket.links.map((link) => (
                    <li key={link.id}>
                      <span className="nimrose-chip">{RELATION_LABEL[link.relation]}</span>
                      <span>
                        {link.linkedTicketKey} — {link.linkedTicketTitle}
                      </span>
                      <button type="button" onClick={() => unlinkMutation.mutate(link.id)} aria-label="Remove link">
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="nimrose-widget-empty">No linked tickets.</p>
              )}
              <form className="nimrose-link-form" onSubmit={submitLink}>
                <select value={linkRelation} onChange={(e) => setLinkRelation(e.target.value as TicketLinkRelation)}>
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {RELATION_LABEL[r]}
                    </option>
                  ))}
                </select>
                <input
                  value={linkKey}
                  onChange={(e) => setLinkKey(e.target.value)}
                  placeholder="Ticket key, e.g. AST-2"
                  list="nimrose-ticket-keys"
                />
                <datalist id="nimrose-ticket-keys">
                  {allTicketsQuery.data
                    ?.filter((t) => t.id !== ticketId)
                    .map((t) => <option key={t.id} value={t.key}>{t.title}</option>)}
                </datalist>
                <button type="submit">Link</button>
              </form>
            </div>

            <div className="nimrose-modal-section">
              <p className="nimrose-modal-section-title">
                <Paperclip size={13} /> Attachments
              </p>
              {ticket.attachments && ticket.attachments.length > 0 ? (
                <div className="nimrose-attachment-grid">
                  {ticket.attachments.map((a) => (
                    <div key={a.id} className="nimrose-attachment-item">
                      {a.isImage ? (
                        <a href={attachmentFileUrl(a)} target="_blank" rel="noreferrer">
                          <img src={attachmentFileUrl(a)} alt={a.fileName} />
                        </a>
                      ) : (
                        <a href={attachmentFileUrl(a)} target="_blank" rel="noreferrer" className="nimrose-attachment-file">
                          <FileIcon size={22} />
                        </a>
                      )}
                      <p className="nimrose-attachment-name" title={a.fileName}>
                        {a.fileName}
                      </p>
                      <p className="nimrose-widget-footnote">{formatBytes(a.sizeBytes)}</p>
                      <button
                        type="button"
                        className="nimrose-attachment-remove"
                        onClick={() => deleteAttachmentMutation.mutate(a.id)}
                        aria-label={`Remove ${a.fileName}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="nimrose-widget-empty">No attachments yet.</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="nimrose-hidden-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="nimrose-chip"
                disabled={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="inline-flex items-center gap-1">
                  <Paperclip size={12} />
                  {uploadMutation.isPending ? "Uploading…" : "Add attachment"}
                </span>
              </button>
            </div>

            <div className="nimrose-modal-section">
              <p className="nimrose-modal-section-title">Comments</p>
              <div className="nimrose-comment-list">
                {commentsQuery.data?.length === 0 && <p className="nimrose-widget-empty">No comments yet.</p>}
                {commentsQuery.data?.map((c) => (
                  <div key={c.id} className="nimrose-comment">
                    <div className="nimrose-comment-avatar">{(c.authorName ?? "?").slice(0, 1).toUpperCase()}</div>
                    <div>
                      <p className="nimrose-comment-meta">
                        <strong>{c.authorName}</strong> <span>{timeAgo(c.createdAt)}</span>
                      </p>
                      <p className="nimrose-comment-body">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form className="nimrose-comment-form" onSubmit={submitComment}>
                <div className="nimrose-comment-avatar">{(user?.name ?? "?").slice(0, 1).toUpperCase()}</div>
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment…"
                  aria-label="Write a comment"
                />
                <button type="submit" aria-label="Send comment" disabled={commentMutation.isPending}>
                  <Send size={14} />
                </button>
              </form>
            </div>

            <div className="nimrose-modal-section">
              <p className="nimrose-modal-section-title">Activity</p>
              <ul className="nimrose-activity-list">
                {activityQuery.data?.map((a) => (
                  <li key={a.id}>
                    <span className="nimrose-widget-footnote">{timeAgo(a.createdAt)}</span>{" "}
                    <strong>{a.actorName}</strong> {a.action.replace(/_/g, " ")}
                    {a.detail ? ` — ${a.detail}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NimroseTicketModal;
