"""Astilo Code — Terminal, Database Explorer, API Studio, and local
"Git" version history for Studio · Code files. The editor itself and its
storage (NimroseNote, kind="code") live in nimrose_controller.py; these are
the genuinely new capabilities layered on top, each with its own risk
profile:

- Terminal runs real shell commands on this host. It is admin-only and
  off by default (see config.CODE_TERMINAL_ENABLED) — and even enabled, it
  is a restricted working directory + timeout, NOT container/VM isolation
  (no Docker here, per product decision). An admin with terminal access
  can still reach the rest of the host, same as any shell would.
- Database Explorer connects to whatever connection string is supplied at
  request time — nothing is persisted server-side. Admin-only and off by
  default (config.CODE_DATABASE_ENABLED).
- API Studio is a server-side HTTP proxy with SSRF protection (blocks
  loopback/private/link-local targets) — open to any authenticated user
  since it can't reach anything a browser fetch() couldn't already reach
  on the public internet.
- Version history is plain CRUD over NimroseNoteVersion rows.
"""

import datetime
import decimal
import ipaddress
import os
import socket
import subprocess
import time
import urllib.parse

import cherrypy
import requests
from sqlalchemy import create_engine, inspect as sa_inspect, text

from app.config import config
from app.db import get_session
from app.models import ApiStudioRequest, NimroseNote, NimroseNoteVersion, SavedSqlQuery
from app.nimrose_access import require_entity_access


def _user_id():
    return int(cherrypy.request.user["sub"])


# ---------------------------------------------------------------------------
# Terminal
# ---------------------------------------------------------------------------

def _sandbox_dir():
    os.makedirs(config.CODE_SANDBOX_DIR, exist_ok=True)
    return os.path.normpath(config.CODE_SANDBOX_DIR)


def _resolve_in_sandbox(rel_path: str | None) -> str:
    sandbox = _sandbox_dir()
    rel = (rel_path or "").strip().strip("/\\")
    target = os.path.normpath(os.path.join(sandbox, rel)) if rel else sandbox
    if os.path.commonpath([target, sandbox]) != sandbox:
        raise cherrypy.HTTPError(400, "Path must stay inside the sandbox directory")
    return target


class TerminalController:
    """GET ?path=: list a sandbox directory. POST {command, cwd?}: run one
    command in it (shell=True — the admin is running their own commands
    intentionally, same trust level as a real terminal) and return the
    captured output. Not interactive: no PTY, no follow-up stdin, no `cd`
    that persists between calls beyond the `cwd` you pass each time."""

    exposed = True
    MAX_OUTPUT = 100_000

    def _require_enabled(self):
        if not config.CODE_TERMINAL_ENABLED:
            raise cherrypy.HTTPError(403, "Terminal is disabled on this server (set CODE_TERMINAL_ENABLED=true)")

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    def GET(self, path=None):
        self._require_enabled()
        target = _resolve_in_sandbox(path)
        if not os.path.isdir(target):
            raise cherrypy.HTTPError(404, "Not a directory")
        sandbox = _sandbox_dir()
        entries = []
        for name in sorted(os.listdir(target)):
            full = os.path.join(target, name)
            entries.append({
                "name": name,
                "isDir": os.path.isdir(full),
                "size": os.path.getsize(full) if os.path.isfile(full) else None,
            })
        return {"cwd": os.path.relpath(target, sandbox).replace("\\", "/"), "entries": entries}

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        self._require_enabled()
        body = cherrypy.request.json or {}
        command = (body.get("command") or "").strip()
        if not command:
            raise cherrypy.HTTPError(400, "command is required")

        run_dir = _resolve_in_sandbox(body.get("cwd"))
        os.makedirs(run_dir, exist_ok=True)
        sandbox = _sandbox_dir()

        started = time.time()
        timed_out = False
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=run_dir,
                capture_output=True,
                text=True,
                timeout=config.CODE_TERMINAL_TIMEOUT_SECONDS,
            )
            exit_code = result.returncode
            stdout, stderr = result.stdout, result.stderr
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            exit_code = None
            stdout = exc.stdout or ""
            stderr = exc.stderr or ""

        truncated = len(stdout) > self.MAX_OUTPUT or len(stderr) > self.MAX_OUTPUT
        return {
            "exitCode": exit_code,
            "timedOut": timed_out,
            "durationMs": round((time.time() - started) * 1000),
            "cwd": os.path.relpath(run_dir, sandbox).replace("\\", "/"),
            "stdout": stdout[: self.MAX_OUTPUT],
            "stderr": stderr[: self.MAX_OUTPUT],
            "truncated": truncated,
        }

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self):
        """{path, content}: writes a file into the sandbox (creating parent
        directories as needed) — the Code Editor's "Run" button uses this to
        put the file being edited where a subsequent POST command can find
        it. Same sandbox-boundary check as everything else here."""
        self._require_enabled()
        body = cherrypy.request.json or {}
        rel_path = (body.get("path") or "").strip()
        if not rel_path:
            raise cherrypy.HTTPError(400, "path is required")
        content = body.get("content") or ""

        full_path = _resolve_in_sandbox(rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8", newline="") as f:
            f.write(content)

        sandbox = _sandbox_dir()
        return {"path": os.path.relpath(full_path, sandbox).replace("\\", "/")}


# ---------------------------------------------------------------------------
# Database Explorer
# ---------------------------------------------------------------------------

_ALLOWED_DIALECTS = ("postgresql", "postgres", "sqlite", "mysql", "mssql", "oracle")


def _jsonable(value):
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", "replace")
    return value


def _require_database_enabled():
    if not config.CODE_DATABASE_ENABLED:
        raise cherrypy.HTTPError(403, "Database Explorer is disabled on this server (set CODE_DATABASE_ENABLED=true)")


def _build_engine(connection_string: str):
    if "://" not in connection_string:
        raise cherrypy.HTTPError(400, "Not a valid database connection string")
    dialect = connection_string.split("://", 1)[0].split("+")[0].lower()
    if dialect not in _ALLOWED_DIALECTS:
        raise cherrypy.HTTPError(400, f"Unsupported dialect '{dialect}'")
    try:
        return create_engine(connection_string, pool_pre_ping=True)
    except Exception as exc:
        raise cherrypy.HTTPError(400, f"Couldn't build a connection: {exc}")


class DatabaseTablesController:
    """POST {connectionString}: connects and returns the table list.
    Nothing is persisted — the string round-trips from the caller every
    call. Whatever driver the dialect needs (psycopg for Postgres, PyMySQL
    for MySQL, ...) must already be installed here; sqlite3 and Postgres
    work out of the box, others need their driver added first."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        _require_database_enabled()
        body = cherrypy.request.json or {}
        conn_str = (body.get("connectionString") or "").strip()
        if not conn_str:
            raise cherrypy.HTTPError(400, "connectionString is required")

        engine = _build_engine(conn_str)
        try:
            with engine.connect():
                inspector = sa_inspect(engine)
                schemas = [None]
                try:
                    schemas = inspector.get_schema_names() or [None]
                except Exception:
                    pass
                tables = []
                for schema in schemas:
                    try:
                        names = inspector.get_table_names(schema=schema)
                    except Exception:
                        continue
                    for name in names:
                        tables.append({"schema": schema, "name": name})
                return {"tables": tables}
        except cherrypy.HTTPError:
            raise
        except Exception as exc:
            raise cherrypy.HTTPError(400, f"Connection failed: {exc}")
        finally:
            engine.dispose()


class DatabaseQueryController:
    """POST {connectionString, sql}: runs exactly the SQL given and
    returns rows (capped) for SELECT-shaped results, or the affected-row
    count otherwise. No query builder or allowlist in front of it — that's
    what a real DB client tool is for, and the caller is already an
    authenticated admin."""

    exposed = True
    ROW_LIMIT = 500

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        _require_database_enabled()
        body = cherrypy.request.json or {}
        conn_str = (body.get("connectionString") or "").strip()
        sql = (body.get("sql") or "").strip()
        if not conn_str or not sql:
            raise cherrypy.HTTPError(400, "connectionString and sql are required")

        engine = _build_engine(conn_str)
        started = time.time()
        try:
            with engine.connect() as conn:
                result = conn.execute(text(sql))
                duration = round((time.time() - started) * 1000)
                if result.returns_rows:
                    rows = result.fetchmany(self.ROW_LIMIT + 1)
                    truncated = len(rows) > self.ROW_LIMIT
                    rows = rows[: self.ROW_LIMIT]
                    columns = list(result.keys())
                    conn.commit()
                    return {
                        "columns": columns,
                        "rows": [[_jsonable(v) for v in row] for row in rows],
                        "rowCount": len(rows),
                        "truncated": truncated,
                        "durationMs": duration,
                    }
                conn.commit()
                return {"columns": [], "rows": [], "rowCount": result.rowcount, "truncated": False, "durationMs": duration}
        except cherrypy.HTTPError:
            raise
        except Exception as exc:
            raise cherrypy.HTTPError(400, f"Query failed: {exc}")
        finally:
            engine.dispose()


class DatabaseColumnsController:
    """POST {connectionString, table, schema?}: one table's column
    definitions (name, type, nullable, primary key, default) — the
    Database Explorer's "Structure" tab, alongside the row-browsing "Data"
    tab that DatabaseQueryController already covers."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        _require_database_enabled()
        body = cherrypy.request.json or {}
        conn_str = (body.get("connectionString") or "").strip()
        table = (body.get("table") or "").strip()
        schema = body.get("schema") or None
        if not conn_str or not table:
            raise cherrypy.HTTPError(400, "connectionString and table are required")

        engine = _build_engine(conn_str)
        try:
            with engine.connect():
                inspector = sa_inspect(engine)
                try:
                    pk_columns = set(inspector.get_pk_constraint(table, schema=schema).get("constrained_columns") or [])
                except Exception:
                    pk_columns = set()

                columns = []
                for col in inspector.get_columns(table, schema=schema):
                    default = col.get("default")
                    columns.append({
                        "name": col["name"],
                        "type": str(col.get("type")),
                        "nullable": bool(col.get("nullable", True)),
                        "primaryKey": col["name"] in pk_columns,
                        "default": str(default) if default is not None else None,
                    })
                return {"columns": columns}
        except cherrypy.HTTPError:
            raise
        except Exception as exc:
            raise cherrypy.HTTPError(400, f"Couldn't read table structure: {exc}")
        finally:
            engine.dispose()


class DatabaseQueriesController:
    """GET: the user's saved SQL files. POST: save one. PUT/<id>: edit.
    DELETE/<id>: remove. Admin-only, matching the rest of Database
    Explorer — see SavedSqlQuery's docstring for why no connection string
    is stored alongside these."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    def GET(self):
        with get_session() as session:
            items = (
                session.query(SavedSqlQuery)
                .filter_by(user_id=_user_id())
                .order_by(SavedSqlQuery.updated_at.desc())
                .all()
            )
            return [i.to_dict() for i in items]

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        with get_session() as session:
            item = SavedSqlQuery(
                user_id=_user_id(),
                name=(body.get("name") or "").strip() or "Untitled query",
                sql=body.get("sql") or "",
            )
            session.add(item)
            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, query_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            item = session.query(SavedSqlQuery).filter_by(id=int(query_id), user_id=_user_id()).first()
            if not item:
                raise cherrypy.HTTPError(404, "Query not found")
            if "name" in body:
                item.name = (body["name"] or "").strip() or item.name
            if "sql" in body:
                item.sql = body["sql"]
            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    def DELETE(self, query_id):
        with get_session() as session:
            item = session.query(SavedSqlQuery).filter_by(id=int(query_id), user_id=_user_id()).first()
            if not item:
                raise cherrypy.HTTPError(404, "Query not found")
            session.delete(item)
            return {"deleted": True}


# ---------------------------------------------------------------------------
# API Studio
# ---------------------------------------------------------------------------

_BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _assert_public_host(url: str):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise cherrypy.HTTPError(400, "Only http/https URLs are allowed")
    host = parsed.hostname
    if not host:
        raise cherrypy.HTTPError(400, "URL has no host")
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise cherrypy.HTTPError(400, f"Couldn't resolve host '{host}'")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or any(ip in net for net in _BLOCKED_NETWORKS):
            raise cherrypy.HTTPError(400, "Requests to private/internal addresses are not allowed")


class ApiStudioRequestController:
    """GET: the user's saved requests. POST: save one. PUT/<id>: edit.
    DELETE/<id>: remove."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        with get_session() as session:
            items = (
                session.query(ApiStudioRequest)
                .filter_by(user_id=_user_id())
                .order_by(ApiStudioRequest.updated_at.desc())
                .all()
            )
            return [i.to_dict() for i in items]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        url = (body.get("url") or "").strip()
        if not url:
            raise cherrypy.HTTPError(400, "url is required")
        with get_session() as session:
            item = ApiStudioRequest(
                user_id=_user_id(),
                name=(body.get("name") or "").strip() or "Untitled request",
                method=(body.get("method") or "GET").upper(),
                url=url,
                headers=body.get("headers") or {},
                body=body.get("body"),
            )
            session.add(item)
            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, request_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            item = session.query(ApiStudioRequest).filter_by(id=int(request_id), user_id=_user_id()).first()
            if not item:
                raise cherrypy.HTTPError(404, "Request not found")
            if "name" in body:
                item.name = (body["name"] or "").strip() or item.name
            if "method" in body:
                item.method = (body["method"] or "GET").upper()
            if "url" in body:
                item.url = body["url"]
            if "headers" in body:
                item.headers = body["headers"]
            if "body" in body:
                item.body = body["body"]
            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, request_id):
        with get_session() as session:
            item = session.query(ApiStudioRequest).filter_by(id=int(request_id), user_id=_user_id()).first()
            if not item:
                raise cherrypy.HTTPError(404, "Request not found")
            session.delete(item)
            return {"deleted": True}


class ApiStudioSendController:
    """POST {method, url, headers, body}: proxies exactly one HTTP request
    server-side and returns the response."""

    exposed = True
    MAX_BODY = 2_000_000

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        method = (body.get("method") or "GET").upper()
        url = (body.get("url") or "").strip()
        if not url:
            raise cherrypy.HTTPError(400, "url is required")
        _assert_public_host(url)

        headers = body.get("headers") or {}
        if not isinstance(headers, dict):
            raise cherrypy.HTTPError(400, "headers must be an object")
        payload = body.get("body")

        started = time.time()
        try:
            resp = requests.request(
                method,
                url,
                headers=headers,
                data=payload if payload else None,
                timeout=20,
                allow_redirects=True,
            )
        except requests.exceptions.Timeout:
            raise cherrypy.HTTPError(504, "Upstream request timed out")
        except requests.exceptions.RequestException as exc:
            raise cherrypy.HTTPError(502, f"Request failed: {exc}")

        content = resp.content[: self.MAX_BODY]
        try:
            text_body = content.decode(resp.encoding or "utf-8", errors="replace")
        except (LookupError, TypeError):
            text_body = content.decode("utf-8", errors="replace")

        return {
            "status": resp.status_code,
            "statusText": resp.reason,
            "headers": dict(resp.headers),
            "body": text_body,
            "durationMs": round((time.time() - started) * 1000),
            "truncated": len(resp.content) > self.MAX_BODY,
        }


# ---------------------------------------------------------------------------
# Local "Git" version history for Studio · Code files
# ---------------------------------------------------------------------------

class NoteVersionsController:
    """GET ?note_id=: version history for one code file, newest first.
    POST /<version_id> {action:"restore"}: makes that version's content
    the note's current content — recorded as its own new snapshot first,
    so a restore is itself undoable."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, note_id):
        with get_session() as session:
            note = session.get(NimroseNote, int(note_id))
            if not note:
                raise cherrypy.HTTPError(404, "Note not found")
            require_entity_access(session, note.project_id, note.user_id, _user_id(), min_role="viewer")
            versions = (
                session.query(NimroseNoteVersion)
                .filter_by(note_id=int(note_id))
                .order_by(NimroseNoteVersion.created_at.desc())
                .all()
            )
            return [v.to_dict() for v in versions]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, version_id):
        body = cherrypy.request.json or {}
        if body.get("action") != "restore":
            raise cherrypy.HTTPError(400, "action must be 'restore'")
        with get_session() as session:
            version = session.get(NimroseNoteVersion, int(version_id))
            if not version:
                raise cherrypy.HTTPError(404, "Version not found")
            note = session.get(NimroseNote, version.note_id)
            if not note:
                raise cherrypy.HTTPError(404, "Note not found")
            require_entity_access(session, note.project_id, note.user_id, _user_id(), min_role="editor")
            if note.content != version.content:
                session.add(NimroseNoteVersion(note_id=note.id, content=note.content))
            note.content = version.content
            session.flush()
            return note.to_dict()
