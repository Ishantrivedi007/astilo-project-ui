"""Twelve Data's free-tier API — used narrowly, for exactly one thing:
real historical gold (XAU/USD) data as a fallback when Yahoo fails.

Needs a free, instant-signup key (https://twelvedata.com/pricing, "Basic"
plan) — same optional-key, no-op-when-unset pattern as ALPHA_VANTAGE_API_KEY
and NASA_API_KEY elsewhere in this app.

Live-tested (real key) what this free tier actually covers, since their
docs don't clearly state it: broad equity indices (SPX, DJI, IXIC, FTSE,
NIFTY/NSEI) are ALL gated behind a paid "Grow/Venture" plan on the free
tier — confirmed via their own error message, not assumed. Individual
NSE-listed stocks are gated the same way. Regular US equities work, but
Alpha Vantage already covers those, so nothing new there. Gold (XAU/USD)
DOES work on the free tier with full daily OHLC history — confirmed live,
30 real days pulled. Silver (XAG/USD) does NOT — same paid-plan gate,
confirmed live. So this module exists purely to upgrade the gold fallback
from gold-api.com's current-price-only data to a real historical chart;
silver still falls through to gold-api.com's spot-only fallback.
"""

import datetime

from app.config import config
from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.twelvedata.com/time_series"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")
OUTPUT_SIZE = {"1d": 2, "5d": 7, "1mo": 35, "6mo": 190, "1y": 370, "5y": 1825, "max": 5000}

# Only gold has free-tier coverage here — see module docstring.
METAL_SYMBOLS = {"GC=F": ("XAU/USD", "Gold")}


def _api_key() -> str | None:
    key = (config.TWELVE_DATA_API_KEY or "").strip()
    return key or None


def _date_ms(date_str: str) -> float:
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() * 1000


def metal_chart(yahoo_symbol: str, range_: str = "1mo"):
    key = _api_key()
    if not key:
        return None
    entry = METAL_SYMBOLS.get((yahoo_symbol or "").upper())
    if not entry:
        return None
    td_symbol, name = entry
    range_ = range_ if range_ in VALID_RANGES else "1mo"

    def fetch():
        resp = markets_get(
            BASE,
            params={"symbol": td_symbol, "interval": "1day", "outputsize": OUTPUT_SIZE[range_], "apikey": key},
        )
        resp.raise_for_status()
        return resp.json()

    ttl = 300 if range_ == "1d" else 3600
    raw = cached_fetch(f"twelvedata_metal_{range_}", {"symbol": td_symbol}, fetch, ttl_seconds=ttl)
    if not isinstance(raw, dict) or raw.get("status") == "error" or "values" not in raw:
        return None

    try:
        rows = sorted(raw["values"], key=lambda v: v["datetime"])
        points = []
        for v in rows:
            points.append(
                {
                    "t": _date_ms(v["datetime"]),
                    "open": float(v["open"]),
                    "high": float(v["high"]),
                    "low": float(v["low"]),
                    "close": float(v["close"]),
                    "volume": float(v["volume"]) if v.get("volume") else None,
                }
            )
    except (KeyError, ValueError, TypeError):
        return None
    if not points:
        return None

    last = points[-1]
    prev = points[-2] if len(points) >= 2 else None
    price = last["close"]
    prev_close = prev["close"] if prev else None
    change = (price - prev_close) if prev_close is not None else None
    change_pct = (change / prev_close * 100) if change is not None and prev_close else None
    highs = [p["high"] for p in points]
    lows = [p["low"] for p in points]

    data = {
        "symbol": yahoo_symbol,
        "name": name,
        "currency": "USD",
        "exchange": "Twelve Data",
        "instrumentType": "COMMODITY",
        "price": price,
        "previousClose": prev_close,
        "change": change,
        "changePercent": change_pct,
        "dayHigh": last.get("high"),
        "dayLow": last.get("low"),
        "volume": last.get("volume"),
        "fiftyTwoWeekHigh": max(highs) if highs else None,
        "fiftyTwoWeekLow": min(lows) if lows else None,
        "logoUrl": None,
        "marketTime": last["t"],
        "range": range_,
        "interval": "1d",
        "points": points,
    }
    return envelope("Twelve Data", "time_series", yahoo_symbol, data)
