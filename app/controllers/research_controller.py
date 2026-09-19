"""Cosmos <-> Nimrose integration — "Research this object".

Turns a saved Cosmos object into a real Nimrose research workspace in one
step: a project, a note pre-filled with the object's data and source
provenance, a browser Space with a starting search tab, and a task —
rather than making the user assemble all of that by hand.
"""

import cherrypy

from app.db import get_session
from app.models import (
    CosmosSavedItem,
    NimroseBrowserSpace,
    NimroseBrowserTab,
    NimroseNote,
    NimroseProject,
    NimroseTask,
)

COSMOS_OBJECT_TYPES = ("planet", "asteroid", "exoplanet", "star", "observation", "image", "galaxy", "supernova")


def _user_id():
    return int(cherrypy.request.user["sub"])


def _note_body(title: str, source: str | None, source_dataset: str | None, data: dict | None) -> str:
    lines = [f"# {title}", ""]
    if source:
        provenance = f"**Source:** {source}"
        if source_dataset:
            provenance += f" ({source_dataset})"
        lines += [provenance, ""]
    if data:
        lines.append("## Data snapshot")
        lines.append("")
        for key, value in data.items():
            if key.startswith("_") or value in (None, ""):
                continue
            label = "".join(f" {c}" if c.isupper() else c for c in key).strip().capitalize()
            lines.append(f"- **{label}:** {value}")
        lines.append("")
    lines += ["## Notes", "", "_Start writing here._"]
    return "\n".join(lines)


class ResearchController:
    exposed = True

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
            # 1. Save to the Cosmos Library under the "research" collection
            # (or reuse the existing save if this object was already saved).
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

            # 2. Find-or-create the research project.
            project = session.query(NimroseProject).filter_by(user_id=user_id, name=project_name).first()
            created_project = project is None
            if not project:
                prefix = "".join(c for c in title.upper() if c.isalpha())[:3] or "RES"
                project = NimroseProject(user_id=user_id, name=project_name, key_prefix=prefix)
                session.add(project)
                session.flush()

            # 3. A pre-filled research note (only on first run, so re-running
            # "Research this object" doesn't stomp on notes already written).
            note = None
            if created_project:
                note = NimroseNote(
                    user_id=user_id,
                    title=project_name,
                    content=_note_body(title, source, source_dataset, data),
                    folder=project_name,
                    tags=["cosmos", "research"],
                )
                session.add(note)

                # 4. A browser Space with a starting search tab — real
                # search engines, not a fabricated "source" URL we don't
                # actually have for most object types.
                space = NimroseBrowserSpace(user_id=user_id, name=project_name[:60], position=0)
                session.add(space)
                session.flush()
                search_url = f"https://scholar.google.com/scholar?q={title.replace(' ', '+')}"
                session.add(NimroseBrowserTab(space_id=space.id, url=search_url, title=f"{title} — Scholar search", position=0))

                # 5. A starter task.
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
                "cosmosItem": cosmos_item.to_dict(),
                "project": project.to_dict(),
                "note": note.to_dict() if note else None,
                "browserSpaceId": space.id if space else None,
            }
