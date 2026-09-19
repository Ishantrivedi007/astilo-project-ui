"""Astilo Pulse (Nimrose's notification center) — since Nimrose is a
single-user personal workspace, there's no cross-user event stream to
notify about (a comment or assignment always came from you). What's
actually useful here is time-derived: things overdue or due soon. Every
notification is computed live from real rows on each request rather than
stored/fabricated — dismissal is tracked client-side (see NimrosePulse.tsx)
against each item's stable synthetic id, and an item naturally disappears
once it's resolved (completed/moved) since it stops matching the query.
"""

import datetime

import cherrypy

from app.db import get_session
from app.models import (
    NimroseBoardColumn,
    NimroseCalendarEvent,
    NimroseProject,
    NimroseSprint,
    NimroseTask,
    NimroseTicket,
)


def _user_id():
    return int(cherrypy.request.user["sub"])


class NimrosePulseController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        today = datetime.date.today()
        today_str = today.isoformat()
        now = datetime.datetime.utcnow()
        notifications = []

        with get_session() as session:
            # Overdue / due-today tasks.
            tasks = (
                session.query(NimroseTask)
                .filter(NimroseTask.user_id == user_id, NimroseTask.status != "completed", NimroseTask.due_date.isnot(None))
                .all()
            )
            for t in tasks:
                if t.due_date and t.due_date <= today_str:
                    overdue = t.due_date < today_str
                    notifications.append(
                        {
                            "id": f"task-{t.id}",
                            "kind": "task_overdue" if overdue else "task_due",
                            "title": t.title,
                            "body": f"{'Overdue since' if overdue else 'Due'} {t.due_date}",
                            "section": "tasks",
                            "severity": "high" if overdue else "medium",
                        }
                    )

            # Overdue / due-today tickets (skip anything already in a done column).
            done_slugs_by_project: dict[int, set] = {}
            tickets = (
                session.query(NimroseTicket)
                .filter(NimroseTicket.user_id == user_id, NimroseTicket.due_date.isnot(None))
                .all()
            )
            for tk in tickets:
                if tk.project_id not in done_slugs_by_project:
                    done_slugs_by_project[tk.project_id] = {
                        c.slug for c in session.query(NimroseBoardColumn).filter_by(project_id=tk.project_id, is_done=1).all()
                    }
                if tk.status in done_slugs_by_project[tk.project_id]:
                    continue
                if tk.due_date and tk.due_date <= today_str:
                    overdue = tk.due_date < today_str
                    notifications.append(
                        {
                            "id": f"ticket-{tk.id}",
                            "kind": "ticket_overdue" if overdue else "ticket_due",
                            "title": f"{tk.ticket_key} — {tk.title}",
                            "body": f"{'Overdue since' if overdue else 'Due'} {tk.due_date}",
                            "section": "kanban",
                            "severity": "high" if overdue else "medium",
                        }
                    )

            # Sprints ending within 2 days (still active/planned).
            sprints = (
                session.query(NimroseSprint)
                .join(NimroseProject)
                .filter(NimroseProject.user_id == user_id, NimroseSprint.status != "completed")
                .all()
            )
            for s in sprints:
                if not s.end_date:
                    continue
                try:
                    end = datetime.date.fromisoformat(s.end_date)
                except ValueError:
                    continue
                days_left = (end - today).days
                if 0 <= days_left <= 2:
                    notifications.append(
                        {
                            "id": f"sprint-{s.id}",
                            "kind": "sprint_ending",
                            "title": s.name,
                            "body": "Ends today" if days_left == 0 else f"Ends in {days_left} day{'s' if days_left != 1 else ''}",
                            "section": "sprints",
                            "severity": "medium",
                        }
                    )
                elif days_left < 0:
                    notifications.append(
                        {
                            "id": f"sprint-{s.id}",
                            "kind": "sprint_overdue",
                            "title": s.name,
                            "body": f"Was due to end {-days_left} day{'s' if days_left != -1 else ''} ago",
                            "section": "sprints",
                            "severity": "high",
                        }
                    )

            # Calendar events within their own reminder window.
            events = (
                session.query(NimroseCalendarEvent)
                .filter(
                    NimroseCalendarEvent.user_id == user_id,
                    NimroseCalendarEvent.reminder_minutes_before.isnot(None),
                )
                .all()
            )
            for e in events:
                if not e.start_at:
                    continue
                minutes_until = (e.start_at - now).total_seconds() / 60
                if -30 <= minutes_until <= (e.reminder_minutes_before or 0):
                    notifications.append(
                        {
                            "id": f"event-{e.id}",
                            "kind": "event_reminder",
                            "title": e.title,
                            "body": "Starting now" if minutes_until <= 0 else f"Starts in {int(minutes_until)} min",
                            "section": "calendar",
                            "severity": "medium",
                        }
                    )

        return notifications
