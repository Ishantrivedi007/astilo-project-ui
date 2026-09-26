from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import config

engine = create_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db():
    from app import models  # noqa: F401  (ensures models are registered)

    Base.metadata.create_all(bind=engine)
    _migrate_song_columns()
    _migrate_nimrose_project_columns()
    _migrate_board_column_wip_limit()
    _migrate_cosmos_research_columns()
    _migrate_cosmos_research_images_column()
    _migrate_note_content_format_column()
    _migrate_note_kind_column()
    _migrate_ticket_phase_column()
    _migrate_direct_message_columns()
    _migrate_note_project_column()
    _migrate_browser_space_project_column()
    _backfill_research_project_links()
    _migrate_note_language_column()
    _migrate_attachment_project_column()
    _migrate_cosmos_research_sources_column()
    _migrate_user_git_links_column()
    _migrate_user_pinned_modules_column()


def _migrate_board_column_wip_limit():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in wip_limit for nimrose_board_columns rows
    created before this feature existed."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_board_columns ADD COLUMN IF NOT EXISTS wip_limit INTEGER")
        conn.commit()


def _migrate_nimrose_project_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in the ticket-key columns added to
    nimrose_projects after it first shipped."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_projects ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(10)")
        conn.exec_driver_sql("ALTER TABLE nimrose_projects ADD COLUMN IF NOT EXISTS ticket_sequence INTEGER DEFAULT 0")
        conn.commit()


def _migrate_cosmos_research_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in the research-brief columns added to
    cosmos_saved_items after the full Research page shipped."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_project_id INTEGER")
        conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_brief_json JSONB")
        conn.commit()


def _migrate_cosmos_research_images_column():
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_images_json JSONB")
        conn.commit()


def _migrate_cosmos_research_sources_column():
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_sources_json JSONB")
        conn.commit()


def _migrate_note_content_format_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in content_format for notes created before the
    rich-text editor existed (they default to "markdown", matching what
    they always were)."""
    with engine.connect() as conn:
        conn.exec_driver_sql(
            "ALTER TABLE nimrose_notes ADD COLUMN IF NOT EXISTS content_format VARCHAR(10) DEFAULT 'markdown'"
        )
        conn.commit()


def _migrate_note_kind_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in "kind" for notes created before the Office
    suite (sheet/slides document types) existed; they default to "note",
    matching what they always were."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_notes ADD COLUMN IF NOT EXISTS kind VARCHAR(10) DEFAULT 'note'")
        conn.commit()


def _migrate_note_project_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in project_id for nimrose_notes rows created
    before the Research Workspace view could link notes to a project."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_notes ADD COLUMN IF NOT EXISTS project_id INTEGER")
        conn.commit()


def _migrate_browser_space_project_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in project_id for nimrose_browser_spaces rows
    created before the Research Workspace view could link a Space to a
    project."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_browser_spaces ADD COLUMN IF NOT EXISTS project_id INTEGER")
        conn.commit()


def _backfill_research_project_links():
    """One-time (idempotent — only touches rows still missing project_id,
    so it's a cheap no-op on every boot after the first) backfill for
    notes/spaces created by the research flow before project_id existed on
    them. Links them using the same match keys research_controller.py's
    own note/space-creation code already relies on: folder == project.name
    for notes, name == project.name[:60] for spaces."""
    from app.models import NimroseNote, NimroseBrowserSpace, NimroseProject, CosmosSavedItem

    with get_session() as session:
        research_projects = (
            session.query(NimroseProject)
            .join(CosmosSavedItem, CosmosSavedItem.research_project_id == NimroseProject.id)
            .all()
        )
        for project in research_projects:
            session.query(NimroseNote).filter(
                NimroseNote.user_id == project.user_id,
                NimroseNote.folder == project.name,
                NimroseNote.project_id.is_(None),
            ).update({"project_id": project.id})
            session.query(NimroseBrowserSpace).filter(
                NimroseBrowserSpace.user_id == project.user_id,
                NimroseBrowserSpace.name == project.name[:60],
                NimroseBrowserSpace.project_id.is_(None),
            ).update({"project_id": project.id})


def _migrate_note_language_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in language for nimrose_notes rows created before
    the Code tab (kind="code") existed."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_notes ADD COLUMN IF NOT EXISTS language VARCHAR(30)")
        conn.commit()


def _migrate_attachment_project_column():
    """create_all only creates missing tables, not columns on ones that
    already exist, and can't relax an existing NOT NULL — patch in
    project_id and drop ticket_id's NOT NULL so an attachment can belong to
    a project directly (Files tab) instead of always going through a ticket."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_ticket_attachments ADD COLUMN IF NOT EXISTS project_id INTEGER")
        conn.exec_driver_sql("ALTER TABLE nimrose_ticket_attachments ALTER COLUMN ticket_id DROP NOT NULL")
        conn.commit()


def _migrate_user_git_links_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in git_links_enabled for users created before the
    Git/code links feature existed (defaults to off, matching the column
    default)."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS git_links_enabled BOOLEAN NOT NULL DEFAULT false")
        conn.commit()


def _migrate_user_pinned_modules_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in pinned_modules for users created before the
    customizable-sidebar feature existed (NULL = show every module, the
    same as before this column existed)."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS pinned_modules JSON")
        conn.commit()


def _migrate_ticket_phase_column():
    """create_all creates the new nimrose_phases table automatically, but
    not the phase_id column on the pre-existing nimrose_tickets table."""
    with engine.connect() as conn:
        conn.exec_driver_sql("ALTER TABLE nimrose_tickets ADD COLUMN IF NOT EXISTS phase_id INTEGER")
        conn.commit()


def _migrate_direct_message_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in attachment/contact-card support for
    direct_messages rows created before those message kinds existed (they
    default to "text", matching what they always were)."""
    columns = (
        ("kind", "VARCHAR(10) DEFAULT 'text'"),
        ("attachment_file_name", "VARCHAR(255)"),
        ("attachment_stored_name", "VARCHAR(80)"),
        ("attachment_content_type", "VARCHAR(120)"),
        ("attachment_size_bytes", "INTEGER"),
        ("contact_payload_json", "TEXT"),
    )
    with engine.connect() as conn:
        for column, ddl_type in columns:
            conn.exec_driver_sql(f"ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS {column} {ddl_type}")
        conn.commit()


def _migrate_song_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in newly-added Song columns for existing
    databases so upgrades don't require a manual reset."""
    with engine.connect() as conn:
        for column, ddl_type in (("lyrics_text", "TEXT"), ("lyrics_synced", "TEXT")):
            conn.exec_driver_sql(f"ALTER TABLE songs ADD COLUMN IF NOT EXISTS {column} {ddl_type}")
        conn.commit()
