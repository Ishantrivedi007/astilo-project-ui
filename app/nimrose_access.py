"""Shared project-access helper for Nimrose's Team/shared-project feature.

Personal rows (project_id IS NULL) stay strictly owner-only everywhere and
never call into this module. Only rows that belong to a real NimroseProject
go through here, so a project's owner and its invited members can share
visibility/edit rights on that project's tasks/notes/tickets/etc. without
touching the ownership model of anything outside a project.
"""

import cherrypy

from app.models import NimroseProject, NimroseProjectMember

_ROLE_ORDER = {"viewer": 0, "editor": 1, "owner": 2}


def project_role(session, project_id, user_id) -> str | None:
    """"owner"/"editor"/"viewer" if user_id can see this project, else None."""
    project = session.get(NimroseProject, int(project_id))
    if not project:
        return None
    if project.user_id == user_id:
        return "owner"
    member = session.query(NimroseProjectMember).filter_by(project_id=project.id, user_id=user_id).first()
    return member.role if member else None


def accessible_project_ids(session, user_id) -> set:
    """Every project id user_id can see — owned outright, or via membership."""
    owned = {row[0] for row in session.query(NimroseProject.id).filter_by(user_id=user_id).all()}
    member_of = {row[0] for row in session.query(NimroseProjectMember.project_id).filter_by(user_id=user_id).all()}
    return owned | member_of


def require_project_access(session, project_id, user_id, min_role="viewer") -> str:
    """Raises 404 (no access at all) or 403 (role too low), else returns the role."""
    role = project_role(session, project_id, user_id)
    if role is None:
        raise cherrypy.HTTPError(404, "Project not found")
    if _ROLE_ORDER[role] < _ROLE_ORDER[min_role]:
        raise cherrypy.HTTPError(403, "You don't have permission to do that on this project")
    return role


def require_entity_access(session, project_id, owner_user_id, user_id, min_role="viewer"):
    """For rows that are EITHER personal (project_id None, owner-only) OR
    project-scoped (shared per that project's membership) — tasks, notes,
    calendar events. Raises 404/403 as require_project_access does."""
    if project_id:
        require_project_access(session, project_id, user_id, min_role=min_role)
    elif owner_user_id != user_id:
        raise cherrypy.HTTPError(404, "Not found")
