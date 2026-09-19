"""NASA Exoplanet Archive TAP adapter — no API key required.

Docs: https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html
Table used: pscomppars (Planetary Systems Composite Parameters — one best
row per planet, combining the archive's chosen values across publications).
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

COLUMNS = (
    "pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_orbeccen,"
    "pl_rade,pl_bmasse,pl_eqt,st_teff,st_rad,st_mass,st_spectype,sy_dist"
)


def _run_query(adql: str):
    params = {"query": adql, "format": "json"}

    def fetch():
        resp = cosmos_get(TAP_URL, params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    return cached_fetch("exoplanet_archive", params, fetch, ttl_seconds=12 * 3600)


def search_planets(name: str | None = None, host_star: str | None = None, limit: int = 25):
    where = []
    if name:
        where.append(f"pl_name like '%{name.replace(chr(39), '')}%'")
    if host_star:
        where.append(f"hostname like '%{host_star.replace(chr(39), '')}%'")
    where_clause = f"where {' and '.join(where)}" if where else ""

    adql = f"select top {int(limit)} {COLUMNS} from pscomppars {where_clause}"
    rows = _run_query(adql)

    results = [_normalize_row(row) for row in rows]
    return envelope("NASA Exoplanet Archive", "pscomppars", None, {"count": len(results), "results": results}, None)


def get_planet(pl_name: str):
    adql = f"select {COLUMNS} from pscomppars where pl_name = '{pl_name.replace(chr(39), '')}'"
    rows = _run_query(adql)
    if not rows:
        return None
    return _normalize_row(rows[0])


def _normalize_row(row: dict):
    data = {
        "name": row.get("pl_name"),
        "hostStar": row.get("hostname"),
        "discoveryMethod": row.get("discoverymethod"),
        "discoveryYear": row.get("disc_year"),
        "orbitalPeriodDays": row.get("pl_orbper"),
        "semiMajorAxisAu": row.get("pl_orbsmax"),
        "eccentricity": row.get("pl_orbeccen"),
        "radiusEarthRadii": row.get("pl_rade"),
        "massEarthMasses": row.get("pl_bmasse"),
        "equilibriumTemperatureK": row.get("pl_eqt"),
        "hostStarTeffK": row.get("st_teff"),
        "hostStarRadiusSolarRadii": row.get("st_rad"),
        "hostStarMassSolarMasses": row.get("st_mass"),
        "hostStarSpectralType": row.get("st_spectype"),
        "distanceParsecs": row.get("sy_dist"),
    }
    data["_provenance"] = {"source": "NASA Exoplanet Archive", "sourceDataset": "pscomppars"}
    return data
