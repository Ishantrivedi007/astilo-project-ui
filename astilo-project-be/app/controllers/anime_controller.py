import json
import threading
import time

import cherrypy
import requests

ANILIST_URL = "https://graphql.anilist.co"

_CACHE_TTL = 300  # seconds — AniList allows ~90 req/min, so cache reads briefly
_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()


class AnimeController:
    """Proxies the AniList GraphQL API (free, keyless, its own database — not a MAL scraper)."""

    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        query = body.get("query")
        variables = body.get("variables") or {}
        if not query:
            raise cherrypy.HTTPError(400, "query is required")

        cache_key = json.dumps({"query": query, "variables": variables}, sort_keys=True)

        with _cache_lock:
            cached = _cache.get(cache_key)
            if cached and time.time() - cached[0] < _CACHE_TTL:
                return cached[1]

        resp = requests.post(
            ANILIST_URL,
            json={"query": query, "variables": variables},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=10,
        )
        if resp.status_code >= 400:
            raise cherrypy.HTTPError(resp.status_code, "AniList request failed")

        data = resp.json()
        with _cache_lock:
            _cache[cache_key] = (time.time(), data)
        return data
