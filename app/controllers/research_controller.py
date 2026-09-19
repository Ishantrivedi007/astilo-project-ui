"""Cosmos <-> Nimrose integration — the Research module.

"Research this object" turns a saved Cosmos object into a full research
workspace: an automated brief (real Wikipedia summary, key points, and a
further-research checklist — stored structured on the CosmosSavedItem, not
buried in a Note), a Nimrose project, a browser Space with a starting search
tab, and a task. The brief can be regenerated on demand. Freeform documents
(NimroseNotes scoped to the project) are managed separately via full CRUD
from the dedicated Research page, not auto-written into note text.
"""

import datetime

import cherrypy

from app.cosmos import wikipedia
from app.db import get_session
from app.models import (
    CosmosSavedItem,
    NimroseBrowserSpace,
    NimroseBrowserTab,
    NimroseNote,
    NimroseProject,
    NimroseTask,
)
from app.research_brief import further_research, key_points_from_extract

COSMOS_OBJECT_TYPES = ("planet", "asteroid", "exoplanet", "star", "observation", "image", "galaxy", "supernova")


def _user_id():
    return int(cherrypy.request.user["sub"])


def _build_brief(title: str, object_type: str, data: dict | None) -> dict:
    try:
        wiki = wikipedia.research_summary(title)
    except Exception:
        wiki = None

    wiki_data = (wiki or {}).get("data") or {}
    extract = wiki_data.get("extract")
    detailed = wiki_data.get("detailedExtract") or extract

    return {
        "summary": extract,
        "detailedSummary": detailed,
        "wikiTitle": wiki_data.get("title"),
        "wikiUrl": wiki_data.get("pageUrl"),
        "thumbnailUrl": wiki_data.get("thumbnailUrl"),
        "keyPoints": key_points_from_extract(detailed, max_points=8),
        "nextSteps": [{"text": t, "done": False} for t in further_research(object_type, data)],
        "dataSnapshot": {k: v for k, v in (data or {}).items() if not k.startswith("_") and v not in (None, "")},
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
    }


def _ensure_project(session, item: CosmosSavedItem) -> NimroseProject:
    """Attaches a Nimrose project to a research item that doesn't have one
    yet — covers items created before research_project_id existed, so
    "New document" etc. work for them too instead of silently no-opping."""
    if item.research_project_id:
        project = session.get(NimroseProject, item.research_project_id)
        if project:
            return project

    project_name = f"Research: {item.title}"[:150]
    project = session.query(NimroseProject).filter_by(user_id=item.user_id, name=project_name).first()
    if not project:
        prefix = "".join(c for c in item.title.upper() if c.isalpha())[:3] or "RES"
        project = NimroseProject(user_id=item.user_id, name=project_name, key_prefix=prefix)
        session.add(project)
        session.flush()

    item.research_project_id = project.id
    session.flush()
    return project


def _item_summary(session, item: CosmosSavedItem) -> dict:
    d = item.to_dict()
    project = session.get(NimroseProject, item.research_project_id) if item.research_project_id else None
    doc_count = 0
    if project:
        doc_count = session.query(NimroseNote).filter_by(user_id=item.user_id, folder=project.name).count()
    d["project"] = project.to_dict() if project else None
    d["documentCount"] = doc_count
    return d


class ResearchController:
    """The full Research module: GET (list or one item), POST (create/attach
    a research workspace to a Cosmos object), PUT (refresh the brief or
    toggle a checklist item), DELETE (tear down a research item and its
    linked project/notes/tasks/Space)."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, item_id=None):
        user_id = _user_id()
        with get_session() as session:
            if item_id is not None:
                item = session.query(CosmosSavedItem).filter_by(id=int(item_id), user_id=user_id, collection="research").first()
                if not item:
                    raise cherrypy.HTTPError(404, "Research item not found")
                _ensure_project(session, item)
                return _item_summary(session, item)

            items = (
                session.query(CosmosSavedItem)
                .filter_by(user_id=user_id, collection="research")
                .order_by(CosmosSavedItem.created_at.desc())
                .all()
            )
            return [_item_summary(session, item) for item in items]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        object_type = body.get("objectType")
        external_id = str(body.get("externalId", ""))
        title = (body.get("title") or "").strip()
        source = body.get("source")
        source_dataset = body.get("sourceDataset")
        data = body.get("data")

        if object_type not in COSMOS_OBJECT_TYPES or not external_id or not title:
            raise cherrypy.HTTPError(400, f"objectType ({'|'.join(COSMOS_OBJECT_TYPES)}), externalId and title are required")

        user_id = _user_id()
        project_name = f"Research: {title}"[:150]

        with get_session() as session:
            cosmos_item = (
                session.query(CosmosSavedItem)
                .filter_by(user_id=user_id, object_type=object_type, external_id=external_id)
                .first()
            )
            if not cosmos_item:
                cosmos_item = CosmosSavedItem(
                    user_id=user_id,
                    object_type=object_type,
                    external_id=external_id,
                    collection="research",
                    title=title,
                    source=source,
                    source_dataset=source_dataset,
                    image_url=body.get("imageUrl"),
                    data_json=data,
                )
                session.add(cosmos_item)
                session.flush()
            elif cosmos_item.collection != "research":
                cosmos_item.collection = "research"

            project = session.query(NimroseProject).filter_by(user_id=user_id, name=project_name).first()
            created_project = project is None
            if not project:
                prefix = "".join(c for c in title.upper() if c.isalpha())[:3] or "RES"
                project = NimroseProject(user_id=user_id, name=project_name, key_prefix=prefix)
                session.add(project)
                session.flush()

            cosmos_item.research_project_id = project.id
            if not cosmos_item.research_brief_json:
                cosmos_item.research_brief_json = _build_brief(title, object_type, data)

            if created_project:
                space = NimroseBrowserSpace(user_id=user_id, name=project_name[:60], position=0)
                session.add(space)
                session.flush()
                search_url = f"https://scholar.google.com/scholar?q={title.replace(' ', '+')}"
                session.add(NimroseBrowserTab(space_id=space.id, url=search_url, title=f"{title} — Scholar search", position=0))

                session.add(
                    NimroseTask(
                        user_id=user_id,
                        project_id=project.id,
                        title=f"Research {title}",
                        description=f"Started from Cosmos ({source or 'unknown source'}).",
                        status="inbox",
                        priority="medium",
                    )
                )
            else:
                space = session.query(NimroseBrowserSpace).filter_by(user_id=user_id, name=project_name[:60]).first()

            session.flush()

            return {
                "createdNew": created_project,
                "cosmosItem": _item_summary(session, cosmos_item),
                "browserSpaceId": space.id if space else None,
            }

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, item_id):
        """Body: {"action": "refresh"} to regenerate the brief,
        {"action": "toggle_step", "index": N} to check/uncheck a next-step,
        {"action": "add_image", "url": ..., "caption": ..., "source": ...}
        to add to the image gallery, or
        {"action": "remove_image", "index": N} to remove one."""
        body = cherrypy.request.json or {}
        action = body.get("action")
        user_id = _user_id()

        with get_session() as session:
            item = session.query(CosmosSavedItem).filter_by(id=int(item_id), user_id=user_id, collection="research").first()
            if not item:
                raise cherrypy.HTTPError(404, "Research item not found")

            if action == "refresh":
                item.research_brief_json = _build_brief(item.title, item.object_type, item.data_json)
            elif action == "toggle_step":
                index = body.get("index")
                brief = dict(item.research_brief_json or {})
                steps = list(brief.get("nextSteps") or [])
                if index is None or not (0 <= int(index) < len(steps)):
                    raise cherrypy.HTTPError(400, "index is required and must reference an existing step")
                steps[int(index)] = {**steps[int(index)], "done": not steps[int(index)].get("done")}
                brief["nextSteps"] = steps
                item.research_brief_json = brief
            elif action == "add_image":
                url = (body.get("url") or "").strip()
                if not url:
                    raise cherrypy.HTTPError(400, "url is required")
                images = list(item.research_images_json or [])
                images.append(
                    {
                        "url": url,
                        "caption": (body.get("caption") or "").strip() or None,
                        "source": (body.get("source") or "").strip() or None,
                        "addedAt": datetime.datetime.utcnow().isoformat() + "Z",
                    }
                )
                item.research_images_json = images
            elif action == "remove_image":
                index = body.get("index")
                images = list(item.research_images_json or [])
                if index is None or not (0 <= int(index) < len(images)):
                    raise cherrypy.HTTPError(400, "index is required and must reference an existing image")
                images.pop(int(index))
                item.research_images_json = images
            else:
                raise cherrypy.HTTPError(400, "unknown action")

            session.flush()
            return _item_summary(session, item)

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, item_id):
        """Removes the research item and its linked project (and that
        project's notes/tasks/browser Space) — a full teardown, not just
        unlinking, since a research project has no purpose without its
        source object."""
        user_id = _user_id()
        with get_session() as session:
            item = session.query(CosmosSavedItem).filter_by(id=int(item_id), user_id=user_id, collection="research").first()
            if not item:
                raise cherrypy.HTTPError(404, "Research item not found")

            project = session.get(NimroseProject, item.research_project_id) if item.research_project_id else None
            if project:
                for note in session.query(NimroseNote).filter_by(user_id=user_id, folder=project.name).all():
                    session.delete(note)
                for task in session.query(NimroseTask).filter_by(user_id=user_id, project_id=project.id).all():
                    session.delete(task)
                space = session.query(NimroseBrowserSpace).filter_by(user_id=user_id, name=project.name[:60]).first()
                if space:
                    for tab in session.query(NimroseBrowserTab).filter_by(space_id=space.id).all():
                        session.delete(tab)
                    session.delete(space)
                session.delete(project)

            session.delete(item)
            return {"deleted": True}
