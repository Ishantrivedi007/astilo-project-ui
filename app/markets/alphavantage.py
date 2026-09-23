"""Alpha Vantage's free-tier API — a second, independent data source for
US equities/ETFs/bonds and several commodities (crude oil, natural gas,
copper, wheat, corn, coffee, cotton) plus gold/silver spot, used as an
automatic fallback when Yahoo Finance fails.

Unlike every other provider in this app, this one needs an API key — but
it's a genuinely free one: https://www.alphavantage.co/support/#api-key
issues an instant key with no payment info. Exactly the optional-key
pattern this app already uses for NASA_API_KEY elsewhere: when
ALPHA_VANTAGE_API_KEY isn't configured, every function here returns None
immediately and the app behaves exactly as it did before this file
existed — this redundancy is simply inactive until the key is set, never
required.

Honesty note on verification: Alpha Vantage's public "demo" key only
serves real data for their one whitelisted demo symbol (IBM) — every
other symbol/function returns an "Information" rate-limit-style message
instead of real data, so the JSON shapes below could NOT be exercised
live against a real symbol in this environment. They're implemented from
Alpha Vantage's public, stable API reference, and every parsing step is
defensively try/except-guarded so a shape mismatch means "silently no
fallback data" rather than a crash — but treat this file as unverified
until someone runs one real check with a real key, e.g.:
    python -c "from app.markets import alphavantage; print(alphavantage.chart('AAPL', '1mo'))"

Real, stated limitation: the commodity functions (WTI, NATURAL_GAS, etc.)
give ONE reference value per day, not real OHLC — open/high/low are set
equal to that day's value rather than fabricated, same honesty rule this
codebase uses everywhere else for this kind of data.
"""

import datetime

from app.config import config
from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://www.alphavantage.co/query"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")
RANGE_ROWS = {"1d": 2, "5d": 5, "1mo": 22, "6mo": 132, "1y": 260, "5y": 1300, "max": None}

# Yahoo commodity-futures ticker -> (Alpha Vantage function, display name).
COMMODITY_FUNCTIONS = {
    "CL=F": ("WTI", "Crude Oil (WTI)"),
    "NG=F": ("NATURAL_GAS", "Natural Gas"),
    "HG=F": ("COPPER", "Copper"),
    "ZW=F": ("WHEAT", "Wheat"),
    "ZC=F": ("CORN", "Corn"),
    "KC=F": ("COFFEE", "Coffee"),
    "CT=F": ("COTTON", "Cotton"),
}
# Yahoo metal-futures ticker -> (ISO 4217 physical-currency code, display name).
METAL_CURRENCIES = {"GC=F": ("XAU", "Gold"), "SI=F": ("XAG", "Silver")}


def _date_ms(date_str: str) -> float:
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() * 1000


def _api_key() -> str | None:
    key = (config.ALPHA_VANTAGE_API_KEY or "").strip()
    return key or None


def _get(params: dict):
    key = _api_key()
    if not key:
        return None
    full_params = {**params, "apikey": key}

    def fetch():
        resp = markets_get(BASE, params=full_params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("alphavantage", full_params, fetch, ttl_seconds=3600)
    if not isinstance(raw, dict) or raw.get("Information") or raw.get("Error Message") or raw.get("Note"):
        return None
    return raw


def _summary(points, name, symbol, source_dataset):
    last = points[-1]
    prev = points[-2] if len(points) >= 2 else None
    price = last["close"]
    prev_close = prev["close"] if prev else None
    change = (price - prev_close) if prev_close is not None else None
    change_pct = (change / prev_close * 100) if change is not None and prev_close else None
    highs = [p["high"] for p in points if p.get("high") is not None]
    lows = [p["low"] for p in points if p.get("low") is not None]

    data = {
        "symbol": symbol,
        "name": name,
        "currency": "USD",
        "exchange": "Alpha Vantage",
        "instrumentType": "COMMODITY" if symbol.upper() in {**COMMODITY_FUNCTIONS, **METAL_CURRENCIES} else "EQUITY",
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
        "range": points[0].get("_range"),
        "interval": "1d",
        "points": [{k: v for k, v in p.items() if k != "_range"} for p in points],
    }
    return envelope("Alpha Vantage", source_dataset, symbol, data)


def equity_chart(symbol: str, range_: str = "1mo"):
    """Daily OHLCV for a plain US-listed equity/ETF/bond-ETF ticker — no
    support for "^"-prefixed indices or dotted non-US exchange-suffixed
    tickers (e.g. "RELIANCE.NS"): Alpha Vantage's own suffix convention
    for international listings differs from Yahoo's and wasn't reliably
    mappable here, so those symbols intentionally have no fallback."""
    if not symbol or symbol.startswith("^") or "." in symbol:
        return None
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    raw = _get(
        {
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": "full" if range_ in ("5y", "max") else "compact",
        }
    )
    if not raw:
        return None
    try:
        series = raw["Time Series (Daily)"]
        rows = sorted(series.items())
        n = RANGE_ROWS[range_]
        if n is not None:
            rows = rows[-n:]
        points = []
        for date_str, v in rows:
            points.append(
                {
                    "t": _date_ms(date_str),
                    "open": float(v["1. open"]),
                    "high": float(v["2. high"]),
                    "low": float(v["3. low"]),
                    "close": float(v["4. close"]),
                    "volume": float(v["5. volume"]) if v.get("5. volume") else None,
                    "_range": range_,
                }
            )
    except (KeyError, ValueError, TypeError):
        return None
    if not points:
        return None
    return _summary(points, symbol, symbol, "time_series_daily")


def commodity_chart(yahoo_symbol: str, range_: str = "1mo"):
    entry = COMMODITY_FUNCTIONS.get(yahoo_symbol.upper())
    if not entry:
        return None
    function, name = entry
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    raw = _get({"function": function, "interval": "daily"})
    if not raw:
        return None
    try:
        rows = [r for r in raw["data"] if r.get("value") not in (None, ".", "")]
        rows.sort(key=lambda r: r["date"])
        n = RANGE_ROWS[range_]
        if n is not None:
            rows = rows[-n:]
        points = []
        for r in rows:
            v = float(r["value"])
            points.append({"t": _date_ms(r["date"]), "open": v, "high": v, "low": v, "close": v, "volume": None, "_range": range_})
    except (KeyError, ValueError, TypeError):
        return None
    if not points:
        return None
    return _summary(points, name, yahoo_symbol, function.lower())


def metal_chart(yahoo_symbol: str, range_: str = "1mo"):
    """Daily gold/silver spot via Alpha Vantage's FX_DAILY on the metal's
    ISO 4217 physical-currency code (XAU/XAG) vs USD."""
    entry = METAL_CURRENCIES.get(yahoo_symbol.upper())
    if not entry:
        return None
    code, name = entry
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    raw = _get(
        {
            "function": "FX_DAILY",
            "from_symbol": code,
            "to_symbol": "USD",
            "outputsize": "full" if range_ in ("5y", "max") else "compact",
        }
    )
    if not raw:
        return None
    try:
        series = raw["Time Series FX (Daily)"]
        rows = sorted(series.items())
        n = RANGE_ROWS[range_]
        if n is not None:
            rows = rows[-n:]
        points = []
        for date_str, v in rows:
            points.append(
                {
                    "t": _date_ms(date_str),
                    "open": float(v["1. open"]),
                    "high": float(v["2. high"]),
                    "low": float(v["3. low"]),
                    "close": float(v["4. close"]),
                    "volume": None,
                    "_range": range_,
                }
            )
    except (KeyError, ValueError, TypeError):
        return None
    if not points:
        return None
    return _summary(points, name, yahoo_symbol, "fx_daily")


def chart(yahoo_symbol: str, range_: str = "1mo"):
    """Single entry point fallback call sites use — routes to whichever
    of the three shapes above applies, or None immediately if no key is
    configured or this symbol isn't one Alpha Vantage's free tier covers
    here."""
    if not _api_key() or not yahoo_symbol:
        return None
    upper = yahoo_symbol.upper()
    if upper in METAL_CURRENCIES:
        return metal_chart(yahoo_symbol, range_)
    if upper in COMMODITY_FUNCTIONS:
        return commodity_chart(yahoo_symbol, range_)
    return equity_chart(yahoo_symbol, range_)
