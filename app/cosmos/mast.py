"""MAST (Mikulski Archive for Space Telescopes) adapter — no API key
required for public data.

Docs: https://mast.stsci.edu/api/v0/
Used here: Mashup "Mast.Caom.Cone" service for observation search by target
name or coordinates, across Hubble/JWST/TESS/Kepler/GALEX/Spitzer.
"""

import datetime
import io
import json
import math

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

MASHUP_URL = "https://mast.stsci.edu/api/v0/invoke"
DOWNLOAD_URL = "https://mast.stsci.edu/api/v0.1/Download/file"

_MJD_EPOCH = datetime.date(1858, 11, 17)


def _iso_to_mjd(iso_date: str) -> float:
    d = datetime.date.fromisoformat(iso_date)
    return (d - _MJD_EPOCH).days


def search_observations(target_name: str, mission: str | None = None, limit: int = 25):
    filters = [{"paramName": "target_name", "values": [target_name]}]
    if mission:
        filters.append({"paramName": "obs_collection", "values": [mission.upper()]})

    # Fetch a wider page than requested and trim after sorting — a lot of
    # rows (older missions like Spitzer/GALEX especially) have no jpegURL,
    # so fetching exactly `limit` rows can return a page with zero previews
    # even when image-bearing observations exist further down the result set.
    fetch_size = max(limit * 4, 40)
    request_payload = {
        "service": "Mast.Caom.Filtered",
        "format": "json",
        "params": {
            "columns": "obs_id,obs_collection,instrument_name,filters,target_name,t_min,s_ra,s_dec,dataproduct_type,jpegURL,obsid",
            "filters": filters,
        },
        "pagesize": fetch_size,
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
    total_count = len(results)
    # MAST's jpegURL is often empty for older missions (Spitzer, GALEX) —
    # surface the observations that actually have a preview image first so
    # they aren't buried behind image-less rows.
    results.sort(key=lambda r: r["previewImageUrl"] is None)
    results = results[:limit]
    return envelope("MAST", "Mast.Caom.Filtered", None, {"count": total_count, "results": results}, None)


def browse_mission(
    mission: str,
    limit: int = 25,
    instrument: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Latest observations for a mission with no target name required —
    powers an Observatories/mission-browse view. `mission` is free text
    (any obs_collection value MAST itself recognizes, e.g. JWST/HST/TESS/
    KEPLER/GALEX/SPITZER), not restricted to a curated list. `instrument`
    filters on instrument_name (also free text — any value MAST recognizes,
    e.g. NIRCAM, NIRSPEC, WFC3/UVIS). `start_date`/`end_date` (ISO
    YYYY-MM-DD) filter on the observation's t_min (MJD)."""
    filters = [{"paramName": "obs_collection", "values": [mission.upper()]}]
    if instrument:
        filters.append({"paramName": "instrument_name", "values": [instrument.upper()]})
    if start_date or end_date:
        min_mjd = _iso_to_mjd(start_date) if start_date else 0
        max_mjd = _iso_to_mjd(end_date) if end_date else _iso_to_mjd(datetime.date.today().isoformat())
        filters.append({"paramName": "t_min", "values": [{"min": min_mjd, "max": max_mjd}]})

    fetch_size = max(limit * 4, 40)
    request_payload = {
        "service": "Mast.Caom.Filtered",
        "format": "json",
        "params": {
            "columns": "obs_id,obs_collection,instrument_name,filters,target_name,t_min,s_ra,s_dec,dataproduct_type,jpegURL,obsid",
            "filters": filters,
        },
        "pagesize": fetch_size,
        "page": 1,
    }
    params = {"request": json.dumps(request_payload)}

    def fetch():
        resp = cosmos_get(MASHUP_URL, params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("mast_mission_browse", request_payload, fetch, ttl_seconds=6 * 3600)

    rows = raw.get("data", [])
    results = [_normalize_observation(row) for row in rows]
    total_count = len(results)
    # Most recent observations first, with image-bearing ones surfaced —
    # same preview-first tie-break used by search_observations.
    results.sort(key=lambda r: r["observationDate"] or 0, reverse=True)
    results = results[:limit]
    return envelope("MAST", "Mast.Caom.Filtered", None, {"count": total_count, "results": results}, None)


def get_data_products(obsid: str):
    """Lists the actual downloadable data-product files for one observation
    (FITS spectra, images, etc.) via MAST's Mast.Caom.Products service."""
    request_payload = {
        "service": "Mast.Caom.Products",
        "format": "json",
        "params": {"obsid": str(obsid)},
    }
    params = {"request": json.dumps(request_payload)}

    def fetch():
        resp = cosmos_get(MASHUP_URL, params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("mast_products", request_payload, fetch, ttl_seconds=6 * 3600)
    return raw.get("data", [])


def _json_safe_float(v) -> float | None:
    f = float(v)
    return f if math.isfinite(f) else None


_SPECTRUM_COLUMN_PAIRS = (
    ("WAVELENGTH", "FLUX"),
    ("WAVE", "FLUX"),
    ("wavelength", "flux"),
    ("wave", "flux"),
)


def fetch_spectrum(obsid: str):
    """Finds and parses a real spectral data product (FITS table) for an
    observation — actual downloaded/parsed flux-vs-wavelength data, not a
    placeholder. Returns None (with the caller responsible for a 404) if no
    spectrum product exists or its column layout isn't one we recognize,
    rather than guessing at unfamiliar columns."""
    from astropy.io import fits

    products = get_data_products(obsid)
    candidates = [
        p
        for p in products
        if (p.get("dataproduct_type") or "").lower() == "spectrum"
        and str(p.get("productFilename", "")).lower().endswith(".fits")
    ]
    if not candidates:
        return None

    # "X1D"/"X1DSUM" (JWST/HST's standard extracted-1D-spectrum product,
    # a real wavelength/flux table) is what we actually want — CAL/RATE/S2D
    # are calibration cubes or 2D images, not the table we can plot.
    # Prefer real extraction products; fall back to any spectrum-typed FITS
    # rather than refusing outright if a mission doesn't use X1D naming.
    priority = ("X1D", "X1DSUM", "X1DSUM3", "SX1")
    candidates.sort(key=lambda p: (p.get("productSubGroupDescription") or "") not in priority)
    spectrum_row = candidates[0]

    data_uri = spectrum_row.get("dataURI")
    if not data_uri:
        return None

    def fetch_bytes():
        resp = cosmos_get(DOWNLOAD_URL, params={"uri": data_uri}, timeout=30)
        resp.raise_for_status()
        return resp.content

    raw_bytes = fetch_bytes()

    with fits.open(io.BytesIO(raw_bytes)) as hdul:
        for hdu in hdul:
            data = getattr(hdu, "data", None)
            if data is None or not hasattr(data, "names") or not data.names:
                continue
            names = {n.upper(): n for n in data.names}
            for wave_col, flux_col in _SPECTRUM_COLUMN_PAIRS:
                w, f = wave_col.upper(), flux_col.upper()
                if w in names and f in names:
                    # NaN is not valid JSON — masked/invalid detector pixels
                    # commonly show up as NaN in real spectra; null them out
                    # rather than emit a token the frontend's JSON.parse
                    # would choke on.
                    wavelength = [_json_safe_float(v) for v in data[names[w]].tolist()]
                    flux = [_json_safe_float(v) for v in data[names[f]].tolist()]
                    unit = hdu.header.get(f"TUNIT{list(data.names).index(names[w]) + 1}")
                    flux_unit = hdu.header.get(f"TUNIT{list(data.names).index(names[f]) + 1}")
                    result = {
                        "wavelength": wavelength,
                        "flux": flux,
                        "wavelengthUnit": unit,
                        "fluxUnit": flux_unit,
                        "productFilename": spectrum_row.get("productFilename"),
                    }
                    return envelope("MAST", "spectrum", str(obsid), result, None)

    return None


def fetch_fits_image(obsid: str):
    """Finds an image-type FITS data product for an observation, downloads
    it, and turns the real pixel array into something a browser can show —
    plus real analysis (pixel statistics, dimensions) and the science
    header fields (instrument, filter, exposure time, target). Returns
    None if no image FITS product exists.

    Pixel normalization (percentile clip + asinh stretch) is shared with
    New Horizons' image pipeline via app/cosmos/imaging.py — see that
    module's docstring for why it's hand-rolled rather than using
    astropy.visualization directly."""
    from astropy.io import fits

    from app.cosmos.imaging import array_to_png_and_stats

    products = get_data_products(obsid)
    candidates = [
        p
        for p in products
        if (p.get("dataproduct_type") or "").lower() == "image"
        and str(p.get("productFilename", "")).lower().endswith((".fits", ".fits.gz", ".fit"))
    ]
    if not candidates:
        return None

    # Prefer calibrated/drizzled science products (DRZ/DRC for HST,
    # I2D for JWST, CAL as a fallback) over raw detector readouts.
    priority = ("DRZ", "DRC", "I2D", "CAL")
    candidates.sort(key=lambda p: (p.get("productSubGroupDescription") or "") not in priority)
    image_row = candidates[0]

    data_uri = image_row.get("dataURI")
    if not data_uri:
        return None

    def fetch_bytes():
        resp = cosmos_get(DOWNLOAD_URL, params={"uri": data_uri}, timeout=45)
        resp.raise_for_status()
        return resp.content

    raw_bytes = fetch_bytes()

    with fits.open(io.BytesIO(raw_bytes)) as hdul:
        image_hdu = None
        for hdu in hdul:
            data = getattr(hdu, "data", None)
            if data is not None and getattr(data, "ndim", 0) == 2:
                image_hdu = hdu
                break
        if image_hdu is None:
            return None

        data = image_hdu.data.astype(float)
        header = image_hdu.header
        primary_header = hdul[0].header

        # FITS row 0 is the bottom; images are stored top-down.
        png_data_uri, stats = array_to_png_and_stats(data, flip_vertical=True)

        def _num(key):
            v = header.get(key, primary_header.get(key))
            try:
                return _json_safe_float(v) if v is not None else None
            except (TypeError, ValueError):
                return None

        header_fields = {
            "instrument": header.get("INSTRUME", primary_header.get("INSTRUME")),
            "telescope": header.get("TELESCOP", primary_header.get("TELESCOP")),
            "filter": header.get("FILTER") or header.get("FILTER1") or primary_header.get("FILTER"),
            "exposureTime": _num("EXPTIME"),
            "dateObs": header.get("DATE-OBS", primary_header.get("DATE-OBS")),
            "object": header.get("OBJECT", primary_header.get("TARGNAME")),
            "ra": _num("RA_TARG"),
            "dec": _num("DEC_TARG"),
        }

        result = {
            "productFilename": image_row.get("productFilename"),
            "imagePngBase64": png_data_uri,
            "stats": stats,
            "header": header_fields,
        }
        return envelope("MAST", "fits-image", str(obsid), result, None)


def _resolve_download_url(mast_uri: str | None) -> str | None:
    """MAST's own jpegURL field is a `mast:...` URI, not a resolvable HTTP(S)
    URL — a browser's <img> tag can't load a custom URI scheme. Wrap it in
    MAST's own download endpoint so callers get something actually
    renderable, without changing what the field represents."""
    if not mast_uri:
        return None
    if mast_uri.startswith("mast:"):
        return f"{DOWNLOAD_URL}?uri={mast_uri}"
    return mast_uri


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
        "previewImageUrl": _resolve_download_url(row.get("jpegURL")),
        "obsid": row.get("obsid"),
    }
