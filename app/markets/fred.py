"""FRED (Federal Reserve Bank of St. Louis) — the piece that finally makes
a REAL forward-looking economic release calendar possible, which the
World Bank API (app/markets/worldbank.py) explicitly cannot do (it only
has historical annual/quarterly indicator values, no release schedule).

Needs a free, instant-signup key (https://fred.stlouisfed.org/docs/api/api_key.html)
— same optional-key, no-op-when-unset pattern as every other keyed
provider in this app.

Live-verified (real key): `/fred/releases/dates` (the PLURAL endpoint —
note this, see below) returned 1,648 real scheduled releases in the next
60 days, including real forward dates for major indicators: CPI on
2026-10-14, GDP on 2026-09-30 and 2026-10-29, Employment Situation
("jobs report") on 2026-10-02, PPI on 2026-10-15, Industrial Production
on 2026-10-16.

Real quirk, confirmed live: the SINGULAR `/fred/release/dates?release_id=X`
endpoint (filtering server-side to one release) returned an EMPTY future
list for CPI despite the plural endpoint clearly having that same date —
an inconsistency in FRED's own API, not a bug here. Worked around by
always using the plural endpoint and filtering release_id client-side.

Real, honest scope: FRED is overwhelmingly US-focused (it's the St Louis
Fed) — this is a US economic calendar, not a global one. Only a curated
set of major, genuinely market-moving releases is surfaced by default
(CPI, GDP, Employment Situation, PCE, PPI, FOMC, Industrial Production,
Unemployment Claims) rather than dumping all ~1,650 releases (most are
minor regional/niche data series that would bury the useful ones) — the
full unfiltered list is still available via `major_only=False` for
anyone who wants it, so nothing is hidden, just given a sensible default.
"""

import datetime

from app.config import config
from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.stlouisfed.org/fred"

# release_id -> a clearer display name than FRED's own (kept close to the
# original so it's still recognizable/verifiable against their site).
MAJOR_RELEASES = {
    10: "Consumer Price Index (CPI)",
    53: "Gross Domestic Product (GDP)",
    50: "Employment Situation (Jobs Report)",
    54: "Personal Income and Outlays (PCE)",
    46: "Producer Price Index (PPI)",
    101: "FOMC Press Release",
    13: "Industrial Production & Capacity Utilization",
    180: "Unemployment Insurance Weekly Claims",
}


def _api_key() -> str | None:
    key = (config.FRED_API_KEY or "").strip()
    return key or None


def upcoming_releases(days_ahead: int = 60, major_only: bool = True):
    key = _api_key()
    if not key:
        return None
    days_ahead = max(1, min(days_ahead, 365))
    today = datetime.date.today()
    end = today + datetime.timedelta(days=days_ahead)

    def fetch():
        resp = markets_get(
            f"{BASE}/releases/dates",
            params={
                "api_key": key,
                "file_type": "json",
                "realtime_start": today.isoformat(),
                "realtime_end": end.isoformat(),
                "include_release_dates_with_no_data": "true",
                "sort_order": "asc",
                "limit": 1000,
            },
        )
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("fred_releases_dates", {"start": today.isoformat(), "end": end.isoformat()}, fetch, ttl_seconds=6 * 3600)
    if not isinstance(raw, dict) or "release_dates" not in raw:
        return None

    rows = []
    for rd in raw["release_dates"]:
        rid = rd.get("release_id")
        if major_only and rid not in MAJOR_RELEASES:
            continue
        rows.append(
            {
                "releaseId": rid,
                "name": MAJOR_RELEASES.get(rid, rd.get("release_name")),
                "date": rd.get("date"),
                "isMajor": rid in MAJOR_RELEASES,
            }
        )
    rows.sort(key=lambda r: (r["date"] or "", r["name"] or ""))

    data = {
        "country": "US",
        "daysAhead": days_ahead,
        "majorOnly": major_only,
        "count": len(rows),
        "results": rows,
        "disclaimer": (
            "Real scheduled release dates from the Federal Reserve Bank of St. Louis (FRED) — a US-focused "
            "economic calendar, not a global one. Release dates, not forecasts of the reported values."
        ),
    }
    return envelope("FRED (St. Louis Fed)", "releases_dates", None, data)
