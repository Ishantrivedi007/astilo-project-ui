"""Satellite tracking — CelesTrak (live TLE catalogs, no API key required)
plus local SGP4 propagation for a live lat/lon/altitude.

CelesTrak publishes continuously-updated orbital element sets grouped by
category (stations, active, starlink, weather, ...). We resolve a satellite
by searching the live catalog for a matching name — there is no hardcoded
satellite list here, any name in any published group works.

Docs: https://celestrak.org/NORAD/elements/
"""

import datetime
import math

from sgp4.api import Satrec, jday

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"

# WGS84 constants for ECI -> geodetic conversion.
_WGS84_A = 6378.137  # equatorial radius, km
_WGS84_F = 1 / 298.257223563
_WGS84_E2 = _WGS84_F * (2 - _WGS84_F)


def fetch_tle_group(group: str = "stations") -> list[dict]:
    """Fetches and parses a live TLE catalog for a named CelesTrak group.
    Real, continuously-updated data — not a list Astilo maintains."""
    params = {"GROUP": group, "FORMAT": "tle"}

    def fetch():
        resp = cosmos_get(CELESTRAK_URL, params=params, timeout=15)
        resp.raise_for_status()
        lines = resp.text.strip().splitlines()
        return [
            {"name": lines[i].strip(), "line1": lines[i + 1].strip(), "line2": lines[i + 2].strip()}
            for i in range(0, len(lines) - 2, 3)
        ]

    # TLEs are refreshed by CelesTrak roughly daily; no need to re-fetch every request.
    return cached_fetch(f"celestrak_{group}", params, fetch, ttl_seconds=6 * 3600)


def search_satellites(query: str, group: str = "stations") -> list[dict]:
    """Case-insensitive substring match against a live-fetched TLE group."""
    catalog = fetch_tle_group(group)
    q = query.strip().lower()
    if not q:
        return catalog
    return [s for s in catalog if q in s["name"].lower()]


def satellite_position(name: str, group: str = "stations"):
    """Resolves `name` within `group`'s live catalog and propagates its
    current position via SGP4. Returns None if nothing matches, an
    {"ambiguous": True, "candidates": [...]} envelope if multiple
    satellites match, or the position envelope on a single match."""
    matches = search_satellites(name, group)
    if not matches:
        return None
    if len(matches) > 1:
        candidates = [m["name"] for m in matches]
        return envelope("CelesTrak", "gp", name, {"ambiguous": True, "candidates": candidates}, None)

    sat = matches[0]
    satrec = Satrec.twoline2rv(sat["line1"], sat["line2"])
    now = datetime.datetime.utcnow()
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)
    error, position, _velocity = satrec.sgp4(jd, fr)
    if error != 0:
        return None

    lat, lon, alt_km = _eci_to_geodetic(position, now)
    data = {
        "name": sat["name"],
        "latitude": lat,
        "longitude": lon,
        "altitudeKm": alt_km,
        "timestamp": now.isoformat() + "Z",
    }
    return envelope("CelesTrak", "gp", sat["name"], data, None)


def _gmst_radians(when: datetime.datetime) -> float:
    """Greenwich Mean Sidereal Time, in radians, for converting the ECI
    frame's X/Y (fixed relative to the stars) into Earth-fixed longitude."""
    jd = (
        367 * when.year
        - int(7 * (when.year + int((when.month + 9) / 12)) / 4)
        + int(275 * when.month / 9)
        + when.day
        + 1721013.5
        + (when.hour + when.minute / 60 + when.second / 3600) / 24
    )
    t = (jd - 2451545.0) / 36525.0
    gmst_deg = (
        280.46061837
        + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * t * t
        - t * t * t / 38710000.0
    ) % 360
    return math.radians(gmst_deg)


def _eci_to_ecef(position_km, when: datetime.datetime):
    """Rotates an ECI (Earth-Centered Inertial) position into ECEF
    (Earth-Centered Earth-Fixed) by -GMST around the Z axis — the shared
    first step behind both geodetic conversion and topocentric look-angle
    computation."""
    x, y, z = position_km
    gmst = _gmst_radians(when)
    x_ecef = x * math.cos(gmst) + y * math.sin(gmst)
    y_ecef = -x * math.sin(gmst) + y * math.cos(gmst)
    z_ecef = z
    return x_ecef, y_ecef, z_ecef


def _eci_to_geodetic(position_km, when: datetime.datetime):
    """Converts an ECI (Earth-Centered Inertial) position from SGP4 into
    geodetic latitude/longitude/altitude using the WGS84 ellipsoid —
    standard orbital-mechanics conversion, not fabricated data."""
    x_ecef, y_ecef, z_ecef = _eci_to_ecef(position_km, when)

    longitude = math.degrees(math.atan2(y_ecef, x_ecef))

    p = math.hypot(x_ecef, y_ecef)
    latitude = math.atan2(z_ecef, p * (1 - _WGS84_E2))
    for _ in range(5):
        sin_lat = math.sin(latitude)
        n = _WGS84_A / math.sqrt(1 - _WGS84_E2 * sin_lat * sin_lat)
        altitude = p / math.cos(latitude) - n
        latitude = math.atan2(z_ecef, p * (1 - _WGS84_E2 * n / (n + altitude)))

    sin_lat = math.sin(latitude)
    n = _WGS84_A / math.sqrt(1 - _WGS84_E2 * sin_lat * sin_lat)
    altitude = p / math.cos(latitude) - n

    return math.degrees(latitude), longitude, altitude


def _geodetic_to_ecef(lat_deg: float, lon_deg: float, alt_km: float):
    """WGS84 geodetic (lat/lon/alt) -> ECEF — the inverse direction of
    `_eci_to_geodetic`, needed to place the observer in the same frame as
    the satellite for a look-angle computation."""
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    sin_lat = math.sin(lat)
    n = _WGS84_A / math.sqrt(1 - _WGS84_E2 * sin_lat * sin_lat)
    x = (n + alt_km) * math.cos(lat) * math.cos(lon)
    y = (n + alt_km) * math.cos(lat) * math.sin(lon)
    z = (n * (1 - _WGS84_E2) + alt_km) * sin_lat
    return x, y, z


def _topocentric_look_angles(sat_ecef, observer_ecef, observer_lat_deg: float, observer_lon_deg: float):
    """Given satellite and observer positions in ECEF, returns
    (azimuth_deg, elevation_deg, range_km) as seen from the observer —
    standard range-vector -> East-North-Up rotation."""
    dx = sat_ecef[0] - observer_ecef[0]
    dy = sat_ecef[1] - observer_ecef[1]
    dz = sat_ecef[2] - observer_ecef[2]
    rng = math.sqrt(dx * dx + dy * dy + dz * dz)

    lat = math.radians(observer_lat_deg)
    lon = math.radians(observer_lon_deg)
    sin_lat, cos_lat = math.sin(lat), math.cos(lat)
    sin_lon, cos_lon = math.sin(lon), math.cos(lon)

    east = -sin_lon * dx + cos_lon * dy
    north = -sin_lat * cos_lon * dx - sin_lat * sin_lon * dy + cos_lat * dz
    up = cos_lat * cos_lon * dx + cos_lat * sin_lon * dy + sin_lat * dz

    azimuth = math.degrees(math.atan2(east, north)) % 360
    elevation = math.degrees(math.asin(up / rng)) if rng > 0 else 0.0
    return azimuth, elevation, rng


def next_passes(
    name: str,
    group: str,
    observer_lat: float,
    observer_lon: float,
    observer_alt_km: float = 0.0,
    hours_ahead: float = 48,
    step_seconds: int = 30,
    min_elevation_deg: float = 10.0,
):
    """Finds upcoming visibility windows for a satellite from a real
    observer location, by propagating SGP4 every `step_seconds` across
    `hours_ahead` and computing topocentric elevation at each step — a
    genuine bounded computation, not a lookup or fabricated schedule.
    Returns {"satellite": name, "passes": [...]} or None if the satellite
    name doesn't resolve to exactly one match."""
    hours_ahead = min(hours_ahead, 72)
    matches = search_satellites(name, group)
    if len(matches) != 1:
        return None

    sat = matches[0]
    satrec = Satrec.twoline2rv(sat["line1"], sat["line2"])
    observer_ecef = _geodetic_to_ecef(observer_lat, observer_lon, observer_alt_km)

    start = datetime.datetime.utcnow()
    total_steps = int((hours_ahead * 3600) / step_seconds)

    passes = []
    current_pass = None
    for i in range(total_steps):
        when = start + datetime.timedelta(seconds=i * step_seconds)
        jd, fr = jday(when.year, when.month, when.day, when.hour, when.minute, when.second + when.microsecond / 1e6)
        error, position, _velocity = satrec.sgp4(jd, fr)
        if error != 0:
            continue

        sat_ecef = _eci_to_ecef(position, when)
        azimuth, elevation, _rng = _topocentric_look_angles(sat_ecef, observer_ecef, observer_lat, observer_lon)

        if elevation >= min_elevation_deg:
            if current_pass is None:
                current_pass = {"riseTime": when.isoformat() + "Z", "maxElevationDeg": elevation, "maxElevationTime": when.isoformat() + "Z", "azimuthAtMax": azimuth}
            elif elevation > current_pass["maxElevationDeg"]:
                current_pass["maxElevationDeg"] = elevation
                current_pass["maxElevationTime"] = when.isoformat() + "Z"
                current_pass["azimuthAtMax"] = azimuth
        elif current_pass is not None:
            current_pass["setTime"] = when.isoformat() + "Z"
            passes.append(current_pass)
            current_pass = None

    if current_pass is not None:
        current_pass["setTime"] = None  # still above the horizon at the end of the search window
        passes.append(current_pass)

    return {"satellite": sat["name"], "passes": passes}
