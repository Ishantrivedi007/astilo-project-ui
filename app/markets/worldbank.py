"""The World Bank's Indicators API — free, keyless, real historical
(annual) macroeconomic data by country. This API does NOT provide a
forward-looking "economic calendar" of upcoming release dates/times (that
data doesn't exist here, and no other free keyless source has it either),
so this module deliberately only exposes real historical indicator trends
rather than an invented release schedule.
"""

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.worldbank.org/v2"

INDICATORS = {
    "gdp": "NY.GDP.MKTP.CD",              # GDP (current US$)
    "gdpGrowth": "NY.GDP.MKTP.KD.ZG",     # GDP growth (annual %)
    "inflation": "FP.CPI.TOTL.ZG",        # Inflation, consumer prices (annual %)
    "unemployment": "SL.UEM.TOTL.ZS",     # Unemployment (% of labor force)
    "interestRate": "FR.INR.RINR",        # Real interest rate (%)
}


def countries():
    """The real list of countries the World Bank publishes indicators for
    — not a curated shortlist. Excludes the API's own "aggregate" rows
    (regions/income groups like "Arab World" or "Euro area", which the
    Bank itself flags via an empty capitalCity/region rather than a
    country's own ISO code) so the picker only offers actual countries."""

    def fetch():
        resp = markets_get(f"{BASE}/country", params={"format": "json", "per_page": 400})
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("worldbank_countries", {}, fetch, ttl_seconds=24 * 3600)

    if not isinstance(raw, list) or len(raw) < 2 or not isinstance(raw[1], list):
        return None

    results = []
    for row in raw[1]:
        region = row.get("region") or {}
        # The Bank's own convention for a non-country aggregate row: no
        # region assigned (region.id == "NA") and no capital city.
        if region.get("id") == "NA" or not row.get("capitalCity"):
            continue
        code = row.get("iso2Code")
        name = row.get("name")
        if not code or not name:
            continue
        results.append({"code": code, "name": name, "region": region.get("value")})

    results.sort(key=lambda c: c["name"])
    return envelope("World Bank", "countries", None, {"count": len(results), "results": results})


def indicator_series(country_code: str, indicator_key: str):
    """One country, one indicator, full available history."""
    if indicator_key not in INDICATORS:
        return None
    indicator_code = INDICATORS[indicator_key]

    def fetch():
        url = f"{BASE}/country/{country_code}/indicator/{indicator_code}"
        resp = markets_get(url, params={"format": "json", "per_page": 100})
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch(
        "worldbank_indicator",
        {"country": country_code, "indicator": indicator_key},
        fetch,
        ttl_seconds=6 * 3600,
    )

    if not isinstance(raw, list) or len(raw) < 2 or not isinstance(raw[1], list):
        return None
    data_rows = raw[1]
    if not data_rows:
        return None

    points = sorted(
        (
            {"year": int(row["date"]), "value": row.get("value")}
            for row in data_rows
            if row.get("date")
        ),
        key=lambda p: p["year"],
    )

    latest_known = None
    for row in data_rows:  # newest-first as returned by the API
        if row.get("value") is not None:
            latest_known = {"year": int(row["date"]), "value": row["value"]}
            break

    country_name = None
    if data_rows[0].get("country"):
        country_name = data_rows[0]["country"].get("value")

    data = {
        "countryCode": country_code,
        "countryName": country_name,
        "indicator": indicator_key,
        "indicatorCode": indicator_code,
        "points": points,
        "latestKnown": latest_known,
    }
    return envelope("World Bank", f"indicator_{indicator_key}", country_code, data)


def macro_dashboard(country_code: str):
    """All indicators for one country in one call, parallel-fetched."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = {}
    country_name = None

    def fetch_one(key):
        return key, indicator_series(country_code, key)

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_one, key): key for key in INDICATORS}
        for future in as_completed(futures):
            key = futures[future]
            try:
                _, env = future.result()
            except Exception:
                env = None
            if env:
                results[key] = env.get("data")
                if country_name is None:
                    country_name = (env.get("data") or {}).get("countryName")
            else:
                results[key] = None

    if country_name is None and not any(results.values()):
        return None

    data = {
        "countryCode": country_code,
        "countryName": country_name,
        "indicators": {key: results.get(key) for key in INDICATORS},
    }
    return envelope("World Bank", "macro_dashboard", country_code, data)
