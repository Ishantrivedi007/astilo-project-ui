"""Interactive Taxonomy Tree — real WoRMS parent/child relationships,
fetched live on each expand rather than precomputed, so it's always
current. Starts at Animalia (AphiaID 2) by default since Abyss is scoped to
marine life."""

from app.abyss.cache import cached_fetch
from app.abyss.http import abyss_get, envelope

BASE_URL = "https://www.marinespecies.org/rest"
ANIMALIA_APHIA_ID = 2


def children(aphia_id: int, marine_only: bool = True):
    marine_flag = "true" if marine_only else "false"
    params = {"aphiaId": aphia_id, "marine_only": marine_flag}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/AphiaChildrenByAphiaID/{aphia_id}", params={"marine_only": marine_flag, "offset": 1})
        if resp.status_code == 204:
            return []
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("worms_children", params, fetch, ttl_seconds=24 * 3600) or []
    results = [
        {
            "aphiaId": r.get("AphiaID"),
            "scientificName": r.get("scientificname"),
            "rank": r.get("rank"),
            "status": r.get("status"),
            "isExtinct": bool(r.get("isExtinct")),
        }
        for r in raw
        if r.get("status") == "accepted"
    ]
    return envelope("WoRMS", "AphiaChildrenByAphiaID", str(aphia_id), {"results": results}, confidence="OBSERVED")
