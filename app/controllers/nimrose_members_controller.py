import cherrypy

from app.db import get_session
from app.nimrose_access import require_project_access
from app.models import PROJECT_MEMBER_ROLES, NimroseProject, NimroseProjectActivity, NimroseProjectMember, User


def _user_id():
    return int(cherrypy.request.user["sub"])


def _log_project_activity(session, project_id, action, detail=None):
    session.add(NimroseProjectActivity(project_id=project_id, actor_user_id=_user_id(), action=action, detail=detail))


class NimroseProjectMembersController:
    """The Project Workspace hub's Team tab — real shared access, not just
    a roster. A member's role (owner/editor/viewer) is checked by
    app.nimrose_access.require_project_access at every project-scoped query
    site across Nimrose's other controllers."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, project_id):
        with get_session() as session:
            require_project_access(session, project_id, _user_id(), min_role="viewer")
            members = session.query(NimroseProjectMember).filter_by(project_id=int(project_id)).order_by(NimroseProjectMember.created_at.asc()).all()
            return [m.to_dict() for m in members]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        project_id = body.get("projectId")
        email = (body.get("email") or "").strip().lower()
        role = body.get("role", "viewer")
        if not project_id or not email:
            raise cherrypy.HTTPError(400, "projectId and email are required")
        if role not in PROJECT_MEMBER_ROLES:
            raise cherrypy.HTTPError(400, f"role must be one of {', '.join(PROJECT_MEMBER_ROLES)}")

        with get_session() as session:
            require_project_access(session, project_id, _user_id(), min_role="owner")
            project = session.get(NimroseProject, int(project_id))

            target = session.query(User).filter_by(email=email).first()
            if not target:
                raise cherrypy.HTTPError(404, "No user with that email")
            if target.id == project.user_id:
                raise cherrypy.HTTPError(400, "That user already owns this project")

            existing = session.query(NimroseProjectMember).filter_by(project_id=project.id, user_id=target.id).first()
            if existing:
                existing.role = role
                session.flush()
                return existing.to_dict()

            member = NimroseProjectMember(project_id=project.id, user_id=target.id, role=role, invited_by_user_id=_user_id())
            session.add(member)
            session.flush()
            _log_project_activity(session, project.id, "member_added", f"{target.name} as {role}")
            return member.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, member_id):
        body = cherrypy.request.json or {}
        role = body.get("role")
        if role not in PROJECT_MEMBER_ROLES:
            raise cherrypy.HTTPError(400, f"role must be one of {', '.join(PROJECT_MEMBER_ROLES)}")

        with get_session() as session:
            member = session.query(NimroseProjectMember).filter_by(id=int(member_id)).first()
            if not member:
                raise cherrypy.HTTPError(404, "Member not found")
            require_project_access(session, member.project_id, _user_id(), min_role="owner")
            member.role = role
            session.flush()
            return member.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, member_id):
        with get_session() as session:
            member = session.query(NimroseProjectMember).filter_by(id=int(member_id)).first()
            if not member:
                raise cherrypy.HTTPError(404, "Member not found")

            uid = _user_id()
            if member.user_id != uid:
                # Removing someone else requires owner rights; removing
                # yourself (leaving a shared project) is always allowed.
                require_project_access(session, member.project_id, uid, min_role="owner")

            if member.role == "owner":
                other_owners = (
                    session.query(NimroseProjectMember)
                    .filter_by(project_id=member.project_id, role="owner")
                    .filter(NimroseProjectMember.id != member.id)
                    .count()
                )
                if other_owners == 0:
                    raise cherrypy.HTTPError(400, "Can't remove the project's last owner")

            member_name = member.user.name if member.user else "A member"
            project_id = member.project_id
            session.delete(member)
            _log_project_activity(session, project_id, "member_removed", member_name)
            return {"deleted": True}
