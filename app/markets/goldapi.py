"""gold-api.com — a free, keyless, unofficial live spot-price API for gold
and silver. Real, stated limitation: this only gives the CURRENT price —
no historical time series (their /history endpoint requires a paid API
key, confirmed live: returns 401 "No x-api-key header"), so as a Markets
chart fallback it can only ever produce a single-point "chart" (today's
price, nothing before it) — the response is explicitly flagged
`spotOnly: True` so callers can show "current price only, no historical
trend from this fallback" rather than silently rendering a flat
single-point line as if it were real history.

For quote-ONLY use (placing a simulated trade, checking a watchlist
price, evaluating a price alert) that single current price is exactly
what's needed and this is a full, real fallback there — it's only the
full asset/chart page where this is a partial answer.

Smaller/less-established than this app's other providers — no published
SLA, rate limits, or uptime guarantee were found for this service. Used
strictly as a last-resort fallback, after Yahoo and Alpha Vantage both
have nothing, never as a primary source.
"""

import datetime

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.gold-api.com/price"

# Yahoo metal-futures ticker -> (gold-api.com symbol, display name).
SYMBOLS = {"GC=F": ("XAU", "Gold"), "SI=F": ("XAG", "Silver")}


def spot(yahoo_symbol: str):
    entry = SYMBOLS.get((yahoo_symbol or "").upper())
    if not entry:
        return None
    code, name = entry

    def fetch():
        resp = markets_get(f"{BASE}/{code}")
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("goldapi_spot", {"code": code}, fetch, ttl_seconds=120)
    if not raw or raw.get("price") is None:
        return None

    try:
        price = float(raw["price"])
    except (TypeError, ValueError):
        return None

    now_ms = datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000
    point = {"t": now_ms, "open": price, "high": price, "low": price, "close": price, "volume": None}

    data = {
        "symbol": yahoo_symbol,
        "name": name,
        "currency": raw.get("currency") or "USD",
        "exchange": "gold-api.com",
        "instrumentType": "COMMODITY",
        "price": price,
        "previousClose": None,
        "change": None,
        "changePercent": None,
        "dayHigh": None,
        "dayLow": None,
        "volume": None,
        "fiftyTwoWeekHigh": None,
        "fiftyTwoWeekLow": None,
        "logoUrl": None,
        "marketTime": now_ms,
        "range": "1d",
        "interval": "spot",
        "points": [point],
        "spotOnly": True,
    }
    return envelope("gold-api.com", "spot", yahoo_symbol, data)
