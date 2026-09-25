import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File as FileIcon, GitBranch, Link2, Paperclip, Send, Trash2, X } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { useConfirm } from "../shared";
import {
  addTicketComment,
  addTicketGitLink,
  addTicketLink,
  attachmentFileUrl,
  deleteTicket,
  deleteTicketAttachment,
  fetchAssignableUsers,
  fetchBoardColumns,
  fetchPhases,
  fetchSprints,
  fetchTicketActivity,
  fetchTicketComments,
  fetchTicket,
  fetchTickets,
  removeTicketGitLink,
  removeTicketLink,
  TICKET_TYPE_ICON,
  TICKET_TYPE_LABEL,
  updateTicket,
  uploadTicketAttachment,
  type GitLinkType,
  type TicketLinkRelation,
  type TicketPriority,
  type TicketType,
} from "../../lib/kanbanApi";
import UserAvatar from "./UserAvatar";
import { RichTextEditor } from "../shared";

const TYPES = Object.keys(TICKET_TYPE_LABEL) as TicketType[];
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

const GIT_TYPE_LABEL: Record<GitLinkType, string> = {
  commit: "Commit",
  pull_request: "Pull request",
  issue: "Issue",
  branch: "Branch",
  other: "Link",
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
  const [gitLinkUrl, setGitLinkUrl] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const usersQuery = useQuery({ queryKey: ["users", "basic"], queryFn: fetchAssignableUsers });
  const sprintsQuery = useQuery({
    queryKey: ["nimrose", "sprints", ticketQuery.data?.projectId],
    queryFn: () => fetchSprints(ticketQuery.data!.projectId),
    enabled: !!ticketQuery.data,
  });
  const phasesQuery = useQuery({
    queryKey: ["nimrose", "phases", ticketQuery.data?.projectId],
    queryFn: () => fetchPhases(ticketQuery.data!.projectId),
    enabled: !!ticketQuery.data,
  });

  const invalidateBoard = () => {
    queryClient.invalidateQueries({ queryKey: ["nimrose", "tickets"] });
    // Status/assignee changes create a real notification server-side —
    // refresh the bell immediately instead of waiting for its own poll.
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
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

  const addGitLinkMutation = useMutation({
    mutationFn: (url: string) => addTicketGitLink(ticketId, url),
    onSuccess: () => {
      setGitLinkUrl("");
      invalidateTicket();
    },
  });

  const removeGitLinkMutation = useMutation({
    mutationFn: (linkId: number) => removeTicketGitLink(ticketId, linkId),
    onSuccess: invalidateTicket,
  });

  const ticket = ticketQuery.data;

  useEffect(() => {
    setDescriptionDraft(ticket?.description ?? "");
  }, [ticket?.id]);

  const scheduleDescriptionSave = (html: string) => {
    setDescriptionDraft(html);
    if (descSaveTimer.current) clearTimeout(descSaveTimer.current);
    descSaveTimer.current = setTimeout(() => {
      updateMutation.mutate({ description: html });
    }, 800);
  };

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

  const submitGitLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = gitLinkUrl.trim();
    if (!url) return;
    addGitLinkMutation.mutate(url);
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
              <span className="nimrose-ticket-key">
                <span aria-hidden>{TICKET_TYPE_ICON[ticket.type]}</span> {ticket.key}
              </span>
              <span className="nimrose-chip">{TICKET_TYPE_LABEL[ticket.type]}</span>
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
                      {TICKET_TYPE_ICON[t]} {TICKET_TYPE_LABEL[t]}
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
                <div className="nimrose-assignee-field">
                  {ticket.assignee && (
                    <UserAvatar
                      name={ticket.assignee}
                      avatarUrl={usersQuery.data?.find((u) => u.name === ticket.assignee)?.avatar}
                      size={22}
                    />
                  )}
                  <select
                    value={ticket.assignee ?? ""}
                    onChange={(e) => updateMutation.mutate({ assignee: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {usersQuery.data?.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                        {u.id === user?.id ? " (me)" : ""}
                      </option>
                    ))}
                    {ticket.assignee && !usersQuery.data?.some((u) => u.name === ticket.assignee) && (
                      <option value={ticket.assignee}>{ticket.assignee}</option>
                    )}
                  </select>
                  {user?.name && ticket.assignee !== user.name && (
                    <button
                      type="button"
                      className="nimrose-chip"
                      onClick={() => updateMutation.mutate({ assignee: user.name })}
                    >
                      Assign to me
                    </button>
                  )}
                </div>
              </label>
              <label>
                Sprint
                <select
                  value={ticket.sprintId ?? ""}
                  onChange={(e) => updateMutation.mutate({ sprintId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">No sprint</option>
                  {sprintsQuery.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Phase
                <select
                  value={ticket.phaseId ?? ""}
                  onChange={(e) => updateMutation.mutate({ phaseId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">No phase</option>
                  {phasesQuery.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="nimrose-modal-field-row">
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
              <RichTextEditor value={descriptionDraft} onChange={scheduleDescriptionSave} placeholder="Add a description — text, links, images…" />
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

            {user?.gitLinksEnabled && (
              <div className="nimrose-modal-section">
                <p className="nimrose-modal-section-title">
                  <GitBranch size={13} /> Git &amp; Code
                </p>
                {ticket.gitLinks && ticket.gitLinks.length > 0 ? (
                  <ul className="nimrose-link-list">
                    {ticket.gitLinks.map((link) => (
                      <li key={link.id}>
                        <span className="nimrose-chip">{GIT_TYPE_LABEL[link.linkType]}</span>
                        <a href={link.url} target="_blank" rel="noreferrer">
                          {link.label ?? link.url}
                        </a>
                        <button type="button" onClick={() => removeGitLinkMutation.mutate(link.id)} aria-label="Remove git link">
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="nimrose-widget-empty">No commits, PRs, or branches linked yet.</p>
                )}
                <form className="nimrose-link-form" onSubmit={submitGitLink}>
                  <input
                    value={gitLinkUrl}
                    onChange={(e) => setGitLinkUrl(e.target.value)}
                    placeholder="Paste a GitHub/GitLab/Bitbucket commit, PR, issue, or branch URL…"
                  />
                  <button type="submit" disabled={addGitLinkMutation.isPending}>
                    Link
                  </button>
                </form>
                {addGitLinkMutation.isError && <p className="nimrose-widget-empty">Couldn't add that link.</p>}
              </div>
            )}

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
