"""EMODnet Bathymetry adapter — no API key required.
https://emodnet.ec.europa.eu/en/bathymetry
"""

from app.abyss.http import abyss_get, envelope

WMS_URL = "https://ows.emodnet-bathymetry.eu/wms"
LAYER = "emodnet:mean"


def depth_at_point(lat: float, lon: float):
    """Real seafloor depth (negative = below sea level, in metres) at a
    single point, queried live via WMS GetFeatureInfo. Not cached — depth
    doesn't change over time, but arbitrary lat/lon pairs have essentially
    no repeat-query locality, so caching would just bloat AbyssCache."""
    delta = 0.01
    bbox = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": LAYER,
        "QUERY_LAYERS": LAYER,
        "SRS": "EPSG:4326",
        "BBOX": bbox,
        "WIDTH": 101,
        "HEIGHT": 101,
        "X": 50,
        "Y": 50,
        "INFO_FORMAT": "application/json",
        "FEATURE_COUNT": 1,
    }
    resp = abyss_get(WMS_URL, params=params, timeout=15)
    resp.raise_for_status()
    raw = resp.json()
    features = raw.get("features", [])
    depth = features[0]["properties"].get("Depth") if features else None
    data = {"latitude": lat, "longitude": lon, "depthMeters": depth}
    return envelope("EMODnet Bathymetry", "mean_composite_dtm", None, data, raw, confidence="OBSERVED")
