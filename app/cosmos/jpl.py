"""JPL Solar System Dynamics adapters — no API key required.

SBDB:     https://ssd-api.jpl.nasa.gov/doc/sbdb.html
SBDB query set: https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html
CAD (close approaches): https://ssd-api.jpl.nasa.gov/doc/cad.html
Horizons: https://ssd-api.jpl.nasa.gov/doc/horizons.html
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SBDB_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api"
SBDB_QUERY_URL = "https://ssd-api.jpl.nasa.gov/sbdb_query.api"
CAD_URL = "https://ssd-api.jpl.nasa.gov/cad.api"
HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"


def sbdb_lookup(designation: str):
    """Looks up a single asteroid/comet by name or designation, e.g. 'Apophis'."""
    params = {"sstr": designation, "phys-par": "1", "discovery": "1"}

    def fetch():
        resp = cosmos_get(SBDB_URL, params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("jpl_sbdb", params, fetch, ttl_seconds=6 * 3600)

    if "code" in raw and raw.get("code") == "200" and "object" not in raw:
        return None
    if "object" not in raw:
        return None

    obj = raw["object"]
    phys = {p["name"]: p.get("value") for p in raw.get("phys_par", [])}
    orbit = raw.get("orbit", {})
    orbit_elements = {e["name"]: e.get("value") for e in orbit.get("elements", [])}

    data = {
        "name": obj.get("fullname") or obj.get("des"),
        "designation": obj.get("des"),
        "kind": obj.get("kind"),  # e.g. "an" (asteroid, numbered), "cn" (comet, numbered)
        "orbitClass": (orbit.get("orbit_class") or {}).get("name"),
        "neo": obj.get("neo"),
        "potentiallyHazardous": obj.get("pha"),
        "diameterKm": phys.get("diameter"),
        "absoluteMagnitudeH": phys.get("H"),
        "rotationPeriodHours": phys.get("rot_per"),
        "albedo": phys.get("albedo"),
        "orbitalPeriodDays": orbit_elements.get("per"),
        "semiMajorAxisAu": orbit_elements.get("a"),
        "eccentricity": orbit_elements.get("e"),
        "inclinationDeg": orbit_elements.get("i"),
        "epoch": orbit.get("epoch"),
    }
    return envelope("JPL Small-Body Database", "sbdb", obj.get("spkid") or obj.get("des"), data, raw)


def sbdb_query(constraints: dict):
    """Runs a filtered search across the small-body catalog. `constraints`
    are passed through as sbdb_query.api query params, e.g.
    {"sb-class": "ATE", "sb-defs": "true"} for Aten-class NEOs."""
    params = dict(constraints)
    params.setdefault("fields", "spkid,full_name,neo,pha,diameter,albedo,e,a,i,per")

    def fetch():
        resp = cosmos_get(SBDB_QUERY_URL, params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("jpl_sbdb_query", params, fetch, ttl_seconds=6 * 3600)

    fields = raw.get("fields", [])
    rows = raw.get("data", [])
    results = [dict(zip(fields, row)) for row in rows]
    return envelope("JPL Small-Body Database", "sbdb_query", None, {"count": raw.get("count"), "results": results}, None)


def close_approaches(designation: str | None = None, date_min: str = "now", date_max: str = "+60", dist_max: str = "0.05"):
    """Close-approach feed (CAD). dist_max is in au; default window is the
    next 60 days within 0.05 au (~7.5M km) unless a specific object is given."""
    params = {"date-min": date_min, "date-max": date_max, "dist-max": dist_max, "sort": "date"}
    if designation:
        params["des"] = designation
        params.pop("dist-max", None)

    def fetch():
        resp = cosmos_get(CAD_URL, params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("jpl_cad", params, fetch, ttl_seconds=3600)

    fields = raw.get("fields", [])
    rows = raw.get("data", [])
    results = [dict(zip(fields, row)) for row in rows]
    return envelope("JPL CNEOS", "cad", None, {"count": raw.get("count"), "results": results}, None)


def horizons_ephemeris(command: str, start_time: str, stop_time: str, step_size: str = "1d", center: str = "500@10"):
    """Vector/observer ephemeris for a body over a time range, for the Orbit
    Explorer. `command` is a Horizons target spec, e.g. '399' for Earth,
    '499' for Mars, or a small-body designation. `center` defaults to the
    Sun's center (500@10)."""
    params = {
        "format": "json",
        "COMMAND": f"'{command}'",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",
        "CENTER": f"'{center}'",
        "START_TIME": f"'{start_time}'",
        "STOP_TIME": f"'{stop_time}'",
        "STEP_SIZE": f"'{step_size}'",
    }

    def fetch():
        resp = cosmos_get(HORIZONS_URL, params=params, timeout=25)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("jpl_horizons", params, fetch, ttl_seconds=6 * 3600)

    return envelope("JPL Horizons", "vectors", command, {"result": raw.get("result")}, None)
