import datetime

import cherrypy

from app.db import get_session
from app.models import TASK_PRIORITIES, TASK_STATUSES, NimroseCalendarEvent, NimroseProject, NimroseTask


def _user_id():
    return int(cherrypy.request.user["sub"])


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
            project = NimroseProject(user_id=_user_id(), name=name, color=body.get("color"))
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
