import datetime
import re

import cherrypy

from app.db import get_session
from app.models import (
    DEFAULT_BOARD_COLUMNS,
    TASK_PRIORITIES,
    TASK_STATUSES,
    TICKET_LINK_INVERSE,
    TICKET_LINK_RELATIONS,
    TICKET_PRIORITIES,
    TICKET_TYPES,
    NimroseBoardColumn,
    NimroseCalendarEvent,
    NimroseNote,
    NimroseProject,
    NimroseSprint,
    NimroseTask,
    NimroseTicket,
    NimroseTicketActivity,
    NimroseTicketComment,
    NimroseTicketLink,
)


def _user_id():
    return int(cherrypy.request.user["sub"])


def _derive_key_prefix(name: str) -> str:
    letters = re.sub(r"[^A-Za-z]", "", name).upper()
    return (letters[:3] or "PRJ")


def _ensure_board_columns(session, project: NimroseProject):
    """Lazily seeds a project's default columns (Backlog/To Do/In
    Progress/Review/Done) the first time they're needed, mirroring the
    Browser Spaces auto-seed pattern — so projects created before this
    feature existed still get a working board instead of an empty one."""
    if project.board_columns:
        return project.board_columns
    for i, (name, slug, is_done) in enumerate(DEFAULT_BOARD_COLUMNS):
        session.add(NimroseBoardColumn(project_id=project.id, name=name, slug=slug, position=i, is_done=1 if is_done else 0))
    session.flush()
    session.refresh(project)
    return project.board_columns


def _valid_status_slugs(session, project: NimroseProject) -> set:
    return {c.slug for c in _ensure_board_columns(session, project)}


class NimroseProjectsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        with get_session() as session:
            projects = session.query(NimroseProject).filter_by(user_id=_user_id()).order_by(NimroseProject.created_at.desc()).all()
            return [p.to_dict() for p in projects]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        if not name:
            raise cherrypy.HTTPError(400, "name is required")

        with get_session() as session:
            key_prefix = (body.get("keyPrefix") or "").strip().upper() or _derive_key_prefix(name)
            project = NimroseProject(user_id=_user_id(), name=name, color=body.get("color"), key_prefix=key_prefix)
            session.add(project)
            session.flush()
            return project.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, project_id):
        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")
            session.delete(project)
            return {"deleted": True}


class NimroseTasksController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, status=None, project_id=None):
        with get_session() as session:
            query = session.query(NimroseTask).filter_by(user_id=_user_id())
            if status:
                query = query.filter_by(status=status)
            if project_id:
                query = query.filter_by(project_id=int(project_id))
            tasks = query.order_by(NimroseTask.created_at.desc()).all()
            return [t.to_dict() for t in tasks]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        title = (body.get("title") or "").strip()
        if not title:
            raise cherrypy.HTTPError(400, "title is required")

        status = body.get("status", "inbox")
        priority = body.get("priority", "medium")
        if status not in TASK_STATUSES:
            raise cherrypy.HTTPError(400, f"status must be one of {', '.join(TASK_STATUSES)}")
        if priority not in TASK_PRIORITIES:
            raise cherrypy.HTTPError(400, f"priority must be one of {', '.join(TASK_PRIORITIES)}")

        with get_session() as session:
            task = NimroseTask(
                user_id=_user_id(),
                project_id=body.get("projectId"),
                title=title,
                description=body.get("description"),
                status=status,
                priority=priority,
                start_date=body.get("startDate"),
                due_date=body.get("dueDate"),
                labels=body.get("labels") or [],
                estimated_minutes=body.get("estimatedMinutes"),
                actual_minutes=body.get("actualMinutes"),
            )
            session.add(task)
            session.flush()
            return task.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, task_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            task = session.query(NimroseTask).filter_by(id=int(task_id), user_id=_user_id()).first()
            if not task:
                raise cherrypy.HTTPError(404, "Task not found")

            if "title" in body:
                title = (body["title"] or "").strip()
                if not title:
                    raise cherrypy.HTTPError(400, "title cannot be empty")
                task.title = title
            if "description" in body:
                task.description = body["description"]
            if "status" in body:
                if body["status"] not in TASK_STATUSES:
                    raise cherrypy.HTTPError(400, f"status must be one of {', '.join(TASK_STATUSES)}")
                task.status = body["status"]
            if "priority" in body:
                if body["priority"] not in TASK_PRIORITIES:
                    raise cherrypy.HTTPError(400, f"priority must be one of {', '.join(TASK_PRIORITIES)}")
                task.priority = body["priority"]
            if "projectId" in body:
                task.project_id = body["projectId"]
            if "startDate" in body:
                task.start_date = body["startDate"]
            if "dueDate" in body:
                task.due_date = body["dueDate"]
            if "labels" in body:
                task.labels = body["labels"] or []
            if "estimatedMinutes" in body:
                task.estimated_minutes = body["estimatedMinutes"]
            if "actualMinutes" in body:
                task.actual_minutes = body["actualMinutes"]

            session.flush()
            return task.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, task_id):
        with get_session() as session:
            task = session.query(NimroseTask).filter_by(id=int(task_id), user_id=_user_id()).first()
            if not task:
                raise cherrypy.HTTPError(404, "Task not found")
            session.delete(task)
            return {"deleted": True}


def _parse_iso(value, field_name):
    try:
        return datetime.datetime.fromisoformat(value)
    except (TypeError, ValueError):
        raise cherrypy.HTTPError(400, f"{field_name} must be an ISO 8601 datetime")


class NimroseCalendarController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, start=None, end=None):
        with get_session() as session:
            query = session.query(NimroseCalendarEvent).filter_by(user_id=_user_id())
            if start:
                query = query.filter(NimroseCalendarEvent.start_at >= _parse_iso(start, "start"))
            if end:
                query = query.filter(NimroseCalendarEvent.start_at <= _parse_iso(end, "end"))
            events = query.order_by(NimroseCalendarEvent.start_at.asc()).all()
            return [e.to_dict() for e in events]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        title = (body.get("title") or "").strip()
        if not title or not body.get("startAt"):
            raise cherrypy.HTTPError(400, "title and startAt are required")

        with get_session() as session:
            event = NimroseCalendarEvent(
                user_id=_user_id(),
                project_id=body.get("projectId"),
                related_task_id=body.get("relatedTaskId"),
                title=title,
                description=body.get("description"),
                start_at=_parse_iso(body["startAt"], "startAt"),
                end_at=_parse_iso(body["endAt"], "endAt") if body.get("endAt") else None,
                location=body.get("location"),
                category=body.get("category"),
                color=body.get("color"),
                reminder_minutes_before=body.get("reminderMinutesBefore"),
                recurrence=body.get("recurrence", "none"),
                notes=body.get("notes"),
            )
            session.add(event)
            session.flush()
            return event.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, event_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            event = session.query(NimroseCalendarEvent).filter_by(id=int(event_id), user_id=_user_id()).first()
            if not event:
                raise cherrypy.HTTPError(404, "Event not found")

            if "title" in body:
                title = (body["title"] or "").strip()
                if not title:
                    raise cherrypy.HTTPError(400, "title cannot be empty")
                event.title = title
            if "description" in body:
                event.description = body["description"]
            if "startAt" in body:
                event.start_at = _parse_iso(body["startAt"], "startAt")
            if "endAt" in body:
                event.end_at = _parse_iso(body["endAt"], "endAt") if body["endAt"] else None
            if "location" in body:
                event.location = body["location"]
            if "category" in body:
                event.category = body["category"]
            if "color" in body:
                event.color = body["color"]
            if "reminderMinutesBefore" in body:
                event.reminder_minutes_before = body["reminderMinutesBefore"]
            if "recurrence" in body:
                event.recurrence = body["recurrence"]
            if "notes" in body:
                event.notes = body["notes"]
            if "projectId" in body:
                event.project_id = body["projectId"]
            if "relatedTaskId" in body:
                event.related_task_id = body["relatedTaskId"]

            session.flush()
            return event.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, event_id):
        with get_session() as session:
            event = session.query(NimroseCalendarEvent).filter_by(id=int(event_id), user_id=_user_id()).first()
            if not event:
                raise cherrypy.HTTPError(404, "Event not found")
            session.delete(event)
            return {"deleted": True}


class NimroseSprintsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, project_id=None):
        with get_session() as session:
            query = (
                session.query(NimroseSprint)
                .join(NimroseProject)
                .filter(NimroseProject.user_id == _user_id())
            )
            if project_id:
                query = query.filter(NimroseSprint.project_id == int(project_id))
            sprints = query.order_by(NimroseSprint.created_at.desc()).all()
            return [s.to_dict() for s in sprints]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        project_id = body.get("projectId")
        if not name or not project_id:
            raise cherrypy.HTTPError(400, "name and projectId are required")

        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")

            sprint = NimroseSprint(
                project_id=project.id,
                name=name,
                goal=body.get("goal"),
                start_date=body.get("startDate"),
                end_date=body.get("endDate"),
                status=body.get("status", "planned"),
            )
            session.add(sprint)
            session.flush()
            return sprint.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, sprint_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            sprint = (
                session.query(NimroseSprint)
                .join(NimroseProject)
                .filter(NimroseSprint.id == int(sprint_id), NimroseProject.user_id == _user_id())
                .first()
            )
            if not sprint:
                raise cherrypy.HTTPError(404, "Sprint not found")

            if "name" in body:
                sprint.name = (body["name"] or "").strip() or sprint.name
            if "goal" in body:
                sprint.goal = body["goal"]
            if "startDate" in body:
                sprint.start_date = body["startDate"]
            if "endDate" in body:
                sprint.end_date = body["endDate"]
            if "status" in body:
                if body["status"] not in ("planned", "active", "completed"):
                    raise cherrypy.HTTPError(400, "invalid sprint status")
                sprint.status = body["status"]

            session.flush()
            return sprint.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, sprint_id):
        with get_session() as session:
            sprint = (
                session.query(NimroseSprint)
                .join(NimroseProject)
                .filter(NimroseSprint.id == int(sprint_id), NimroseProject.user_id == _user_id())
                .first()
            )
            if not sprint:
                raise cherrypy.HTTPError(404, "Sprint not found")
            session.delete(sprint)
            return {"deleted": True}


def _log_activity(session, ticket_id, action, detail=None):
    session.add(NimroseTicketActivity(ticket_id=ticket_id, actor_user_id=_user_id(), action=action, detail=detail))


def _next_ticket_key(session, project: NimroseProject) -> str:
    project.ticket_sequence = (project.ticket_sequence or 0) + 1
    return f"{project.key_prefix or 'PRJ'}-{project.ticket_sequence}"


class NimroseTicketsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, ticket_id=None, project_id=None, sprint_id=None, status=None, priority=None, type=None, assignee=None, label=None, q=None):
        with get_session() as session:
            if ticket_id is not None:
                ticket = (
                    session.query(NimroseTicket)
                    .filter(NimroseTicket.id == int(ticket_id), NimroseTicket.user_id == _user_id())
                    .first()
                )
                if not ticket:
                    raise cherrypy.HTTPError(404, "Ticket not found")
                return ticket.to_dict(include_links=True, include_attachments=True)

            query = session.query(NimroseTicket).filter(NimroseTicket.user_id == _user_id())
            if project_id:
                query = query.filter(NimroseTicket.project_id == int(project_id))
            if sprint_id:
                query = query.filter(NimroseTicket.sprint_id == int(sprint_id))
            if status:
                query = query.filter(NimroseTicket.status == status)
            if priority:
                query = query.filter(NimroseTicket.priority == priority)
            if type:
                query = query.filter(NimroseTicket.ticket_type == type)
            if assignee:
                query = query.filter(NimroseTicket.assignee_name == assignee)
            if q:
                like = f"%{q}%"
                query = query.filter(
                    (NimroseTicket.title.ilike(like))
                    | (NimroseTicket.ticket_key.ilike(like))
                    | (NimroseTicket.description.ilike(like))
                )

            tickets = query.order_by(NimroseTicket.updated_at.desc()).all()
            if label:
                tickets = [t for t in tickets if label in (t.labels or [])]
            return [t.to_dict() for t in tickets]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        title = (body.get("title") or "").strip()
        project_id = body.get("projectId")
        if not title or not project_id:
            raise cherrypy.HTTPError(400, "title and projectId are required")

        ticket_type = body.get("type", "task")
        priority = body.get("priority", "medium")
        if ticket_type not in TICKET_TYPES:
            raise cherrypy.HTTPError(400, f"type must be one of {', '.join(TICKET_TYPES)}")
        if priority not in TICKET_PRIORITIES:
            raise cherrypy.HTTPError(400, f"priority must be one of {', '.join(TICKET_PRIORITIES)}")

        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")

            columns = _ensure_board_columns(session, project)
            status = body.get("status") or columns[0].slug
            if status not in {c.slug for c in columns}:
                raise cherrypy.HTTPError(400, f"status must be one of {', '.join(c.slug for c in columns)}")

            ticket = NimroseTicket(
                user_id=_user_id(),
                project_id=project.id,
                sprint_id=body.get("sprintId"),
                ticket_key=_next_ticket_key(session, project),
                title=title,
                description=body.get("description"),
                ticket_type=ticket_type,
                status=status,
                priority=priority,
                assignee_name=body.get("assignee"),
                reporter_user_id=_user_id(),
                labels=body.get("labels") or [],
                due_date=body.get("dueDate"),
                story_points=body.get("storyPoints"),
                estimate_minutes=body.get("estimateMinutes"),
            )
            session.add(ticket)
            session.flush()
            _log_activity(session, ticket.id, "created", f"Created as {ticket.ticket_key} in {status}")
            session.flush()
            return ticket.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, ticket_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")

            if "title" in body:
                title = (body["title"] or "").strip()
                if not title:
                    raise cherrypy.HTTPError(400, "title cannot be empty")
                ticket.title = title
            if "description" in body:
                ticket.description = body["description"]
            if "status" in body and body["status"] != ticket.status:
                valid_slugs = _valid_status_slugs(session, ticket.project)
                if body["status"] not in valid_slugs:
                    raise cherrypy.HTTPError(400, f"status must be one of {', '.join(valid_slugs)}")
                _log_activity(session, ticket.id, "status_changed", f"{ticket.status} → {body['status']}")
                ticket.status = body["status"]
            if "priority" in body and body["priority"] != ticket.priority:
                if body["priority"] not in TICKET_PRIORITIES:
                    raise cherrypy.HTTPError(400, f"priority must be one of {', '.join(TICKET_PRIORITIES)}")
                _log_activity(session, ticket.id, "priority_changed", f"{ticket.priority} → {body['priority']}")
                ticket.priority = body["priority"]
            if "type" in body:
                if body["type"] not in TICKET_TYPES:
                    raise cherrypy.HTTPError(400, f"type must be one of {', '.join(TICKET_TYPES)}")
                ticket.ticket_type = body["type"]
            if "assignee" in body and body["assignee"] != ticket.assignee_name:
                _log_activity(session, ticket.id, "assigned", body["assignee"] or "Unassigned")
                ticket.assignee_name = body["assignee"]
            if "sprintId" in body:
                ticket.sprint_id = body["sprintId"]
            if "labels" in body:
                ticket.labels = body["labels"] or []
            if "dueDate" in body:
                ticket.due_date = body["dueDate"]
            if "storyPoints" in body:
                ticket.story_points = body["storyPoints"]
            if "estimateMinutes" in body:
                ticket.estimate_minutes = body["estimateMinutes"]

            session.flush()
            return ticket.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, ticket_id):
        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")
            session.delete(ticket)
            return {"deleted": True}


def _slugify_column_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")
    return slug or "column"


class NimroseBoardColumnsController:
    """Per-project Kanban columns — lets a project define its own workflow
    steps (e.g. adding "Testing" or "QA" between Review and Done) instead
    of a fixed backlog/todo/in_progress/review/done enum."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, project_id):
        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")
            columns = _ensure_board_columns(session, project)
            return [c.to_dict() for c in columns]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, project_id):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        if not name:
            raise cherrypy.HTTPError(400, "name is required")

        with get_session() as session:
            project = session.query(NimroseProject).filter_by(id=int(project_id), user_id=_user_id()).first()
            if not project:
                raise cherrypy.HTTPError(404, "Project not found")

            columns = _ensure_board_columns(session, project)
            slug = _slugify_column_name(name)
            if any(c.slug == slug for c in columns):
                raise cherrypy.HTTPError(400, f"A column named \"{name}\" already exists on this project")

            # New columns default to appearing just before "Done" (or at the
            # end if there's no done column), since that's almost always
            # where a new workflow step like "Testing"/"QA" belongs.
            done_positions = [c.position for c in columns if c.is_done]
            insert_at = min(done_positions) if done_positions else len(columns)
            for c in columns:
                if c.position >= insert_at:
                    c.position += 1

            column = NimroseBoardColumn(project_id=project.id, name=name, slug=slug, position=insert_at, is_done=0)
            session.add(column)
            session.flush()
            return column.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, project_id, column_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            column = (
                session.query(NimroseBoardColumn)
                .join(NimroseProject)
                .filter(
                    NimroseBoardColumn.id == int(column_id),
                    NimroseBoardColumn.project_id == int(project_id),
                    NimroseProject.user_id == _user_id(),
                )
                .first()
            )
            if not column:
                raise cherrypy.HTTPError(404, "Column not found")

            if "name" in body:
                column.name = (body["name"] or "").strip() or column.name
            if "position" in body:
                column.position = int(body["position"])
            if "isDone" in body:
                column.is_done = 1 if body["isDone"] else 0
            if "wipLimit" in body:
                column.wip_limit = int(body["wipLimit"]) if body["wipLimit"] not in (None, "") else None

            session.flush()
            return column.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, project_id, column_id):
        with get_session() as session:
            column = (
                session.query(NimroseBoardColumn)
                .join(NimroseProject)
                .filter(
                    NimroseBoardColumn.id == int(column_id),
                    NimroseBoardColumn.project_id == int(project_id),
                    NimroseProject.user_id == _user_id(),
                )
                .first()
            )
            if not column:
                raise cherrypy.HTTPError(404, "Column not found")

            in_use = session.query(NimroseTicket).filter_by(project_id=int(project_id), status=column.slug).count()
            if in_use:
                raise cherrypy.HTTPError(
                    409, f"{in_use} ticket(s) are still in this column — move them first"
                )

            session.delete(column)
            return {"deleted": True}


class NimroseTicketCommentsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, ticket_id):
        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")
            comments = (
                session.query(NimroseTicketComment)
                .filter_by(ticket_id=ticket.id)
                .order_by(NimroseTicketComment.created_at.asc())
                .all()
            )
            return [c.to_dict() for c in comments]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, ticket_id):
        body = cherrypy.request.json or {}
        text = (body.get("body") or "").strip()
        if not text:
            raise cherrypy.HTTPError(400, "body is required")

        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")

            comment = NimroseTicketComment(ticket_id=ticket.id, user_id=_user_id(), body=text)
            session.add(comment)
            session.flush()
            _log_activity(session, ticket.id, "commented", text[:120])
            session.flush()
            return comment.to_dict()


class NimroseTicketLinksController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, ticket_id):
        body = cherrypy.request.json or {}
        relation = body.get("relation")
        linked_ticket_id = body.get("linkedTicketId")
        if relation not in TICKET_LINK_RELATIONS or not linked_ticket_id:
            raise cherrypy.HTTPError(400, f"relation must be one of {', '.join(TICKET_LINK_RELATIONS)}, and linkedTicketId is required")

        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            linked = session.query(NimroseTicket).filter_by(id=int(linked_ticket_id), user_id=_user_id()).first()
            if not ticket or not linked:
                raise cherrypy.HTTPError(404, "Ticket not found")
            if ticket.id == linked.id:
                raise cherrypy.HTTPError(400, "A ticket cannot link to itself")

            existing = (
                session.query(NimroseTicketLink)
                .filter_by(ticket_id=ticket.id, linked_ticket_id=linked.id, relation=relation)
                .first()
            )
            if existing:
                return existing.to_dict()

            link = NimroseTicketLink(ticket_id=ticket.id, linked_ticket_id=linked.id, relation=relation)
            session.add(link)

            inverse_relation = TICKET_LINK_INVERSE[relation]
            inverse_existing = (
                session.query(NimroseTicketLink)
                .filter_by(ticket_id=linked.id, linked_ticket_id=ticket.id, relation=inverse_relation)
                .first()
            )
            if not inverse_existing:
                session.add(NimroseTicketLink(ticket_id=linked.id, linked_ticket_id=ticket.id, relation=inverse_relation))

            _log_activity(session, ticket.id, "linked", f"{relation} {linked.ticket_key}")
            session.flush()
            return link.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, ticket_id, link_id):
        with get_session() as session:
            link = (
                session.query(NimroseTicketLink)
                .join(NimroseTicket, NimroseTicketLink.ticket_id == NimroseTicket.id)
                .filter(NimroseTicketLink.id == int(link_id), NimroseTicket.id == int(ticket_id), NimroseTicket.user_id == _user_id())
                .first()
            )
            if not link:
                raise cherrypy.HTTPError(404, "Link not found")

            # Remove the mirrored inverse link too, so the relationship
            # doesn't dangle one-sided on the other ticket.
            inverse_relation = TICKET_LINK_INVERSE[link.relation]
            inverse = (
                session.query(NimroseTicketLink)
                .filter_by(ticket_id=link.linked_ticket_id, linked_ticket_id=link.ticket_id, relation=inverse_relation)
                .first()
            )
            if inverse:
                session.delete(inverse)
            session.delete(link)
            return {"deleted": True}


class NimroseTicketActivityController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, ticket_id):
        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")
            activity = (
                session.query(NimroseTicketActivity)
                .filter_by(ticket_id=ticket.id)
                .order_by(NimroseTicketActivity.created_at.desc())
                .all()
            )
            return [a.to_dict() for a in activity]


class NimroseNotesController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, note_id=None, folder=None, tag=None, q=None):
        with get_session() as session:
            if note_id is not None:
                note = session.query(NimroseNote).filter_by(id=int(note_id), user_id=_user_id()).first()
                if not note:
                    raise cherrypy.HTTPError(404, "Note not found")
                return note.to_dict()

            query = session.query(NimroseNote).filter_by(user_id=_user_id())
            if folder:
                query = query.filter_by(folder=folder)
            if q:
                like = f"%{q}%"
                query = query.filter((NimroseNote.title.ilike(like)) | (NimroseNote.content.ilike(like)))
            notes = query.order_by(NimroseNote.pinned.desc(), NimroseNote.updated_at.desc()).all()
            if tag:
                notes = [n for n in notes if tag in (n.tags or [])]
            return [n.to_dict() for n in notes]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        title = (body.get("title") or "").strip() or "Untitled note"

        with get_session() as session:
            note = NimroseNote(
                user_id=_user_id(),
                title=title,
                content=body.get("content", ""),
                content_format="html" if body.get("contentFormat") == "html" else "markdown",
                folder=body.get("folder") or None,
                tags=body.get("tags") or [],
                pinned=1 if body.get("pinned") else 0,
            )
            session.add(note)
            session.flush()
            return note.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, note_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            note = session.query(NimroseNote).filter_by(id=int(note_id), user_id=_user_id()).first()
            if not note:
                raise cherrypy.HTTPError(404, "Note not found")

            if "title" in body:
                note.title = (body["title"] or "").strip() or "Untitled note"
            if "content" in body:
                note.content = body["content"]
            if "contentFormat" in body:
                note.content_format = "html" if body["contentFormat"] == "html" else "markdown"
            if "folder" in body:
                note.folder = body["folder"] or None
            if "tags" in body:
                note.tags = body["tags"] or []
            if "pinned" in body:
                note.pinned = 1 if body["pinned"] else 0

            session.flush()
            return note.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, note_id):
        with get_session() as session:
            note = session.query(NimroseNote).filter_by(id=int(note_id), user_id=_user_id()).first()
            if not note:
                raise cherrypy.HTTPError(404, "Note not found")
            session.delete(note)
            return {"deleted": True}
