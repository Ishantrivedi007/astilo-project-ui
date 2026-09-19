"""Kanban analytics — burndown, velocity, breakdown. Every series here is
computed from real rows (tickets, sprints, and the activity log that
already gets written on every status change) rather than synthesized, per
the project's own "never fabricate data" convention.
"""

import datetime
import re

import cherrypy

from app.db import get_session
from app.models import (
    NimroseBoardColumn,
    NimroseProject,
    NimroseSprint,
    NimroseTicket,
    NimroseTicketActivity,
)


def _user_id():
    return int(cherrypy.request.user["sub"])


def _daterange(start: datetime.date, end: datetime.date):
    days = (end - start).days
    for i in range(days + 1):
        yield start + datetime.timedelta(days=i)


class NimroseBurndownController:
    """GET /api/nimrose/analytics/burndown?sprintId=X — ideal vs actual
    remaining story points per day of the sprint, reconstructed from each
    ticket's activity log (the first status_changed entry that moved it
    into a "done" column)."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, sprint_id):
        with get_session() as session:
            sprint = (
                session.query(NimroseSprint)
                .join(NimroseProject)
                .filter(NimroseSprint.id == int(sprint_id), NimroseProject.user_id == _user_id())
                .first()
            )
            if not sprint:
                raise cherrypy.HTTPError(404, "Sprint not found")
            if not sprint.start_date or not sprint.end_date:
                raise cherrypy.HTTPError(
                    400, "Set this sprint's start and end dates first (Sprints view) to see a burndown."
                )

            try:
                start = datetime.date.fromisoformat(sprint.start_date)
                end = datetime.date.fromisoformat(sprint.end_date)
            except ValueError:
                raise cherrypy.HTTPError(400, "Sprint start/end dates are malformed")
            if end < start:
                raise cherrypy.HTTPError(400, "Sprint end date is before its start date")

            done_slugs = {
                c.slug for c in session.query(NimroseBoardColumn).filter_by(project_id=sprint.project_id, is_done=1).all()
            }
            tickets = session.query(NimroseTicket).filter_by(sprint_id=sprint.id).all()
            total_points = sum(t.story_points or 0 for t in tickets)

            # For each ticket currently done, find the earliest activity
            # entry that moved it into a done-slug — that's the day its
            # points stop counting toward "remaining".
            done_dates: dict[int, datetime.date] = {}
            for ticket in tickets:
                if ticket.status not in done_slugs:
                    continue
                entries = (
                    session.query(NimroseTicketActivity)
                    .filter_by(ticket_id=ticket.id, action="status_changed")
                    .order_by(NimroseTicketActivity.created_at.asc())
                    .all()
                )
                for entry in entries:
                    match = re.search(r"→\s*(\S+)", entry.detail or "")
                    if match and match.group(1) in done_slugs:
                        done_dates[ticket.id] = entry.created_at.date()
                        break
                else:
                    # Created directly into a done column — count it done
                    # from the ticket's creation date.
                    done_dates[ticket.id] = ticket.created_at.date()

            today = datetime.date.today()
            chart_end = min(end, today) if today > start else end
            dates = list(_daterange(start, max(chart_end, start)))
            total_days = max((end - start).days, 1)

            ideal_series = []
            actual_series = []
            for day in dates:
                day_index = (day - start).days
                ideal_series.append(round(total_points * max(0.0, 1 - day_index / total_days), 1))
                completed_by_day = sum(
                    (t.story_points or 0) for t in tickets if t.id in done_dates and done_dates[t.id] <= day
                )
                actual_series.append(round(total_points - completed_by_day, 1))

            return {
                "sprintId": sprint.id,
                "sprintName": sprint.name,
                "startDate": sprint.start_date,
                "endDate": sprint.end_date,
                "totalPoints": total_points,
                "ticketCount": len(tickets),
                "dates": [d.isoformat() for d in dates],
                "idealRemaining": ideal_series,
                "actualRemaining": actual_series,
            }


class NimroseVelocityController:
    """GET /api/nimrose/analytics/velocity?projectId=X — story points
    completed per sprint, across a project's sprints (completed sprints
    first, most recent last, so the chart reads left-to-right chronologically)."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, project_id):
        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")

            done_slugs = {c.slug for c in session.query(NimroseBoardColumn).filter_by(project_id=project.id, is_done=1).all()}
            sprints = (
                session.query(NimroseSprint)
                .filter_by(project_id=project.id)
                .order_by(NimroseSprint.created_at.asc())
                .all()
            )

            results = []
            for sprint in sprints:
                tickets = session.query(NimroseTicket).filter_by(sprint_id=sprint.id).all()
                done_tickets = [t for t in tickets if t.status in done_slugs]
                results.append(
                    {
                        "sprintId": sprint.id,
                        "sprintName": sprint.name,
                        "status": sprint.status,
                        "pointsCompleted": sum(t.story_points or 0 for t in done_tickets),
                        "ticketsCompleted": len(done_tickets),
                        "ticketsTotal": len(tickets),
                    }
                )
            return results


class NimroseBreakdownController:
    """GET /api/nimrose/analytics/breakdown?projectId=X — current ticket
    counts grouped by type, priority, assignee, and column. A snapshot of
    right now, not a trend over time (that's what burndown/velocity are for)."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, project_id):
        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")

            tickets = session.query(NimroseTicket).filter_by(project_id=project.id).all()
            columns = session.query(NimroseBoardColumn).filter_by(project_id=project.id).order_by(NimroseBoardColumn.position).all()
            column_names = {c.slug: c.name for c in columns}

            def count_by(key_fn):
                counts: dict[str, int] = {}
                for t in tickets:
                    key = key_fn(t) or "Unassigned"
                    counts[key] = counts.get(key, 0) + 1
                return counts

            return {
                "total": len(tickets),
                "byType": count_by(lambda t: t.ticket_type),
                "byPriority": count_by(lambda t: t.priority),
                "byAssignee": count_by(lambda t: t.assignee_name),
                "byColumn": count_by(lambda t: column_names.get(t.status, t.status)),
            }
