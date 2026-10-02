"""Fetches a real Wikipedia/Commons lead image for a topic, verifying its
license via the Commons API's own extmetadata rather than trusting a
thumbnail URL blindly — only public domain / CC0 / CC BY (non-NC, non-ND)
images are returned. This is what lets Abyss show real species photos
without "random Google Images" (blueprint rule: images need their own
license record, independent of the scientific data they illustrate)."""

import re

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get

_HEADERS = {"User-Agent": "AstiloAbyss/1.0 (educational marine biology app)"}
_ACTION_API = "https://en.wikipedia.org/w/api.php"
_COMMONS_API = "https://commons.wikimedia.org/w/api.php"

_ALLOWED_LICENSE_HINTS = ("public domain", "cc0", "cc-zero")


def _license_ok(license_name: str) -> bool:
    name = (license_name or "").lower()
    if any(hint in name for hint in _ALLOWED_LICENSE_HINTS):
        return True
    normalized = name.replace("-", " ")
    if "cc by" in normalized and "nc" not in normalized and "nd" not in normalized:
        return True
    return False


def _strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "").strip()


def fetch_licensed_image(title: str) -> dict | None:
    """Returns {"url", "license", "artist", "pageTitle"} for the topic's
    real lead image if (and only if) its license clears the allowed set, or
    None if there's no image or its license doesn't qualify — callers must
    treat None as "no verified open image available", not an error."""
    name_params = {"action": "query", "titles": title, "prop": "pageimages", "piprop": "name", "format": "json"}

    def fetch_name():
        resp = cosmos_get(_ACTION_API, params=name_params, headers=_HEADERS, timeout=12)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("wikipedia_pageimage_name", name_params, fetch_name, ttl_seconds=30 * 24 * 3600)
    pages = raw.get("query", {}).get("pages") or {}
    filename = None
    for page in pages.values():
        filename = page.get("pageimage")
    if not filename:
        return None

    info_params = {"action": "query", "titles": f"File:{filename}", "prop": "imageinfo", "iiprop": "extmetadata|url", "format": "json"}

    def fetch_info():
        resp = cosmos_get(_ACTION_API, params=info_params, headers=_HEADERS, timeout=12)
        resp.raise_for_status()
        return resp.json()

    info_raw = cached_fetch("wikipedia_image_license", info_params, fetch_info, ttl_seconds=30 * 24 * 3600)
    info_pages = info_raw.get("query", {}).get("pages") or {}
    for page in info_pages.values():
        imageinfo = (page.get("imageinfo") or [None])[0]
        if not imageinfo:
            continue
        meta = imageinfo.get("extmetadata", {})
        license_name = meta.get("LicenseShortName", {}).get("value", "")
        if not _license_ok(license_name):
            return None
        return {
            "url": imageinfo.get("url"),
            "license": license_name or "Unknown",
            "artist": _strip_html(meta.get("Artist", {}).get("value", "")),
            "pageTitle": title,
        }
    return None


def _file_license(filename: str) -> dict | None:
    """Same license-gate as fetch_licensed_image, but for a specific known
    Commons filename rather than a page's lead image — used by
    search_commons_images to verify each full-text search hit individually."""
    params = {"action": "query", "titles": f"File:{filename}", "prop": "imageinfo", "iiprop": "extmetadata|url", "format": "json"}

    def fetch():
        resp = cosmos_get(_COMMONS_API, params=params, headers=_HEADERS, timeout=12)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("commons_file_license", params, fetch, ttl_seconds=30 * 24 * 3600)
    pages = raw.get("query", {}).get("pages") or {}
    for page in pages.values():
        imageinfo = (page.get("imageinfo") or [None])[0]
        if not imageinfo:
            continue
        meta = imageinfo.get("extmetadata", {})
        license_name = meta.get("LicenseShortName", {}).get("value", "")
        if not _license_ok(license_name):
            return None
        return {
            "url": imageinfo.get("url"),
            "license": license_name or "Unknown",
            "artist": _strip_html(meta.get("Artist", {}).get("value", "")),
            "pageTitle": filename,
        }
    return None


def search_commons_images(query: str, limit: int = 8) -> list[dict]:
    """Full-text searches Commons' File namespace directly (rather than one
    article's lead image) — much better suited to finding topic-specific
    diagrams like "shark anatomy" that no single Wikipedia article's
    pageimage would surface. Every hit is still individually license-gated
    before being returned."""
    params = {"action": "query", "list": "search", "srsearch": query, "srnamespace": 6, "srlimit": limit, "format": "json"}

    def fetch():
        resp = cosmos_get(_COMMONS_API, params=params, headers=_HEADERS, timeout=12)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("commons_file_search", params, fetch, ttl_seconds=7 * 24 * 3600)
    hits = raw.get("query", {}).get("search") or []

    results = []
    for hit in hits:
        filename = hit.get("title", "").replace("File:", "")
        if filename.lower().endswith((".ogg", ".oga", ".flac", ".wav", ".mp3", ".pdf")):
            continue
        info = _file_license(filename)
        if info:
            results.append(info)
    return results
