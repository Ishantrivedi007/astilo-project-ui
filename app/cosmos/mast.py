"""MAST (Mikulski Archive for Space Telescopes) adapter — no API key
required for public data.

Docs: https://mast.stsci.edu/api/v0/
Used here: Mashup "Mast.Caom.Cone" service for observation search by target
name or coordinates, across Hubble/JWST/TESS/Kepler/GALEX/Spitzer.
"""

import json

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

MASHUP_URL = "https://mast.stsci.edu/api/v0/invoke"


def search_observations(target_name: str, mission: str | None = None, limit: int = 25):
    filters = [{"paramName": "target_name", "values": [target_name]}]
    if mission:
        filters.append({"paramName": "obs_collection", "values": [mission.upper()]})

    request_payload = {
        "service": "Mast.Caom.Filtered",
        "format": "json",
        "params": {
            "columns": "obs_id,obs_collection,instrument_name,filters,target_name,t_min,s_ra,s_dec,dataproduct_type,jpegURL,obsid",
            "filters": filters,
        },
        "pagesize": limit,
        "page": 1,
    }
    params = {"request": json.dumps(request_payload)}

    def fetch():
        resp = cosmos_get(MASHUP_URL, params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("mast", request_payload, fetch, ttl_seconds=6 * 3600)

    rows = raw.get("data", [])
    results = [_normalize_observation(row) for row in rows]
    return envelope("MAST", "Mast.Caom.Filtered", None, {"count": len(results), "results": results}, None)


def _normalize_observation(row: dict):
    return {
        "observationId": row.get("obs_id"),
        "mission": row.get("obs_collection"),
        "instrument": row.get("instrument_name"),
        "filters": row.get("filters"),
        "target": row.get("target_name"),
        "observationDate": row.get("t_min"),
        "raDeg": row.get("s_ra"),
        "decDeg": row.get("s_dec"),
        "productType": row.get("dataproduct_type"),
        "previewImageUrl": row.get("jpegURL"),
        "obsid": row.get("obsid"),
    }
