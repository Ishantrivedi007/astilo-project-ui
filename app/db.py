from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import config

connect_args = {"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(config.DATABASE_URL, connect_args=connect_args)
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


def _migrate_board_column_wip_limit():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in wip_limit for nimrose_board_columns rows
    created before this feature existed."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(nimrose_board_columns)")}
            if "wip_limit" not in existing:
                conn.exec_driver_sql("ALTER TABLE nimrose_board_columns ADD COLUMN wip_limit INTEGER")
        else:
            conn.exec_driver_sql("ALTER TABLE nimrose_board_columns ADD COLUMN IF NOT EXISTS wip_limit INTEGER")
        conn.commit()


def _migrate_nimrose_project_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in the ticket-key columns added to
    nimrose_projects after it first shipped."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(nimrose_projects)")}
            if "key_prefix" not in existing:
                conn.exec_driver_sql("ALTER TABLE nimrose_projects ADD COLUMN key_prefix VARCHAR(10)")
            if "ticket_sequence" not in existing:
                conn.exec_driver_sql("ALTER TABLE nimrose_projects ADD COLUMN ticket_sequence INTEGER DEFAULT 0")
        else:
            conn.exec_driver_sql("ALTER TABLE nimrose_projects ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(10)")
            conn.exec_driver_sql(
                "ALTER TABLE nimrose_projects ADD COLUMN IF NOT EXISTS ticket_sequence INTEGER DEFAULT 0"
            )
        conn.commit()


def _migrate_cosmos_research_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in the research-brief columns added to
    cosmos_saved_items after the full Research page shipped."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(cosmos_saved_items)")}
            if "research_project_id" not in existing:
                conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN research_project_id INTEGER")
            if "research_brief_json" not in existing:
                conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN research_brief_json TEXT")
        else:
            conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_project_id INTEGER")
            conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_brief_json JSONB")
        conn.commit()


def _migrate_cosmos_research_images_column():
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(cosmos_saved_items)")}
            if "research_images_json" not in existing:
                conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN research_images_json TEXT")
        else:
            conn.exec_driver_sql("ALTER TABLE cosmos_saved_items ADD COLUMN IF NOT EXISTS research_images_json JSONB")
        conn.commit()


def _migrate_note_content_format_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in content_format for notes created before the
    rich-text editor existed (they default to "markdown", matching what
    they always were)."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(nimrose_notes)")}
            if "content_format" not in existing:
                conn.exec_driver_sql("ALTER TABLE nimrose_notes ADD COLUMN content_format VARCHAR(10) DEFAULT 'markdown'")
        else:
            conn.exec_driver_sql(
                "ALTER TABLE nimrose_notes ADD COLUMN IF NOT EXISTS content_format VARCHAR(10) DEFAULT 'markdown'"
            )
        conn.commit()


def _migrate_note_kind_column():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in "kind" for notes created before the Office
    suite (sheet/slides document types) existed; they default to "note",
    matching what they always were."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(nimrose_notes)")}
            if "kind" not in existing:
                conn.exec_driver_sql("ALTER TABLE nimrose_notes ADD COLUMN kind VARCHAR(10) DEFAULT 'note'")
        else:
            conn.exec_driver_sql("ALTER TABLE nimrose_notes ADD COLUMN IF NOT EXISTS kind VARCHAR(10) DEFAULT 'note'")
        conn.commit()


def _migrate_ticket_phase_column():
    """create_all creates the new nimrose_phases table automatically, but
    not the phase_id column on the pre-existing nimrose_tickets table."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(nimrose_tickets)")}
            if "phase_id" not in existing:
                conn.exec_driver_sql("ALTER TABLE nimrose_tickets ADD COLUMN phase_id INTEGER")
        else:
            conn.exec_driver_sql("ALTER TABLE nimrose_tickets ADD COLUMN IF NOT EXISTS phase_id INTEGER")
        conn.commit()


def _migrate_direct_message_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in attachment/contact-card support for
    direct_messages rows created before those message kinds existed (they
    default to "text", matching what they always were)."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    columns = (
        ("kind", "VARCHAR(10) DEFAULT 'text'"),
        ("attachment_file_name", "VARCHAR(255)"),
        ("attachment_stored_name", "VARCHAR(80)"),
        ("attachment_content_type", "VARCHAR(120)"),
        ("attachment_size_bytes", "INTEGER"),
        ("contact_payload_json", "TEXT"),
    )
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(direct_messages)")}
            for column, ddl_type in columns:
                if column not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE direct_messages ADD COLUMN {column} {ddl_type}")
        else:
            for column, ddl_type in columns:
                conn.exec_driver_sql(f"ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS {column} {ddl_type}")
        conn.commit()


def _migrate_song_columns():
    """create_all only creates missing tables, not columns on ones that
    already exist — patch in newly-added Song columns for existing
    databases (sqlite or postgres) so upgrades don't require a manual reset."""
    is_sqlite = config.DATABASE_URL.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(songs)")}
            for column, ddl_type in (("lyrics_text", "TEXT"), ("lyrics_synced", "TEXT")):
                if column not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE songs ADD COLUMN {column} {ddl_type}")
        else:
            for column, ddl_type in (("lyrics_text", "TEXT"), ("lyrics_synced", "TEXT")):
                conn.exec_driver_sql(f"ALTER TABLE songs ADD COLUMN IF NOT EXISTS {column} {ddl_type}")
        conn.commit()
