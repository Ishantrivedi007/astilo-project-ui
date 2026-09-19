"""NASA adapters.

nasa_images_search needs no key. apod / neo_feed / donki_notifications use
api.nasa.gov and need NASA_API_KEY (config.py defaults to the public
DEMO_KEY, which is heavily rate-limited — see README for getting a real one).
"""

from app.config import config
from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

IMAGES_SEARCH_URL = "https://images-api.nasa.gov/search"
API_BASE = "https://api.nasa.gov"


def images_search(query: str, media_type: str = "image", limit: int = 25):
    params = {"q": query, "media_type": media_type}

    def fetch():
        resp = cosmos_get(IMAGES_SEARCH_URL, params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("nasa_images", params, fetch, ttl_seconds=12 * 3600)

    items = raw.get("collection", {}).get("items", [])[:limit]
    results = []
    for item in items:
        meta = (item.get("data") or [{}])[0]
        preview = (item.get("links") or [{}])[0].get("href")
        results.append(
            {
                "nasaId": meta.get("nasa_id"),
                "title": meta.get("title"),
                "description": meta.get("description"),
                "dateCreated": meta.get("date_created"),
                "center": meta.get("center"),
                "keywords": meta.get("keywords"),
                "previewUrl": preview,
            }
        )
    return envelope("NASA Image and Video Library", "search", None, {"count": len(results), "results": results}, None)


def apod(date: str | None = None):
    """Astronomy Picture of the Day. `date` is YYYY-MM-DD; omit for today."""
    params = {"api_key": config.NASA_API_KEY}
    if date:
        params["date"] = date

    def fetch():
        resp = cosmos_get(f"{API_BASE}/planetary/apod", params=params)
        _raise_for_nasa_status(resp)
        return resp.json()

    raw = cached_fetch("nasa_apod", {"date": date or "today"}, fetch, ttl_seconds=6 * 3600)

    data = {
        "title": raw.get("title"),
        "explanation": raw.get("explanation"),
        "date": raw.get("date"),
        "mediaType": raw.get("media_type"),
        "imageUrl": raw.get("url"),
        "hdImageUrl": raw.get("hdurl"),
        "copyright": raw.get("copyright"),
    }
    return envelope("NASA APOD", "apod", raw.get("date"), data, raw)


def neo_feed(start_date: str, end_date: str):
    """Near-Earth objects with a close approach in [start_date, end_date] (max 7 days)."""
    params = {"start_date": start_date, "end_date": end_date, "api_key": config.NASA_API_KEY}

    def fetch():
        resp = cosmos_get(f"{API_BASE}/neo/rest/v1/feed", params=params)
        _raise_for_nasa_status(resp)
        return resp.json()

    raw = cached_fetch("nasa_neows", params, fetch, ttl_seconds=3600)

    objects = []
    for day, items in (raw.get("near_earth_objects") or {}).items():
        for neo in items:
            approach = (neo.get("close_approach_data") or [{}])[0]
            diameter = neo.get("estimated_diameter", {}).get("meters", {})
            objects.append(
                {
                    "name": neo.get("name"),
                    "neoReferenceId": neo.get("neo_reference_id"),
                    "closeApproachDate": approach.get("close_approach_date_full") or day,
                    "missDistanceKm": (approach.get("miss_distance") or {}).get("kilometers"),
                    "relativeVelocityKmS": (approach.get("relative_velocity") or {}).get("kilometers_per_second"),
                    "estimatedDiameterMinM": diameter.get("estimated_diameter_min"),
                    "estimatedDiameterMaxM": diameter.get("estimated_diameter_max"),
                    "absoluteMagnitudeH": neo.get("absolute_magnitude_h"),
                    "potentiallyHazardous": neo.get("is_potentially_hazardous_asteroid"),
                }
            )
    return envelope("NASA NeoWs", "feed", None, {"count": len(objects), "results": objects}, None)


def donki_notifications(start_date: str, end_date: str, event_type: str = "all"):
    """Space-weather events (flares, CMEs, geomagnetic storms) in a date range."""
    params = {"startDate": start_date, "endDate": end_date, "type": event_type, "api_key": config.NASA_API_KEY}

    def fetch():
        resp = cosmos_get(f"{API_BASE}/DONKI/notifications", params=params)
        _raise_for_nasa_status(resp)
        return resp.json()

    raw = cached_fetch("nasa_donki", params, fetch, ttl_seconds=3600)

    results = [
        {
            "messageType": n.get("messageType"),
            "issueTime": n.get("messageIssueTime"),
            "body": n.get("messageBody"),
            "url": n.get("messageURL"),
        }
        for n in (raw if isinstance(raw, list) else [])
    ]
    return envelope("NASA DONKI", "notifications", None, {"count": len(results), "results": results}, None)


def _raise_for_nasa_status(resp):
    if resp.status_code == 429:
        raise NasaRateLimitError("NASA API rate limit exceeded — configure NASA_API_KEY for a higher limit")
    resp.raise_for_status()


class NasaRateLimitError(Exception):
    pass
