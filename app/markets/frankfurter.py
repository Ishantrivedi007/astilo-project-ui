"""Frankfurter (frankfurter.dev) — the European Central Bank's free, keyless
daily reference-rate API. An independent second data source for FOREX PAIRS
ONLY, used as an automatic fallback when Yahoo Finance's chart call fails or
has no data.

This replaces an earlier attempt at using Stooq for this fallback: Stooq now
serves a JavaScript proof-of-work bot-check page to every plain HTTP
request (verified live, not just a sandbox artifact), so it can never
actually return data through a server-side fetch — that provider was dead
on arrival and has been removed rather than left in place pretending to
work.

Real, stated limitations of this replacement: the ECB only publishes ONE
rate per business day (no weekends/holidays, no intraday), and it has NO
metals data (gold/silver aren't currencies), so unlike the old Stooq
mapping, gold/silver spot has no fallback here — that gap is real and
currently unfilled, not hidden.
"""

import datetime

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.frankfurter.dev/v1"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")

# Calendar-day lookback per range (ECB rates are business-day-only, so the
# actual point count will be somewhat less than this span implies).
RANGE_DAYS = {
    "1d": 7,
    "5d": 10,
    "1mo": 35,
    "6mo": 190,
    "1y": 370,
    "5y": 1830,
    "max": 365 * 20,
}


def yahoo_symbol_to_frankfurter(symbol: str) -> tuple[str, str] | None:
    """Maps a Yahoo Finance forex ticker (e.g. "EURUSD=X", "JPY=X") to a
    (base, quote) currency pair Frankfurter understands, or None if this
    isn't a forex symbol Frankfurter can serve (it only covers real-world
    currencies — no metals, no futures)."""
    if not symbol or not symbol.upper().endswith("=X"):
        return None
    code = symbol[:-2].upper()
    if len(code) == 6 and code.isalpha():
        return code[:3], code[3:]
    if len(code) == 3 and code.isalpha():
        # Yahoo's convention: a bare 3-letter code means USD-vs-that-code.
        return "USD", code
    return None


def chart(base: str, quote: str, range_: str = "1mo"):
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    days = RANGE_DAYS[range_]
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days)

    def fetch():
        resp = markets_get(
            f"{BASE}/{start.isoformat()}..{end.isoformat()}",
            params={"base": base, "symbols": quote},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch(
        "frankfurter_chart", {"base": base, "quote": quote, "range": range_}, fetch, ttl_seconds=3600
    )
    if not raw or not isinstance(raw.get("rates"), dict) or not raw["rates"]:
        return None

    points = sorted(
        (
            {
                "t": datetime.datetime.strptime(date_str, "%Y-%m-%d")
                .replace(tzinfo=datetime.timezone.utc)
                .timestamp()
                * 1000,
                # ECB publishes one reference rate per day — there's no
                # real open/high/low here, only close. Reporting the same
                # figure for all three would misleadingly imply real
                # intraday range data that doesn't exist, so they're null.
                "open": None,
                "high": None,
                "low": None,
                "close": day_rates.get(quote),
                "volume": None,
            }
            for date_str, day_rates in raw["rates"].items()
            if day_rates.get(quote) is not None
        ),
        key=lambda p: p["t"],
    )
    if not points:
        return None

    last = points[-1]
    prev = points[-2] if len(points) >= 2 else None
    price = last["close"]
    prev_close = prev["close"] if prev else None
    change = (price - prev_close) if prev_close is not None else None
    change_pct = (change / prev_close * 100) if change is not None and prev_close else None
    closes = [p["close"] for p in points if p["close"] is not None]

    symbol = f"{base}{quote}=X"
    data = {
        "symbol": symbol,
        "name": f"{base}/{quote}",
        "currency": quote,
        "exchange": "Frankfurter (ECB)",
        "instrumentType": "CURRENCY",
        "price": price,
        "previousClose": prev_close,
        "change": change,
        "changePercent": change_pct,
        "dayHigh": None,
        "dayLow": None,
        "volume": None,
        # Not a true 52-week figure unless range_ == "1y" — it's the
        # high/low across whatever range was actually fetched.
        "fiftyTwoWeekHigh": max(closes) if closes else None,
        "fiftyTwoWeekLow": min(closes) if closes else None,
        "logoUrl": None,
        "marketTime": last["t"],
        "range": range_,
        "interval": "1d",
        "points": points,
    }
    return envelope("Frankfurter (ECB)", "chart", symbol, data)
