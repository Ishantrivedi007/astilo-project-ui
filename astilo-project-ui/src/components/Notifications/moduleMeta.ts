import { Archive, BookOpen, Calendar, FlaskConical, KanbanSquare, LineChart, MessageCircle, NotebookPen, Orbit, ShoppingBag, Sparkles } from "lucide-react";
import type { NotificationModule } from "../../lib/notificationsApi";

export const MODULE_LABEL: Record<NotificationModule, string> = {
  kanban: "Kanban",
  research: "Research",
  calendar: "Calendar",
  nimrose: "Nimrose",
  cosmos: "Cosmos",
  markets: "Markets",
  library: "Library",
  store: "Store",
  vault: "Vault",
  messenger: "Messenger",
  office: "Studio",
};

export const MODULE_ICON: Record<NotificationModule, typeof Calendar> = {
  kanban: KanbanSquare,
  research: FlaskConical,
  calendar: Calendar,
  nimrose: Sparkles,
  cosmos: Orbit,
  markets: LineChart,
  library: BookOpen,
  store: ShoppingBag,
  vault: Archive,
  messenger: MessageCircle,
  office: NotebookPen,
};

export const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};
