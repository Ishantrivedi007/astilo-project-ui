"""ESA Gaia archive TAP adapter — no API key required.

Docs: https://gea.esac.esa.int/archive-help/adql/index.html
Table used: gaiadr3.gaia_source. Search is by object name via SIMBAD
resolution (Gaia's own catalog has no name column, only source_id), so we
resolve the name to coordinates first, then cone-search Gaia around it.
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

GAIA_TAP_URL = "https://gea.esac.esa.int/tap-server/tap/sync"
SIMBAD_TAP_URL = "https://simbad.cds.unistra.fr/simbad/sim-tap/sync"

COLUMNS = "source_id,ra,dec,parallax,pmra,pmdec,radial_velocity,phot_g_mean_mag,bp_rp,teff_gspphot"


def resolve_coordinates(name: str):
    """Public wrapper — other adapters (e.g. heasarc.py) that need to turn a
    common object name into coordinates reuse this instead of duplicating
    the SIMBAD lookup."""
    return _resolve_coordinates(name)


def _resolve_coordinates(name: str):
    resolved = _resolve_object(name)
    if resolved is None:
        return None
    return resolved[0], resolved[1]


def _resolve_object(name: str):
    """Returns (ra, dec, galdim_majaxis) or None. galdim_majaxis is SIMBAD's
    angular-size field — it's only populated for resolved/extended objects
    (galaxies, nebulae, remnants, clusters), never for a point-source star,
    so it's used as the signal for "this isn't a star, don't Gaia-match it"."""
    adql = (
        "select ra, dec, galdim_majaxis from basic join ident on oid = ident.oidref "
        f"where id = '{name.replace(chr(39), '')}'"
    )
    params = {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": adql}

    def fetch():
        resp = cosmos_get(SIMBAD_TAP_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("simbad_resolve", params, fetch, ttl_seconds=24 * 3600)
    rows = raw.get("data", [])
    if not rows:
        return None
    ra, dec, galdim_majaxis = rows[0][0], rows[0][1], rows[0][2]
    return ra, dec, galdim_majaxis


def search_star(name: str, radius_deg: float = 0.01):
    """Resolves a star name (e.g. 'Sirius') via SIMBAD, then cone-searches
    Gaia DR3 around those coordinates for the nearest matching source.
    Returns None for extended objects (nebulae, remnants, galaxies) instead
    of silently matching an unrelated nearby point source and mislabeling
    it with the searched name."""
    resolved = _resolve_object(name)
    if resolved is None:
        return None
    ra, dec, galdim_majaxis = resolved
    if galdim_majaxis is not None:
        return None

    adql = (
        f"select top 1 {COLUMNS} from gaiadr3.gaia_source "
        f"where 1=contains(point('ICRS', ra, dec), circle('ICRS', {ra}, {dec}, {radius_deg}))"
        f" order by phot_g_mean_mag asc"
    )
    params = {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": adql}

    def fetch():
        resp = cosmos_get(GAIA_TAP_URL, params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("gaia_tap", params, fetch, ttl_seconds=24 * 3600)
    rows = raw.get("data", [])
    if not rows:
        return None

    fields = [c["name"] for c in raw.get("metadata", [])] or COLUMNS.split(",")
    row = dict(zip(fields, rows[0]))

    data = {
        "queriedName": name,
        "gaiaSourceId": row.get("source_id"),
        "raDeg": row.get("ra"),
        "decDeg": row.get("dec"),
        "parallaxMas": row.get("parallax"),
        "properMotionRaMasYr": row.get("pmra"),
        "properMotionDecMasYr": row.get("pmdec"),
        "radialVelocityKmS": row.get("radial_velocity"),
        "gMagnitude": row.get("phot_g_mean_mag"),
        "bpRpColor": row.get("bp_rp"),
        "effectiveTempK": row.get("teff_gspphot"),
    }
    return envelope("ESA Gaia (DR3)", "gaiadr3.gaia_source", str(row.get("source_id")), data, row)
