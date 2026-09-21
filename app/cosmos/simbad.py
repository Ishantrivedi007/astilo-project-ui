"""SIMBAD (CDS Strasbourg) generic object lookup — no API key required.

Used for object classes that don't have a dedicated mission catalog (mainly
galaxies), since SIMBAD's `basic` table covers essentially every named
astronomical object, not just stars. gaia.py already depends on SIMBAD for
name -> coordinate resolution; this adds the broader descriptive fields.
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SIMBAD_TAP_URL = "https://simbad.cds.unistra.fr/simbad/sim-tap/sync"

COLUMNS = "main_id,ra,dec,otype_txt,galdim_majaxis,galdim_minaxis,morph_type,rvz_redshift,sp_type,plx_value"

# SIMBAD's "main type" reflects the most *specific* known classification —
# for a galaxy with a known active nucleus, that's the nucleus's activity
# class (AGN/Seyfert/LINER/...), not "Galaxy" broadly. Accurate, but reads
# as wrong to someone who searched "Andromeda Galaxy" and got back "AGN"
# with no obvious galaxy label anywhere. Rather than overwrite that real
# classification, we combine it with the real signal that the object *is*
# catalogued with galaxy dimensions (galdim_majaxis is only populated for
# resolved galaxies), so the display type stays honest either way.
_NUCLEUS_ACTIVITY_TYPES = {"AGN", "Seyfert", "Seyfert_1", "Seyfert_2", "LINER", "QSO", "Blazar", "BLLac", "AGN_Candidate"}


def _resolve_display_name(oid, params_base) -> str | None:
    """SIMBAD prefixes common/proper names with "NAME " in its identifier
    table (e.g. "NAME Andromeda Galaxy" alongside "M  31") — when one
    exists for this object, surfacing it lets the result page confirm
    "M 31" and "Andromeda Galaxy" are the same object instead of just
    showing the terse catalog designation with no link back to what was
    searched."""
    adql = f"select id from ident where oidref = {oid} and id like 'NAME %'"
    params = {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": adql}

    def fetch():
        resp = cosmos_get(SIMBAD_TAP_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    try:
        raw = cached_fetch("simbad_idents", params, fetch, ttl_seconds=24 * 3600)
    except Exception:
        return None
    rows = raw.get("data", [])
    if not rows:
        return None
    return rows[0][0][5:].strip().title()


def lookup_object(name: str):
    adql = (
        f"select oid,{COLUMNS} from basic join ident on oid = ident.oidref "
        f"where id = '{name.replace(chr(39), '')}'"
    )
    params = {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": adql}

    def fetch():
        resp = cosmos_get(SIMBAD_TAP_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("simbad_object", params, fetch, ttl_seconds=24 * 3600)
    rows = raw.get("data", [])
    if not rows:
        return None

    fields = [c["name"] for c in raw.get("metadata", [])] or (["oid"] + COLUMNS.split(","))
    row = dict(zip(fields, rows[0]))

    otype = row.get("otype_txt")
    is_galaxy_dim = row.get("galdim_majaxis") is not None
    display_type = f"Galaxy ({otype} nucleus)" if otype in _NUCLEUS_ACTIVITY_TYPES and is_galaxy_dim else otype

    common_name = _resolve_display_name(row.get("oid"), params) if row.get("oid") is not None else None

    data = {
        "name": row.get("main_id"),
        "commonName": common_name,
        "objectType": display_type,
        "rawObjectType": otype,
        "raDeg": row.get("ra"),
        "decDeg": row.get("dec"),
        "angularMajorAxisArcmin": row.get("galdim_majaxis"),
        "angularMinorAxisArcmin": row.get("galdim_minaxis"),
        "morphologicalType": row.get("morph_type"),
        "redshift": row.get("rvz_redshift"),
        "spectralType": row.get("sp_type"),
        "parallaxMas": row.get("plx_value"),
    }
    return envelope("SIMBAD (CDS Strasbourg)", "basic", row.get("main_id"), data, row)
