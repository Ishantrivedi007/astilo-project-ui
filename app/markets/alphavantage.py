"""Alpha Vantage's free-tier API — a second, independent data source for
US equities/ETFs/bonds and several commodities (crude oil, natural gas,
copper, wheat, corn, coffee, cotton), used as an automatic fallback when
Yahoo Finance fails.

Unlike every other provider in this app, this one needs an API key — but
it's a genuinely free one: https://www.alphavantage.co/support/#api-key
issues an instant key with no payment info. Exactly the optional-key
pattern this app already uses for NASA_API_KEY elsewhere: when
ALPHA_VANTAGE_API_KEY isn't configured, every function here returns None
immediately and the app behaves exactly as it did before this file
existed — this redundancy is simply inactive until the key is set, never
required.

Live-verified (real key, real symbols) findings, not just desk-checked:
- TIME_SERIES_DAILY (equities/ETFs) works as documented — confirmed
  against AAPL, price matched Yahoo's own AAPL price exactly.
- The commodity functions (WTI, NATURAL_GAS, COPPER, WHEAT, CORN, COFFEE,
  COTTON) work, but on the free tier IGNORE the `interval=daily` request
  parameter for some of them (confirmed live: COPPER always returns
  `"interval": "monthly"` regardless) — so range slicing here is done by
  calendar-date cutoff, not a fixed row count, so it degrades correctly
  (fewer, sparser points) instead of silently showing years of history
  for a "1 month" range.
- Gold/silver spot does NOT work here — confirmed live: XAU/XAG aren't in
  Alpha Vantage's supported physical-currency list at all (checked their
  own /physical_currency_list/ endpoint), and both FX_DAILY and
  CURRENCY_EXCHANGE_RATE return "Invalid API call" for XAU/USD. An
  earlier version of this file assumed this endpoint supported metals
  based on Alpha Vantage's general documentation; that assumption was
  wrong and has been removed rather than left in as dead, silently-never-
  firing code. Gold/silver genuinely have no free fallback right now.

Real, stated limitation: the commodity functions give ONE reference value
per period, not real OHLC — open/high/low are set equal to that period's
value rather than fabricated, same honesty rule this codebase uses
everywhere else for this kind of data.
"""

import datetime

from app.config import config
from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://www.alphavantage.co/query"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")
# Calendar-day lookback per range, NOT a row count — the free tier's
# actual returned granularity varies by function/commodity (confirmed
# live: some ignore `interval=daily` and return monthly bars regardless),
# so slicing by date keeps "1mo" honestly sparse on monthly data instead
# of silently spanning years by grabbing N row indices.
RANGE_DAYS = {"1d": 5, "5d": 10, "1mo": 35, "6mo": 195, "1y": 380, "5y": 1830, "max": None}

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


def _date_ms(date_str: str) -> float:
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() * 1000


def _slice_by_date(rows_sorted_asc, date_key, range_):
    """rows_sorted_asc: list of dicts/tuples with an ISO date string,
    oldest first. Keeps rows within RANGE_DAYS[range_] of the newest row's
    date — correct regardless of actual data granularity. Always keeps at
    least the last 2 rows (if available) so change/changePercent can still
    be computed even when a range is shorter than the data's granularity
    (e.g. "1mo" against monthly data)."""
    days = RANGE_DAYS.get(range_)
    if days is None or len(rows_sorted_asc) <= 2:
        return rows_sorted_asc
    newest = datetime.datetime.strptime(date_key(rows_sorted_asc[-1]), "%Y-%m-%d")
    cutoff = newest - datetime.timedelta(days=days)
    kept = [r for r in rows_sorted_asc if datetime.datetime.strptime(date_key(r), "%Y-%m-%d") >= cutoff]
    return kept if len(kept) >= 2 else rows_sorted_asc[-2:]


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
        "instrumentType": "COMMODITY" if symbol.upper() in COMMODITY_FUNCTIONS else "EQUITY",
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
        rows = _slice_by_date(rows, lambda r: r[0], range_)
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
        rows = _slice_by_date(rows, lambda r: r["date"], range_)
        points = []
        for r in rows:
            v = float(r["value"])
            points.append({"t": _date_ms(r["date"]), "open": v, "high": v, "low": v, "close": v, "volume": None, "_range": range_})
    except (KeyError, ValueError, TypeError):
        return None
    if not points:
        return None
    return _summary(points, name, yahoo_symbol, function.lower())


def chart(yahoo_symbol: str, range_: str = "1mo"):
    """Single entry point fallback call sites use — routes to whichever
    of the two shapes above applies, or None immediately if no key is
    configured or this symbol isn't one Alpha Vantage's free tier covers
    here (this notably excludes gold/silver — see module docstring)."""
    if not _api_key() or not yahoo_symbol:
        return None
    upper = yahoo_symbol.upper()
    if upper in COMMODITY_FUNCTIONS:
        return commodity_chart(yahoo_symbol, range_)
    return equity_chart(yahoo_symbol, range_)
