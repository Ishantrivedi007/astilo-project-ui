import cherrypy
import requests

from app.images import openverse


class WebImageSearchController:
    """General internet-wide image search (Openverse — free, keyless,
    real attribution/license per result), for anything not astronomy-
    specific that the NASA image library wouldn't cover."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, limit=12):
        if not q:
            raise cherrypy.HTTPError(400, "q is required")
        try:
            return openverse.search(q, int(limit))
        except requests.exceptions.Timeout:
            raise cherrypy.HTTPError(504, "Image search timed out")
        except requests.exceptions.RequestException as exc:
            raise cherrypy.HTTPError(502, f"Image search failed: {exc}")
