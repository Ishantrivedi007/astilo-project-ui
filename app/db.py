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
