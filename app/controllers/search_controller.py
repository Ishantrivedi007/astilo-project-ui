"""Universal Search (Ctrl+K) — a single endpoint that fans out to the
handful of entity types that actually have a stable place to deep-link to:
Store products (public catalogue), the user's own Library books, and their
Nimrose tasks/notes/tickets (own + shared-project ones, via the same
accessible_project_ids scoping the Nimrose module itself uses). Everything
else in the app (Movies/Music/Anime/Cosmos/Markets/...) is reached through
the client's static per-module navigation entries instead — those are
external-API-backed catalogues with no local row to search."""

import cherrypy

from app.db import get_session
from app.models import LibraryEntry, NimroseNote, NimroseTask, NimroseTicket, Product
from app.nimrose_access import accessible_project_ids

RESULT_LIMIT = 6


class GlobalSearchController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, q=None):
        query = (q or "").strip()
        if len(query) < 2:
            return {"products": [], "library": [], "tasks": [], "notes": [], "tickets": []}

        like = f"%{query}%"
        user_id = int(cherrypy.request.user["sub"])

        with get_session() as session:
            products = (
                session.query(Product)
                .filter(Product.name.ilike(like))
                .limit(RESULT_LIMIT)
                .all()
            )

            library = (
                session.query(LibraryEntry)
                .filter(LibraryEntry.user_id == user_id, LibraryEntry.title.ilike(like))
                .limit(RESULT_LIMIT)
                .all()
            )

            project_ids = list(accessible_project_ids(session, user_id))
            own_or_shared = lambda col_user, col_project: (col_user == user_id) | (col_project.in_(project_ids))  # noqa: E731

            tasks = (
                session.query(NimroseTask)
                .filter(own_or_shared(NimroseTask.user_id, NimroseTask.project_id))
                .filter(NimroseTask.title.ilike(like))
                .limit(RESULT_LIMIT)
                .all()
            )

            notes = (
                session.query(NimroseNote)
                .filter(own_or_shared(NimroseNote.user_id, NimroseNote.project_id))
                .filter(NimroseNote.title.ilike(like))
                .limit(RESULT_LIMIT)
                .all()
            )

            tickets = (
                session.query(NimroseTicket)
                .filter(NimroseTicket.project_id.in_(project_ids))
                .filter((NimroseTicket.title.ilike(like)) | (NimroseTicket.ticket_key.ilike(like)))
                .limit(RESULT_LIMIT)
                .all()
            )

            return {
                "products": [p.to_dict() for p in products],
                "library": [entry.to_dict() for entry in library],
                "tasks": [{"id": t.id, "title": t.title, "projectId": t.project_id} for t in tasks],
                "notes": [{"id": n.id, "title": n.title, "projectId": n.project_id} for n in notes],
                "tickets": [
                    {"id": tk.id, "title": tk.title, "ticketKey": tk.ticket_key, "projectId": tk.project_id}
                    for tk in tickets
                ],
            }
