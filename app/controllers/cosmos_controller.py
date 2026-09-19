import cherrypy
import requests

from app.cosmos import exoplanets, gaia, heasarc, jpl, mast, nasa
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

        valid_types = ("planet", "asteroid", "exoplanet", "star", "observation", "image")
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
