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
import html as html_lib
import re
from urllib.parse import quote_plus, urlencode

import cherrypy

from app.cosmos import arxiv, crossref, nasa, openalex, openlibrary, pubmed, wikidata, wikipedia
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


HIPS2FITS_URL = "https://alasky.u-strasbg.fr/hips-image-services/hips2fits"


def _sky_image_url(ra_deg, dec_deg, fov_deg: float = 0.5) -> str | None:
    """A real cutout of the actual sky at these coordinates — CDS
    (Centre de Données astronomiques de Strasbourg)'s free, keyless
    hips2fits service compositing the DSS2 color survey. Not a diagram or
    illustration: this is what a telescope pointed here would actually
    see. Returns None when the object has no known sky position."""
    if ra_deg is None or dec_deg is None:
        return None
    params = {
        "hips": "CDS/P/DSS2/color",
        "width": 400,
        "height": 400,
        "fov": fov_deg,
        "projection": "TAN",
        "coordsys": "icrs",
        "ra": ra_deg,
        "dec": dec_deg,
        "format": "jpg",
    }
    return f"{HIPS2FITS_URL}?{urlencode(params)}"


def _build_brief(item: CosmosSavedItem) -> dict:
    title, object_type, data = item.title, item.object_type, item.data_json
    try:
        wiki = wikipedia.research_summary(title)
    except Exception:
        wiki = None

    wiki_data = (wiki or {}).get("data") or {}
    extract = wiki_data.get("extract")
    detailed = wiki_data.get("detailedExtract") or extract

    # Dynamically grows the image gallery with whatever Wikipedia and NASA's
    # own image library turn up for this object — the Wikipedia lead
    # thumbnail, other images found in the article, and real NASA archive
    # photos/renders — instead of only ever showing what was there at save
    # time, and without requiring the user to manually search first.
    images = list(item.research_images_json or [])
    existing_urls = {img["url"] for img in images}
    candidates = []
    if wiki_data.get("thumbnailUrl"):
        candidates.append({"url": wiki_data["thumbnailUrl"], "caption": wiki_data.get("title") or title, "source": "Wikipedia"})
    for img in wiki_data.get("articleImages") or []:
        candidates.append({"url": img["url"], "caption": img.get("title") or title, "source": "Wikipedia"})
    try:
        nasa_env = nasa.images_search(title, "image", 6)
        for r in (nasa_env.get("data") or {}).get("results") or []:
            if r.get("previewUrl"):
                candidates.append({"url": r["previewUrl"], "caption": r.get("title") or title, "source": "NASA Image and Video Library"})
    except Exception:
        pass
    for c in candidates:
        if c["url"] not in existing_urls:
            images.append({**c, "addedAt": datetime.datetime.utcnow().isoformat() + "Z"})
            existing_urls.add(c["url"])
    item.research_images_json = images

    ra_deg = (data or {}).get("raDeg")
    dec_deg = (data or {}).get("decDeg")

    topics: list[str] = []
    related: list[dict] = []
    if wiki_data.get("title"):
        try:
            topics = wikipedia.categories(wiki_data["title"], limit=8)
        except Exception:
            pass
        try:
            related = wikipedia.related_articles(wiki_data["title"], limit=6)
        except Exception:
            pass

    return {
        "summary": extract,
        "detailedSummary": detailed,
        "wikiTitle": wiki_data.get("title"),
        "wikiUrl": wiki_data.get("pageUrl"),
        "thumbnailUrl": wiki_data.get("thumbnailUrl"),
        "topics": topics,
        "relatedArticles": related,
        "keyPoints": key_points_from_extract(detailed, max_points=8),
        "nextSteps": [{"text": t, "done": False} for t in further_research(object_type, data)],
        "dataSnapshot": {k: v for k, v in (data or {}).items() if not k.startswith("_") and v not in (None, "")},
        "skyImageUrl": _sky_image_url(ra_deg, dec_deg),
        "raDeg": ra_deg,
        "decDeg": dec_deg,
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


def _esc(s) -> str:
    return html_lib.escape(str(s) if s is not None else "")


_WIKI_HEADING_RE = re.compile(r"^(=+)\s*(.+?)\s*\1$")


def _paragraphs_html(text: str) -> str:
    """Splits real prose (a Wikipedia extract) into real <h3>/<p> tags —
    the Action API's plaintext extraction leaves MediaWiki section markers
    ("== History ==") in as literal text rather than stripping them, so
    those get rendered as actual headings instead of showing up as raw
    wiki markup in the document."""
    paras = [p.strip() for p in (text or "").split("\n") if p.strip()]
    html_parts = []
    for p in paras:
        heading = _WIKI_HEADING_RE.match(p)
        if heading:
            level = min(len(heading.group(1)) + 2, 4)  # == -> h3, === -> h4, capped
            html_parts.append(f"<h{level}>{_esc(heading.group(2))}</h{level}>")
        else:
            html_parts.append(f"<p>{_esc(p)}</p>")
    return "".join(html_parts)


def _figure_html(url: str, caption: str, source: str) -> str:
    return (
        f'<figure><img src="{_esc(url)}" alt="{_esc(caption)}" style="max-width:100%;border-radius:8px" />'
        f"<figcaption>{_esc(caption)} — {_esc(source)}</figcaption></figure>"
    )


def _auto_research_note_html(item_title: str, step_text: str, query: str) -> tuple[str, bool]:
    """Tries to actually answer the checklist step, not just point at
    search links — tries a few real Wikipedia queries in order of
    specificity (the step's own topic first, then step+object, then the
    object itself), and when one resolves, pulls its full detailed extract
    plus real images (the article's own photos, and NASA's image library
    for the same query) so the generated document is a genuine, formatted
    write-up with real inline images — not a markdown stub. Falls back
    honestly to search links only when nothing resolves — never fabricates
    a finding. Returns (html, resolved)."""
    q = quote_plus(query)
    wiki_q = quote_plus(step_text)

    wiki_data = {}
    for candidate in (step_text, query, item_title):
        try:
            wiki = wikipedia.research_summary(candidate)
        except Exception:
            continue
        candidate_data = (wiki or {}).get("data") or {}
        if candidate_data.get("detailedExtract") or candidate_data.get("extract"):
            wiki_data = candidate_data
            break

    extract = wiki_data.get("detailedExtract") or wiki_data.get("extract")
    resolved = bool(extract and wiki_data.get("title"))

    figures_html = ""
    if resolved:
        seen_urls = set()
        for img in (wiki_data.get("articleImages") or [])[:3]:
            if img.get("url") and img["url"] not in seen_urls:
                figures_html += _figure_html(img["url"], img.get("title") or step_text, "Wikipedia")
                seen_urls.add(img["url"])
        try:
            nasa_env = nasa.images_search(f"{step_text} {item_title}", "image", 3)
            for r in (nasa_env.get("data") or {}).get("results") or []:
                if r.get("previewUrl") and r["previewUrl"] not in seen_urls:
                    figures_html += _figure_html(r["previewUrl"], r.get("title") or step_text, "NASA Image and Video Library")
                    seen_urls.add(r["previewUrl"])
        except Exception:
            pass

    topics_html = ""
    related_html = ""
    if resolved:
        findings_html = (
            f'<p><em>From Wikipedia — <a href="{_esc(wiki_data.get("pageUrl") or "")}" target="_blank" rel="noreferrer">{_esc(wiki_data["title"])}</a></em></p>'
            + _paragraphs_html(extract)
            + figures_html
        )

        try:
            cats = wikipedia.categories(wiki_data["title"], limit=8)
        except Exception:
            cats = []
        if cats:
            topics_html = "<h2>Topics</h2><p>" + " · ".join(_esc(c) for c in cats) + "</p>"

        try:
            related = wikipedia.related_articles(wiki_data["title"], limit=6)
        except Exception:
            related = []
        if related:
            items = "".join(
                f'<li><a href="{_esc(r.get("pageUrl") or "")}" target="_blank" rel="noreferrer">{_esc(r["title"])}</a>'
                + (f" — {_esc(r['description'])}" if r.get("description") else "")
                + "</li>"
                for r in related
            )
            related_html = f"<h2>Related articles</h2><ul>{items}</ul>"
    else:
        findings_html = "<p><em>No Wikipedia article resolved for this specific step — use the search links below.</em></p>"

    html = (
        f"<h1>{_esc(step_text)}</h1>"
        f"<p><em>Auto-research for {_esc(item_title)}.</em></p>"
        "<h2>Findings</h2>"
        f"{findings_html}"
        f"{topics_html}"
        f"{related_html}"
        "<h2>Search further</h2>"
        "<ul>"
        f'<li><a href="https://en.wikipedia.org/w/index.php?search={wiki_q}" target="_blank" rel="noreferrer">Wikipedia search</a></li>'
        f'<li><a href="https://scholar.google.com/scholar?q={q}" target="_blank" rel="noreferrer">Google Scholar</a></li>'
        f'<li><a href="https://ui.adsabs.harvard.edu/search/q={q}" target="_blank" rel="noreferrer">NASA ADS</a></li>'
        f'<li><a href="https://arxiv.org/search/?searchtype=all&amp;query={q}" target="_blank" rel="noreferrer">arXiv preprints</a></li>'
        "</ul>"
    )
    return html, resolved


def _markdown_body_to_html(text: str) -> str:
    """Light markdown-ish -> HTML conversion for embedding an older
    plain-text/Markdown document's content into the HTML report — handles
    the shapes this module itself produces (blank-line paragraphs and
    "- " bullet lines); not a full Markdown parser, since real Markdown
    documents also get embedded as escaped preformatted text otherwise."""
    lines = (text or "").split("\n")
    html_parts = []
    para: list[str] = []
    in_list = False

    def flush_para():
        nonlocal para
        if para:
            html_parts.append(f"<p>{_esc(' '.join(para))}</p>")
            para = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- "):
            flush_para()
            if not in_list:
                html_parts.append("<ul>")
                in_list = True
            html_parts.append(f"<li>{_esc(stripped[2:])}</li>")
            continue
        if in_list:
            html_parts.append("</ul>")
            in_list = False
        if not stripped:
            flush_para()
            continue
        para.append(stripped)
    flush_para()
    if in_list:
        html_parts.append("</ul>")
    return "".join(html_parts)


def _bar_breakdown_html(title: str, counts: dict) -> str:
    """A small inline-CSS bar chart — no charting library needed for a
    server-rendered report, and no JS is available once this HTML is
    exported/printed anyway."""
    total = sum(counts.values()) or 1
    colors = ["#f59e0b", "#22d3ee", "#f43f5e", "#a78bfa", "#34d399"]
    rows = []
    for i, (label, n) in enumerate(counts.items()):
        pct = round(n / total * 100)
        color = colors[i % len(colors)]
        rows.append(
            f'<div style="display:flex;align-items:center;gap:8px;margin:4px 0">'
            f'<span style="width:110px;font-size:13px">{_esc(label)}</span>'
            f'<div style="flex:1;background:#eee;border-radius:4px;overflow:hidden;height:14px">'
            f'<div style="width:{pct}%;background:{color};height:100%"></div></div>'
            f'<span style="width:34px;font-size:12px;text-align:right">{n}</span></div>'
        )
    return f"<h2>{_esc(title)}</h2>" + "".join(rows)


def _build_report_html(item: CosmosSavedItem, brief: dict, docs: list, images: list, task_counts: dict | None = None) -> str:
    """Assembles everything gathered on a research item — the automated
    brief, the sky-position image, the checklist's completion state, every
    document written for it (rendered, not markdown source), and its image
    gallery — into one consolidated, fully-formatted document with real
    inline images. This is the actual "finish the research" deliverable,
    not another starter stub: real content pulled from what's already
    there, not fabricated new claims."""
    parts = [
        f"<h1>{_esc(item.title)} — Research Report</h1>",
        f"<p><em>Generated {datetime.datetime.utcnow().strftime('%Y-%m-%d')} · Source: {_esc(item.source or 'Unknown')}</em></p>",
    ]

    summary = brief.get("detailedSummary") or brief.get("summary")
    if summary:
        parts.append("<h2>Summary</h2>")
        parts.append(_paragraphs_html(summary))

    if brief.get("skyImageUrl"):
        parts.append("<h2>Sky position</h2>")
        parts.append(f"<p>RA {_esc(brief.get('raDeg'))}°, Dec {_esc(brief.get('decDeg'))}°</p>")
        parts.append(_figure_html(brief["skyImageUrl"], f"Sky imagery centered on {item.title}", "CDS hips2fits (DSS2 survey)"))

    key_points = brief.get("keyPoints") or []
    if key_points:
        parts.append("<h2>Key points</h2>")
        parts.append("<ul>" + "".join(f"<li>{_esc(p)}</li>" for p in key_points) + "</ul>")

    topics = brief.get("topics") or []
    if topics:
        parts.append("<h2>Topics</h2>")
        parts.append("<p>" + " · ".join(_esc(t) for t in topics) + "</p>")

    related = brief.get("relatedArticles") or []
    if related:
        parts.append("<h2>Related articles</h2>")
        parts.append(
            "<ul>"
            + "".join(
                f'<li><a href="{_esc(r.get("pageUrl") or "")}" target="_blank" rel="noreferrer">{_esc(r.get("title"))}</a>'
                + (f" — {_esc(r['description'])}" if r.get("description") else "")
                + "</li>"
                for r in related
            )
            + "</ul>"
        )

    next_steps = brief.get("nextSteps") or []
    if next_steps:
        done_count = sum(1 for s in next_steps if s.get("done"))
        parts.append(f"<h2>Research checklist ({done_count}/{len(next_steps)} complete)</h2>")
        parts.append(
            "<ul>"
            + "".join(f"<li>{'✅' if s.get('done') else '⬜'} {_esc(s.get('text', ''))}</li>" for s in next_steps)
            + "</ul>"
        )
        parts.append(_bar_breakdown_html("Checklist progress", {"Done": done_count, "Pending": len(next_steps) - done_count}))

    if task_counts:
        parts.append(_bar_breakdown_html("Linked tasks by status", task_counts))

    if docs:
        parts.append("<h2>Documents</h2>")
        for doc in docs:
            parts.append(f"<h3>{_esc(doc.title)}</h3>")
            body = doc.content or ""
            parts.append(body if doc.content_format == "html" else (_markdown_body_to_html(body) or "<p><em>(empty)</em></p>"))

    if images:
        parts.append("<h2>Images</h2>")
        for img in images:
            parts.append(_figure_html(img.get("url", ""), img.get("caption") or item.title, img.get("source") or "Unknown"))

    return "".join(parts)


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
                space = NimroseBrowserSpace(user_id=user_id, name=project_name[:60], position=0, project_id=project.id)
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
        ones), {"action": "rename", "title": ...} (corrects the item's
        title — doesn't itself regenerate the brief, follow with "refresh"),
        {"action": "toggle_step", "index": N}, {"action": "add_step",
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
            elif action == "rename":
                # Lets a research item's title be corrected — matters because
                # the title is also what's searched on Wikipedia to build the
                # brief: an ambiguous catalog designation (e.g. "M 31") can
                # resolve to a completely unrelated article, and the only way
                # to fix an already-created item is to give it a better title
                # and regenerate, not just delete and start over.
                new_title = (body.get("title") or "").strip()
                if not new_title:
                    raise cherrypy.HTTPError(400, "title is required")
                item.title = new_title[:255]
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
                note_body, note_resolved = _auto_research_note_html(item.title, step_text, query)
                note = NimroseNote(
                    user_id=user_id,
                    title=step_text[:150],
                    content=note_body,
                    content_format="html",
                    folder=project.name,
                    project_id=project.id,
                    tags=["auto-research", "resolved" if note_resolved else "needs-manual-research"],
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

                project_tasks = session.query(NimroseTask).filter_by(project_id=project.id).all()
                task_counts: dict = {}
                for t in project_tasks:
                    task_counts[t.status] = task_counts.get(t.status, 0) + 1

                report_body = _build_report_html(item, brief, source_docs, images, task_counts)

                existing_report = next((d for d in all_docs if "final-report" in (d.tags or [])), None)
                if existing_report:
                    existing_report.title = f"{item.title} — Research Report"
                    existing_report.content = report_body
                    existing_report.content_format = "html"
                    existing_report.project_id = existing_report.project_id or project.id
                    report_note = existing_report
                else:
                    report_note = NimroseNote(
                        user_id=user_id,
                        title=f"{item.title} — Research Report",
                        content=report_body,
                        content_format="html",
                        folder=project.name,
                        project_id=project.id,
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
            elif action == "add_source":
                if not (body.get("title") and body.get("source")):
                    raise cherrypy.HTTPError(400, "title and source are required")
                sources = list(item.research_sources_json or [])
                sources.append({
                    "title": body.get("title"),
                    "url": body.get("url"),
                    "snippet": body.get("snippet"),
                    "source": body.get("source"),
                    "externalId": body.get("externalId"),
                    "addedAt": datetime.datetime.utcnow().isoformat() + "Z",
                })
                item.research_sources_json = sources
            elif action == "remove_source":
                index = body.get("index")
                sources = list(item.research_sources_json or [])
                if index is None or not (0 <= int(index) < len(sources)):
                    raise cherrypy.HTTPError(400, "index is required and must reference an existing source")
                sources.pop(int(index))
                item.research_sources_json = sources
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


_EXTERNAL_SOURCES = {
    "wikidata": wikidata.search,
    "arxiv": arxiv.search,
    "pubmed": pubmed.search,
    "openalex": openalex.search,
    "crossref": crossref.search,
    "openlibrary": openlibrary.search,
}


class ResearchExternalSearchController:
    """GET /api/research/external-search?source=...&q=... — search-then-add
    UX for Wikidata/arXiv/PubMed/OpenAlex/Crossref/Open Library, mirroring
    the existing NASA image search flow. Results aren't saved here; the
    frontend POSTs the chosen ones as {action: "add_source"} on
    ResearchController.PUT."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, source, q, limit=10):
        search_fn = _EXTERNAL_SOURCES.get(source)
        if not search_fn:
            raise cherrypy.HTTPError(400, f"source must be one of {', '.join(_EXTERNAL_SOURCES)}")
        query = (q or "").strip()
        if not query:
            raise cherrypy.HTTPError(400, "q is required")
        try:
            return search_fn(query, int(limit))
        except Exception:
            raise cherrypy.HTTPError(502, f"{source} search failed — try again shortly")


class ResearchLinkedProjectsController:
    """GET /api/nimrose/research-projects — every NimroseProject that is the
    target of at least one research-collection CosmosSavedItem, for the
    Nimrose Workspace section's topic picker. Keyed off the project (not the
    Cosmos item) since the Workspace view bundles project-scoped data
    (tasks/notes/browser spaces); the join is deduped in case more than one
    research item ever points at the same project."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            rows = (
                session.query(NimroseProject, CosmosSavedItem)
                .join(CosmosSavedItem, CosmosSavedItem.research_project_id == NimroseProject.id)
                .filter(NimroseProject.user_id == user_id, CosmosSavedItem.collection == "research")
                .order_by(CosmosSavedItem.created_at.desc())
                .all()
            )
            seen = {}
            for project, item in rows:
                if project.id not in seen:
                    seen[project.id] = {**project.to_dict(), "researchItemId": item.id, "researchTitle": item.title}
            return list(seen.values())
