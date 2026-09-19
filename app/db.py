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
