"""Copernicus Marine Service adapter — real, live oceanographic data (sea
temperature, salinity, currents) via the official `copernicusmarine` Python
toolbox, against the Global Ocean Physics Analysis and Forecast product
(1/12° resolution). Unlocks Ocean Heat Explorer, Salinity Explorer and the
Ocean Current Visualizer with genuine gridded data rather than hardcoded
examples, per blueprint rule #19 ("use actual gridded data where available").

Requires a free Copernicus Marine account. Credentials are supplied via
`copernicusmarine.login()`'s own locally-stored, encoded credential file
(~/.copernicusmarine/.copernicusmarine-credentials) — never hardcoded or
routed through Astilo's own config, so there's nothing credential-shaped in
this codebase at all. If login hasn't been run on a given machine, every
function here raises a clear RuntimeError that the controller turns into a
502 with instructions, rather than silently failing or fabricating data."""

import math

import numpy as np

from app.abyss.cache import cached_fetch
from app.abyss.http import envelope

TEMPERATURE_DATASET = "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m"
SALINITY_DATASET = "cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m"
CURRENT_DATASET = "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m"

_PAD_DEG = 0.1  # a little wider than the 1/12° native grid spacing, so "nearest" always has a real neighbor


def _bbox(lat: float, lon: float) -> tuple[float, float, float, float]:
    return (lon - _PAD_DEG, lon + _PAD_DEG, lat - _PAD_DEG, lat + _PAD_DEG)


def _clean(value) -> float | None:
    f = float(value)
    return None if math.isnan(f) else round(f, 3)


def _clean_list(values) -> list[float | None]:
    """NaN isn't valid JSON (Postgres's JSON column rejects the literal
    token), so every value must be sanitized before it's handed to
    cached_fetch for storage — not just when building the final response."""
    return [_clean(v) for v in values]


def _open_point(dataset_id: str, lat: float, lon: float, variables: list[str], depth_cap: float | None = None):
    import copernicusmarine

    min_lon, max_lon, min_lat, max_lat = _bbox(lat, lon)
    kwargs = dict(
        dataset_id=dataset_id,
        variables=variables,
        minimum_longitude=min_lon,
        maximum_longitude=max_lon,
        minimum_latitude=min_lat,
        maximum_latitude=max_lat,
    )
    if depth_cap is not None:
        kwargs["minimum_depth"] = 0
        kwargs["maximum_depth"] = depth_cap
    try:
        ds = copernicusmarine.open_dataset(**kwargs)
    except Exception as exc:
        raise RuntimeError(
            "Copernicus Marine is not reachable or not logged in on this machine. "
            "Run `python -c \"import copernicusmarine; copernicusmarine.login()\"` once to enable it. "
            f"Underlying error: {exc}"
        ) from exc
    return ds.sel(longitude=lon, latitude=lat, method="nearest").isel(time=-1)


def temperature_profile(lat: float, lon: float):
    params = {"lat": round(lat, 2), "lon": round(lon, 2)}

    def fetch():
        point = _open_point(TEMPERATURE_DATASET, lat, lon, ["thetao"])
        depths = point["depth"].values.tolist()
        values = _clean_list(point["thetao"].values.tolist())
        time_str = str(point["time"].values)
        return {"depths": depths, "values": values, "time": time_str}

    data = cached_fetch("copernicus_temperature", params, fetch, ttl_seconds=12 * 3600)
    profile = [{"depthMeters": round(d, 1), "temperatureC": v} for d, v in zip(data["depths"], data["values"])]
    profile = [p for p in profile if p["temperatureC"] is not None]
    out = {"latitude": lat, "longitude": lon, "profile": profile, "observedAt": data["time"]}
    return envelope("Copernicus Marine", TEMPERATURE_DATASET, None, out, confidence="OBSERVED")


def salinity_profile(lat: float, lon: float):
    params = {"lat": round(lat, 2), "lon": round(lon, 2)}

    def fetch():
        point = _open_point(SALINITY_DATASET, lat, lon, ["so"])
        depths = point["depth"].values.tolist()
        values = _clean_list(point["so"].values.tolist())
        time_str = str(point["time"].values)
        return {"depths": depths, "values": values, "time": time_str}

    data = cached_fetch("copernicus_salinity", params, fetch, ttl_seconds=12 * 3600)
    profile = [{"depthMeters": round(d, 1), "salinityPsu": v} for d, v in zip(data["depths"], data["values"])]
    profile = [p for p in profile if p["salinityPsu"] is not None]
    out = {"latitude": lat, "longitude": lon, "profile": profile, "observedAt": data["time"]}
    return envelope("Copernicus Marine", SALINITY_DATASET, None, out, confidence="OBSERVED")


def surface_current(lat: float, lon: float):
    params = {"lat": round(lat, 2), "lon": round(lon, 2)}

    def fetch():
        point = _open_point(CURRENT_DATASET, lat, lon, ["uo", "vo"], depth_cap=1)
        u = _clean(np.asarray(point["uo"].values).flat[0])
        v = _clean(np.asarray(point["vo"].values).flat[0])
        time_str = str(point["time"].values)
        return {"u": u, "v": v, "time": time_str}

    data = cached_fetch("copernicus_current", params, fetch, ttl_seconds=12 * 3600)
    u, v = data["u"], data["v"]
    if u is None or v is None:
        out = {"latitude": lat, "longitude": lon, "speedMs": None, "directionDeg": None, "observedAt": data["time"]}
    else:
        speed = math.hypot(u, v)
        direction = (math.degrees(math.atan2(u, v)) + 360) % 360  # degrees clockwise from north, oceanographic convention
        out = {"latitude": lat, "longitude": lon, "speedMs": round(speed, 3), "directionDeg": round(direction, 1), "observedAt": data["time"]}
    return envelope("Copernicus Marine", CURRENT_DATASET, None, out, confidence="OBSERVED")
