import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";

import { useConfirm } from "../shared";
import {
  createNimroseCalendarEvent,
  deleteNimroseCalendarEvent,
  fetchNimroseProjects,
  fetchNimroseTasks,
  updateNimroseCalendarEvent,
  type NimroseCalendarEvent,
} from "../../lib/nimroseApi";

const CATEGORIES = ["meeting", "deadline", "personal", "reminder", "other"];
const RECURRENCES = ["none", "daily", "weekly", "monthly"];

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not the ISO/UTC
// string the API returns.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Props {
  event: NimroseCalendarEvent | null;
  /** Prefills start time when creating a new event from a clicked day/slot. */
  defaultStartAt?: string;
  onClose: () => void;
}

const CalendarEventModal = ({ event, defaultStartAt, onClose }: Props) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isNew = !event;

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startAt, setStartAt] = useState(toLocalInput(event?.startAt ?? defaultStartAt ?? new Date().toISOString()));
  const [endAt, setEndAt] = useState(toLocalInput(event?.endAt ?? null));
  const [location, setLocation] = useState(event?.location ?? "");
  const [category, setCategory] = useState(event?.category ?? "meeting");
  const [color, setColor] = useState(event?.color ?? "");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(event?.reminderMinutesBefore?.toString() ?? "");
  const [recurrence, setRecurrence] = useState(event?.recurrence ?? "none");
  const [projectId, setProjectId] = useState(event?.projectId?.toString() ?? "");
  const [relatedTaskId, setRelatedTaskId] = useState(event?.relatedTaskId?.toString() ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");

  const projectsQuery = useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });
  const tasksQuery = useQuery({ queryKey: ["nimrose", "tasks", "all"], queryFn: () => fetchNimroseTasks() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "calendar-events"] });

  const createMutation = useMutation({
    mutationFn: createNimroseCalendarEvent,
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateNimroseCalendarEvent>[1]) => updateNimroseCalendarEvent(event!.id, patch),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteNimroseCalendarEvent(event!.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !startAt) return;

    const base = {
      title: trimmed,
      description: description || undefined,
      startAt: new Date(startAt).toISOString(),
      location: location || undefined,
      category: category || undefined,
      color: color || undefined,
      reminderMinutesBefore: reminderMinutesBefore ? Number(reminderMinutesBefore) : undefined,
      recurrence,
      notes: notes || undefined,
    };
    const endAtIso = endAt ? new Date(endAt).toISOString() : null;

    if (isNew) {
      createMutation.mutate({
        ...base,
        endAt: endAtIso ?? undefined,
        projectId: projectId ? Number(projectId) : undefined,
        relatedTaskId: relatedTaskId ? Number(relatedTaskId) : undefined,
      });
    } else {
      updateMutation.mutate({
        ...base,
        endAt: endAtIso,
        projectId: projectId ? Number(projectId) : null,
        relatedTaskId: relatedTaskId ? Number(relatedTaskId) : null,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="nimrose-modal-overlay" onClick={onClose}>
      <div className="nimrose-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nimrose-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <form onSubmit={submit}>
          <input
            className="nimrose-modal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            aria-label="Event title"
            autoFocus
          />

          <div className="nimrose-modal-field-row">
            <label>
              Starts
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </label>
            <label>
              Ends
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </label>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="nimrose-modal-field-row">
            <label>
              Location
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </label>
            <label>
              Reminder (minutes before)
              <input
                type="number"
                min={0}
                value={reminderMinutesBefore}
                onChange={(e) => setReminderMinutesBefore(e.target.value)}
                placeholder="None"
              />
            </label>
            <label>
              Repeats
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="nimrose-modal-field-row">
            <label>
              Project
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projectsQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Related task
              <select value={relatedTaskId} onChange={(e) => setRelatedTaskId(e.target.value)}>
                <option value="">No linked task</option>
                {tasksQuery.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Color
              <input type="color" value={color || "#7fb0ff"} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>

          <label className="nimrose-modal-description-label">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this about?" />
          </label>

          <label className="nimrose-modal-description-label">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra notes…" />
          </label>

          <div className="nimrose-modal-field-row" style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="nimrose-chip" disabled={pending}>
              {isNew ? "Create event" : "Save changes"}
            </button>
            {!isNew && (
              <button
                type="button"
                className="nimrose-chip"
                onClick={async () => {
                  const ok = await confirm({ title: "Delete event?", message: `Delete "${event!.title}"?`, confirmLabel: "Delete", danger: true });
                  if (ok) deleteMutation.mutate();
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarEventModal;
