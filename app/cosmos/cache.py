import datetime
import hashlib
import json

from app.db import get_session
from app.models import CosmosCache


def _cache_key(source: str, params: dict) -> str:
    digest = hashlib.sha256(json.dumps(params, sort_keys=True, default=str).encode()).hexdigest()
    return f"{source}:{digest}"


def cached_fetch(source: str, params: dict, fetch_fn, ttl_seconds: int):
    """Returns fetch_fn()'s JSON-serializable result, reusing a stored copy
    if one was fetched within ttl_seconds. fetch_fn takes no arguments."""
    key = _cache_key(source, params)

    with get_session() as session:
        row = session.query(CosmosCache).filter_by(cache_key=key).one_or_none()
        if row is not None:
            age = (datetime.datetime.utcnow() - row.fetched_at).total_seconds()
            if age < ttl_seconds:
                return row.payload_json

    result = fetch_fn()

    with get_session() as session:
        row = session.query(CosmosCache).filter_by(cache_key=key).one_or_none()
        if row is None:
            row = CosmosCache(cache_key=key, source=source, payload_json=result)
            session.add(row)
        else:
            row.payload_json = result
            row.fetched_at = datetime.datetime.utcnow()
        session.flush()

    return result
