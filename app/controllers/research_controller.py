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
from urllib.parse import quote_plus

import cherrypy

from app.cosmos import wikipedia
from app.db import get_session
from app.notify import notify
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


def _build_brief(item: CosmosSavedItem) -> dict:
    title, object_type, data = item.title, item.object_type, item.data_json
    try:
        wiki = wikipedia.research_summary(title)
    except Exception:
        wiki = None

    wiki_data = (wiki or {}).get("data") or {}
    extract = wiki_data.get("extract")
    detailed = wiki_data.get("detailedExtract") or extract

    # Dynamically grows the image gallery with whatever Wikipedia turns up
    # for this object — the lead thumbnail plus other images found in the
    # article — instead of only ever showing what was there at save time.
    images = list(item.research_images_json or [])
    existing_urls = {img["url"] for img in images}
    candidates = []
    if wiki_data.get("thumbnailUrl"):
        candidates.append({"url": wiki_data["thumbnailUrl"], "caption": wiki_data.get("title") or title})
    for img in wiki_data.get("articleImages") or []:
        candidates.append({"url": img["url"], "caption": img.get("title") or title})
    for c in candidates:
        if c["url"] not in existing_urls:
            images.append({**c, "source": "Wikipedia", "addedAt": datetime.datetime.utcnow().isoformat() + "Z"})
            existing_urls.add(c["url"])
    item.research_images_json = images

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


def _merge_next_steps(existing: list[dict], fresh: list[dict]) -> list[dict]:
    """Refreshing the brief shouldn't wipe out steps the user has checked
    off, edited, manually added, or removed — it only appends newly
    suggested steps whose text isn't already present."""
    existing_texts = {s["text"].strip().lower() for s in existing}
    merged = list(existing)
    for step in fresh:
        if step["text"].strip().lower() not in existing_texts:
            merged.append(step)
    return merged


def _auto_research_note_body(item_title: str, step_text: str, query: str) -> str:
    """Pulls a real Wikipedia extract for the checklist step's specific
    topic (not just the parent object) when one resolves, so "Findings"
    starts with actual sourced content instead of a blank placeholder —
    still never a fabricated claim: if nothing resolves, it says so
    honestly and falls back to search links instead of making something up."""
    q = quote_plus(query)
    wiki_q = quote_plus(step_text)

    findings_lines = ["_Write what you find here._"]
    try:
        wiki = wikipedia.research_summary(query)
        wiki_data = (wiki or {}).get("data") or {}
        extract = wiki_data.get("detailedExtract") or wiki_data.get("extract")
        if extract and wiki_data.get("title"):
            findings_lines = [
                f"_From Wikipedia — [{wiki_data['title']}]({wiki_data.get('pageUrl') or ''})_",
                "",
                extract,
            ]
    except Exception:
        pass

    return "\n".join(
        [
            f"# {step_text}",
            "",
            f"_Auto-research started from the checklist for **{item_title}**._",
            "",
            "## Findings",
            "",
            *findings_lines,
            "",
            "## Search further",
            "",
            f"- [Wikipedia search]({f'https://en.wikipedia.org/w/index.php?search={wiki_q}'})",
            f"- [Google Scholar]({f'https://scholar.google.com/scholar?q={q}'})",
            f"- [NASA ADS]({f'https://ui.adsabs.harvard.edu/search/q={q}'})",
        ]
    )


_TAG_RE = None


def _strip_html(html: str) -> str:
    """Plain-text fallback for embedding a rich (HTML) document's content
    into the markdown report — a light strip, not a full renderer, since
    the goal is a readable excerpt, not pixel-perfect reformatting."""
    import re

    global _TAG_RE
    if _TAG_RE is None:
        _TAG_RE = re.compile(r"<[^>]+>")
    text = _TAG_RE.sub(" ", html or "")
    return re.sub(r"[ \t]+", " ", text).strip()


def _build_report_markdown(item: CosmosSavedItem, brief: dict, docs: list, images: list) -> str:
    """Assembles everything gathered on a research item — the automated
    brief, the checklist's completion state, every document written for
    it, and its image gallery — into one consolidated, downloadable
    document. This is the actual "finish the research" deliverable, not
    another starter stub: real content pulled from what's already there,
    not fabricated new claims."""
    lines = [f"# {item.title} — Research Report", ""]
    lines.append(f"_Generated {datetime.datetime.utcnow().strftime('%Y-%m-%d')} · Source: {item.source or 'Unknown'}_")
    lines.append("")

    summary = brief.get("detailedSummary") or brief.get("summary")
    if summary:
        lines += ["## Summary", "", summary, ""]

    key_points = brief.get("keyPoints") or []
    if key_points:
        lines.append("## Key points")
        lines.append("")
        lines += [f"- {p}" for p in key_points]
        lines.append("")

    next_steps = brief.get("nextSteps") or []
    if next_steps:
        done_count = sum(1 for s in next_steps if s.get("done"))
        lines.append(f"## Research checklist ({done_count}/{len(next_steps)} complete)")
        lines.append("")
        lines += [f"- [{'x' if s.get('done') else ' '}] {s.get('text', '')}" for s in next_steps]
        lines.append("")

    if docs:
        lines.append("## Documents")
        lines.append("")
        for doc in docs:
            lines.append(f"### {doc.title}")
            lines.append("")
            body = doc.content or ""
            if doc.content_format == "html":
                body = _strip_html(body)
            lines.append(body.strip() or "_(empty)_")
            lines.append("")

    if images:
        lines.append("## Images")
        lines.append("")
        for img in images:
            caption = img.get("caption") or ""
            source = img.get("source") or ""
            lines.append(f"![{caption}]({img.get('url', '')})")
            meta = " · ".join(p for p in [caption, f"Source: {source}" if source else ""] if p)
            if meta:
                lines.append(f"_{meta}_")
            lines.append("")

    return "\n".join(lines).strip() + "\n"


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
                cosmos_item.research_brief_json = _build_brief(cosmos_item)

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

            if created_project:
                notify(session, user_id, "research", f"Research added: {title}", link=f"/research/detail/{cosmos_item.id}")

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
        """Body: {"action": "refresh"} to regenerate the brief (keeps
        existing next-steps' text/done state, only appends newly suggested
        ones), {"action": "toggle_step", "index": N}, {"action": "add_step",
        "text": ...}, {"action": "update_step", "index": N, "text": ...},
        {"action": "remove_step", "index": N}, {"action":
        "auto_research_step", "index": N} (creates a document for that step —
        a real Wikipedia extract when one resolves, else search links — and
        checks it off), {"action": "generate_report"} (assembles the brief,
        checklist, every document, and the image gallery into one
        consolidated report document; regenerating replaces the previous
        one rather than duplicating it), {"action": "add_image", ...}, or
        {"action": "remove_image", "index": N}."""
        body = cherrypy.request.json or {}
        action = body.get("action")
        user_id = _user_id()

        with get_session() as session:
            item = session.query(CosmosSavedItem).filter_by(id=int(item_id), user_id=user_id, collection="research").first()
            if not item:
                raise cherrypy.HTTPError(404, "Research item not found")

            if action == "refresh":
                fresh = _build_brief(item)
                existing = (item.research_brief_json or {}).get("nextSteps") or []
                fresh["nextSteps"] = _merge_next_steps(existing, fresh["nextSteps"])
                item.research_brief_json = fresh
            elif action == "toggle_step":
                index = body.get("index")
                brief = dict(item.research_brief_json or {})
                steps = list(brief.get("nextSteps") or [])
                if index is None or not (0 <= int(index) < len(steps)):
                    raise cherrypy.HTTPError(400, "index is required and must reference an existing step")
                steps[int(index)] = {**steps[int(index)], "done": not steps[int(index)].get("done")}
                brief["nextSteps"] = steps
                item.research_brief_json = brief
            elif action == "add_step":
                text = (body.get("text") or "").strip()
                if not text:
                    raise cherrypy.HTTPError(400, "text is required")
                brief = dict(item.research_brief_json or {})
                steps = list(brief.get("nextSteps") or [])
                steps.append({"text": text, "done": False})
                brief["nextSteps"] = steps
                item.research_brief_json = brief
            elif action == "update_step":
                index = body.get("index")
                text = (body.get("text") or "").strip()
                brief = dict(item.research_brief_json or {})
                steps = list(brief.get("nextSteps") or [])
                if index is None or not (0 <= int(index) < len(steps)) or not text:
                    raise cherrypy.HTTPError(400, "index and a non-empty text are required")
                steps[int(index)] = {**steps[int(index)], "text": text}
                brief["nextSteps"] = steps
                item.research_brief_json = brief
            elif action == "remove_step":
                index = body.get("index")
                brief = dict(item.research_brief_json or {})
                steps = list(brief.get("nextSteps") or [])
                if index is None or not (0 <= int(index) < len(steps)):
                    raise cherrypy.HTTPError(400, "index is required and must reference an existing step")
                steps.pop(int(index))
                brief["nextSteps"] = steps
                item.research_brief_json = brief
            elif action == "auto_research_step":
                index = body.get("index")
                brief = dict(item.research_brief_json or {})
                steps = list(brief.get("nextSteps") or [])
                if index is None or not (0 <= int(index) < len(steps)):
                    raise cherrypy.HTTPError(400, "index is required and must reference an existing step")
                step_text = steps[int(index)]["text"]

                project = _ensure_project(session, item)
                query = f"{step_text} {item.title}".strip()
                note = NimroseNote(
                    user_id=user_id,
                    title=step_text[:150],
                    content=_auto_research_note_body(item.title, step_text, query),
                    folder=project.name,
                    tags=["auto-research"],
                )
                session.add(note)

                steps[int(index)] = {**steps[int(index)], "done": True}
                brief["nextSteps"] = steps
                item.research_brief_json = brief
                session.flush()

                result = _item_summary(session, item)
                result["autoResearchNoteId"] = note.id
                return result
            elif action == "generate_report":
                project = _ensure_project(session, item)
                brief = dict(item.research_brief_json or {})
                # Pull every doc in the project except a report from a
                # previous run (regenerating replaces it, not duplicates it).
                all_docs = session.query(NimroseNote).filter_by(user_id=user_id, folder=project.name).all()
                source_docs = [d for d in all_docs if "final-report" not in (d.tags or []) and d.kind == "note"]
                images = list(item.research_images_json or [])

                report_body = _build_report_markdown(item, brief, source_docs, images)

                existing_report = next((d for d in all_docs if "final-report" in (d.tags or [])), None)
                if existing_report:
                    existing_report.title = f"{item.title} — Research Report"
                    existing_report.content = report_body
                    report_note = existing_report
                else:
                    report_note = NimroseNote(
                        user_id=user_id,
                        title=f"{item.title} — Research Report",
                        content=report_body,
                        folder=project.name,
                        tags=["final-report"],
                    )
                    session.add(report_note)
                session.flush()

                notify(session, user_id, "research", f"Research report generated: {item.title}", link=f"/research/{item.id}")

                result = _item_summary(session, item)
                result["reportNoteId"] = report_note.id
                return result
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
