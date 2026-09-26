import datetime

import cherrypy
import requests

from app.cosmos import deep_space, exoplanets, gaia, heasarc, hubble, jpl, mast, nasa, satellites, simbad, wikipedia
from app.db import get_session
from app.models import CosmosSavedItem


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except nasa.NasaRateLimitError as exc:
        raise cherrypy.HTTPError(429, str(exc))
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Upstream astronomy service timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Upstream astronomy service failed: {exc}")


def _with_parsed_vectors(result: dict, raw_text: str | None) -> dict:
    """Adds a `data.vectors` array (parsed via jpl.parse_vectors) alongside
    the raw Horizons text, so callers like the comparison tool get
    structured numbers without re-parsing text client-side."""
    result["data"]["vectors"] = jpl.parse_vectors(raw_text)
    return result


class AsteroidController:
    """JPL Small-Body Database — no API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, designation=None, **query):
        if query:
            return _guard(jpl.sbdb_query, query)
        if not designation:
            raise cherrypy.HTTPError(400, "designation is required (e.g. ?designation=Apophis)")
        result = _guard(jpl.sbdb_lookup, designation)
        if result is None:
            raise cherrypy.HTTPError(404, f"No small body found matching '{designation}'")
        return result


class CloseApproachController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, designation=None, date_min="now", date_max="+60", dist_max="0.05"):
        return _guard(jpl.close_approaches, designation, date_min, date_max, dist_max)


class HorizonsController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, command=None, start_time=None, stop_time=None, step_size="1d", center="500@10"):
        if not (command and start_time and stop_time):
            raise cherrypy.HTTPError(400, "command, start_time and stop_time are required")
        return _guard(jpl.horizons_ephemeris, command, start_time, stop_time, step_size, center)


class ExoplanetController:
    """NASA Exoplanet Archive TAP — no API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None, host_star=None, exact_name=None, limit=25):
        if exact_name:
            planet = _guard(exoplanets.get_planet, exact_name)
            if planet is None:
                raise cherrypy.HTTPError(404, f"No exoplanet found matching '{exact_name}'")
            return planet
        return _guard(exoplanets.search_planets, name, host_star, int(limit))


class TelescopeObservationController:
    """MAST (Hubble/JWST/TESS/Kepler/...) — no API key required for public data."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, target=None, mission=None, limit=25):
        if not target:
            raise cherrypy.HTTPError(400, "target is required (e.g. ?target=M16)")
        return _guard(mast.search_observations, target, mission, int(limit))


class NasaImagesController:
    """NASA Image and Video Library — no API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, media_type="image", limit=25):
        if not q:
            raise cherrypy.HTTPError(400, "q is required")
        return _guard(nasa.images_search, q, media_type, int(limit))


class ApodController:
    """Astronomy Picture of the Day — needs NASA_API_KEY (defaults to DEMO_KEY)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, date=None):
        return _guard(nasa.apod, date)


class NeoWsController:
    """Near-Earth objects feed — needs NASA_API_KEY (defaults to DEMO_KEY)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, start_date=None, end_date=None):
        if not (start_date and end_date):
            raise cherrypy.HTTPError(400, "start_date and end_date are required (max 7-day span)")
        return _guard(nasa.neo_feed, start_date, end_date)


class DonkiController:
    """Space weather notifications — needs NASA_API_KEY (defaults to DEMO_KEY)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, start_date=None, end_date=None, event_type="all"):
        if not (start_date and end_date):
            raise cherrypy.HTTPError(400, "start_date and end_date are required")
        return _guard(nasa.donki_notifications, start_date, end_date, event_type)


class StarController:
    """ESA Gaia (via SIMBAD name resolution) — no API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Sirius)")
        result = _guard(gaia.search_star, name)
        if result is None:
            raise cherrypy.HTTPError(404, f"No star found matching '{name}'")
        return result


class HighEnergyObservationController:
    """HEASARC (NuSTAR master catalog by default) — no API key required.
    Useful for X-ray sources like black holes that have no optical
    counterpart to search by name directly."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None, catalog="numaster", radius=0.2, limit=10):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Cygnus X-1)")
        try:
            result = _guard(heasarc.search_observations, name, catalog, float(radius), int(limit))
        except ValueError as exc:
            raise cherrypy.HTTPError(400, str(exc))
        if result is None:
            raise cherrypy.HTTPError(404, f"Could not resolve coordinates for '{name}'")
        return result


class GalaxyController:
    """SIMBAD generic object lookup, used for galaxies (and other deep-sky
    objects SIMBAD covers that don't fit a dedicated mission catalog) — no
    API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Andromeda Galaxy)")
        result = _guard(simbad.lookup_object, name)
        if result is None:
            raise cherrypy.HTTPError(404, f"No object found matching '{name}'")
        return result


class SupernovaController:
    """HEASARC's Green's Supernova Remnant Catalog — no API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None, radius=1.0, limit=10):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Crab Nebula)")
        result = _guard(heasarc.search_observations, name, "snrgreen", float(radius), int(limit))
        if result is None:
            raise cherrypy.HTTPError(404, f"Could not resolve coordinates for '{name}'")
        return result


class MoonController:
    """Moon position/trajectory via JPL Horizons — no API key required.
    `name` is resolved by Horizons itself (e.g. 'Europa', 'Titan'), not a
    lookup table Astilo maintains; an ambiguous name comes back as a
    candidate list rather than a guess."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None, start_time=None, stop_time=None, step_size="1d", center="500@10"):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Europa)")
        if not (start_time and stop_time):
            raise cherrypy.HTTPError(400, "start_time and stop_time are required")
        # Sun-centered by default, matching HorizonsController — a moon's
        # parent planet varies (Europa orbits Jupiter, Titan orbits Saturn),
        # so a single hardcoded center would be wrong for most of them; the
        # caller can override `center` for a planet-relative view instead.
        result = _guard(jpl.horizons_ephemeris, name, start_time, stop_time, step_size, center)
        raw_text = result.get("data", {}).get("result")
        if jpl.is_ambiguous_match(raw_text):
            return {"ambiguous": True, "candidates": jpl.extract_match_candidates(raw_text)}
        return _with_parsed_vectors(result, raw_text)


class NebulaController:
    """SIMBAD generic object lookup — nebulae are deep-sky objects SIMBAD
    covers the same way as galaxies, just a distinct UI category. No API
    key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Orion Nebula)")
        result = _guard(simbad.lookup_object, name)
        if result is None:
            raise cherrypy.HTTPError(404, f"No object found matching '{name}'")
        return result


class CometController:
    """JPL Small-Body Database, same backing as AsteroidController — comets
    are distinguished by the `kind` field SBDB already returns. No API key
    required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, designation=None):
        if not designation:
            raise cherrypy.HTTPError(400, "designation is required (e.g. ?designation=Halley)")
        result = _guard(jpl.sbdb_lookup, designation)
        if result is None:
            raise cherrypy.HTTPError(404, f"No comet found matching '{designation}'")
        return result


class SpacecraftController:
    """Spacecraft position/trajectory via JPL Horizons — no API key
    required. `name` is resolved by Horizons itself (e.g. 'Voyager 1',
    'James Webb Space Telescope'), not a lookup table Astilo maintains."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name=None, start_time=None, stop_time=None, step_size="1d", center="500@10"):
        if not name:
            raise cherrypy.HTTPError(400, "name is required (e.g. ?name=Voyager 1)")
        if not (start_time and stop_time):
            raise cherrypy.HTTPError(400, "start_time and stop_time are required")
        result = _guard(jpl.horizons_ephemeris, name, start_time, stop_time, step_size, center)
        raw_text = result.get("data", {}).get("result")
        if jpl.is_ambiguous_match(raw_text):
            return {"ambiguous": True, "candidates": jpl.extract_match_candidates(raw_text)}
        return _with_parsed_vectors(result, raw_text)


class MissionBrowseController:
    """MAST browse-by-mission, no target name required. `mission` and
    `instrument` are free text — any obs_collection/instrument_name value
    MAST recognizes, not a fixed list. `start_date`/`end_date` are ISO
    YYYY-MM-DD, filtering on the observation's own timestamp."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, mission=None, limit=25, instrument=None, start_date=None, end_date=None):
        if not mission:
            raise cherrypy.HTTPError(400, "mission is required (e.g. ?mission=JWST)")
        return _guard(mast.browse_mission, mission, int(limit), instrument, start_date, end_date)


class DeepSpaceCatalogController:
    """Voyager 1, Voyager 2, and New Horizons — real live distance/speed via
    JPL Horizons for each. No API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(deep_space.get_catalog)


class DeepSpaceProbeController:
    """One probe's full detail: live position/distance/speed (JPL Horizons)
    plus real raw instrument science data — NASA CDAWeb for the Voyagers,
    NASA PDS (parsed via pds4_tools) for New Horizons. No API key
    required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, probe=None):
        if not probe or probe not in deep_space.PROBES:
            raise cherrypy.HTTPError(400, f"probe is required, one of: {', '.join(deep_space.PROBES)}")
        return _guard(deep_space.get_probe_detail, probe)


class DeepSpaceMonitorController:
    """Real diff against each probe's latest archived science-data marker
    since the last check — not a live telemetry simulation. No API key
    required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(deep_space.check_for_new_probe_data)


class HubbleCatalogController:
    """Astilo's curated Hubble target catalog, browsable by category
    (planet/moon/asteroid/comet/star/exoplanet/nebula/galaxy/supernova/
    black_hole). `q` switches to a free-text SIMBAD-classified lookup for
    targets outside the curated list. No API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, category=None, q=None, limit=40, offset=0):
        if q:
            return _guard(hubble.search_targets, q, int(limit))
        return _guard(hubble.browse_targets, category, int(limit), int(offset))


class HubbleTargetController:
    """Aggregated Hubble research page for one target — composition,
    distance from Earth, classification, and imagery pulled from MAST,
    SIMBAD, the NASA Exoplanet Archive, Gaia, JPL SBDB, HEASARC and
    Wikipedia as applicable to the target's category. No API key
    required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, target=None):
        if not target:
            raise cherrypy.HTTPError(400, "target is required (e.g. ?target=crab-nebula)")
        return _guard(hubble.get_target_detail, target)


class HubblePositionController:
    """Hubble's real current orbital position (lat/lon/altitude) via
    CelesTrak TLE + SGP4 — the same live-tracking mechanism as
    SatelliteController, resolved specifically to HST. This is where the
    telescope physically is in orbit, not where it's pointing/aiming for a
    given observation (no public API exposes that). No API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(hubble.get_position)


class HubbleMonitorController:
    """Live-monitoring poll for the Hubble tab — checks a rotating slice of
    the curated catalog against MAST's current observation counts and
    reports which targets have genuinely new data since their last check.
    A real diff against MAST's own archive, polled by the frontend on an
    interval; not a simulation of telescope telemetry. No API key
    required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, limit=12):
        return _guard(hubble.check_for_new_observations, int(limit))


class SpectrumController:
    """A real, parsed wavelength/flux spectrum for one MAST observation —
    downloads and parses the actual FITS data product. No API key
    required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, obsid=None):
        if not obsid:
            raise cherrypy.HTTPError(400, "obsid is required")
        result = _guard(mast.fetch_spectrum, obsid)
        if result is None:
            raise cherrypy.HTTPError(404, f"No spectrum data product found for observation '{obsid}'")
        return result


class FitsImageController:
    """A real, normalized preview PNG generated from an observation's own
    FITS image data (not the jpegURL quick-look thumbnail, which many
    observations lack), plus pixel statistics and header fields — the
    actual FITS file is downloaded and decoded here. No API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, obsid=None):
        if not obsid:
            raise cherrypy.HTTPError(400, "obsid is required")
        result = _guard(mast.fetch_fits_image, obsid)
        if result is None:
            raise cherrypy.HTTPError(404, f"No image data product found for observation '{obsid}'")
        return result


class SatelliteController:
    """Live satellite position via CelesTrak TLE data + local SGP4
    propagation — no API key required. `name`/`group` resolve against
    CelesTrak's live, continuously-updated catalogs, not a satellite list
    Astilo maintains; defaults to the ISS but any tracked satellite works."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name="ISS", group="stations"):
        result = _guard(satellites.satellite_position, name, group)
        if result is None:
            raise cherrypy.HTTPError(404, f"No satellite found matching '{name}' in group '{group}'")
        return result


class SatelliteSearchController:
    """Live-searches a CelesTrak satellite group by name, for the tracker's
    picker UI. No API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q="", group="stations"):
        results = _guard(satellites.search_satellites, q, group)
        return {"count": len(results), "results": [{"name": r["name"]} for r in results]}


class SatellitePassesController:
    """Upcoming visibility windows for a satellite from a real observer
    location — computed live via SGP4 propagation + topocentric look-angle
    math, not a lookup or fabricated schedule. No API key required."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, name="ISS", group="stations", lat=None, lon=None, alt=0.0, hours=48, min_elevation=10.0):
        if lat is None or lon is None:
            raise cherrypy.HTTPError(400, "lat and lon are required (from the browser's own location)")
        result = _guard(
            satellites.next_passes,
            name, group, float(lat), float(lon),
            observer_alt_km=float(alt), hours_ahead=float(hours), min_elevation_deg=float(min_elevation),
        )
        if result is None:
            raise cherrypy.HTTPError(404, f"'{name}' does not resolve to exactly one satellite in group '{group}'")
        return result


class SpaceWeatherPulseController:
    """DONKI events from the last `since_hours` — a thin, live-computed
    convenience wrapper for an in-app alerts widget, following the same
    compute-on-request pattern as NimrosePulse (no persisted alert state,
    no background scheduler — none exists in this backend)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, since_hours=24):
        now = datetime.datetime.utcnow()
        start = now - datetime.timedelta(hours=float(since_hours))
        return _guard(nasa.donki_notifications, start.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"), "all")


class AstronomyTopicsController:
    """Live Wikipedia category membership — powers the reference library's
    topic list from a real, currently-existing Wikipedia category rather
    than any list Astilo curates and freezes in code."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, category="Astronomy", limit=30):
        return _guard(wikipedia.category_members, category, int(limit))


class ResearchSummaryController:
    """A real, sourced background summary for an object — pulled live from
    Wikipedia's public API (not scraped HTML, not fabricated). Used to give
    the Research module actual understandable prose instead of just the raw
    structured fields Cosmos's other endpoints return."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None):
        if not q:
            raise cherrypy.HTTPError(400, "q is required (the object/topic to look up)")
        return _guard(wikipedia.research_summary, q)


class CosmosLibraryController:
    """A user's saved Cosmos objects — planets, asteroids, exoplanets, stars,
    telescope observations. Mirrors FavoritesController's shape."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, object_type=None, collection=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            query = session.query(CosmosSavedItem).filter_by(user_id=user_id)
            if object_type:
                query = query.filter_by(object_type=object_type)
            if collection:
                query = query.filter_by(collection=collection)
            return [item.to_dict() for item in query.order_by(CosmosSavedItem.created_at.desc()).all()]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        user_id = int(cherrypy.request.user["sub"])
        body = cherrypy.request.json or {}
        object_type = body.get("objectType")
        external_id = str(body.get("externalId", ""))

        valid_types = (
            "planet", "asteroid", "exoplanet", "star", "observation", "image", "galaxy", "supernova",
            "moon", "nebula", "comet", "spacecraft", "hubbleTarget",
        )
        if object_type not in valid_types or not external_id:
            raise cherrypy.HTTPError(400, f"objectType ({'|'.join(valid_types)}) and externalId are required")

        with get_session() as session:
            existing = session.query(CosmosSavedItem).filter_by(
                user_id=user_id, object_type=object_type, external_id=external_id
            ).first()
            if existing:
                return existing.to_dict()

            item = CosmosSavedItem(
                user_id=user_id,
                object_type=object_type,
                external_id=external_id,
                collection=body.get("collection") or "favorites",
                title=body.get("title"),
                source=body.get("source"),
                source_dataset=body.get("sourceDataset"),
                image_url=body.get("imageUrl"),
                data_json=body.get("data"),
                notes=body.get("notes"),
            )
            session.add(item)
            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, item_id):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            item = session.query(CosmosSavedItem).filter_by(id=int(item_id), user_id=user_id).first()
            if not item:
                raise cherrypy.HTTPError(404, "Saved item not found")
            session.delete(item)
            return {"deleted": True}
