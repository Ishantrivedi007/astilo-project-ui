"""Stooq's free, keyless daily-bar CSV endpoint — an independent second data
source used only as an automatic fallback when Yahoo Finance's chart call
fails or has no data. Real limitation, stated honestly: Stooq only has
DAILY bars here, no intraday, so a "1d" range fallback is still one daily
point at best, not an intraday series like Yahoo's.

Only forex pairs and gold/silver spot are mapped (see
yahoo_symbol_to_stooq) — Stooq's continuous-futures symbol format for
other commodities (oil, gas, copper, wheat, ...) isn't reliably known
here, so those intentionally have no fallback rather than risking a wrong
mapping serving silently-wrong data.
"""

import csv
import datetime

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

CHART_URL = "https://stooq.com/q/d/l/"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")

# Rough trading-day approximation (not calendar days) used to slice the
# full oldest-first daily series Stooq returns, from the end.
RANGE_ROWS = {
    "1d": 2,
    "5d": 5,
    "1mo": 22,
    "6mo": 132,
    "1y": 260,
    "5y": 1300,
    "max": None,
}


def _instrument_type(symbol: str) -> str:
    return "COMMODITY" if symbol.lower() in ("xauusd", "xagusd") else "CURRENCY"


def _display_name(symbol: str) -> str:
    s = symbol.lower()
    if s == "xauusd":
        return "Gold (XAU/USD)"
    if s == "xagusd":
        return "Silver (XAG/USD)"
    if len(s) == 6 and s.isalpha():
        return f"{s[:3].upper()}/{s[3:].upper()}"
    return symbol.upper()


def chart(symbol: str, range_: str = "1mo"):
    range_ = range_ if range_ in VALID_RANGES else "1mo"

    def fetch():
        resp = markets_get(CHART_URL, params={"s": symbol, "i": "d"})
        resp.raise_for_status()
        return resp.text

    text = cached_fetch("stooq_chart", {"symbol": symbol}, fetch, ttl_seconds=900)

    if not text or text.strip() == "N/D":
        return None

    lines = text.splitlines()
    if len(lines) < 2:
        return None

    reader = csv.reader(lines)
    header = next(reader, None)
    if not header or len(header) < 6:
        return None

    all_points = []
    for row in reader:
        if len(row) < 6:
            continue
        date_str, open_s, high_s, low_s, close_s, volume_s = row[:6]
        try:
            t = (
                datetime.datetime.strptime(date_str, "%Y-%m-%d")
                .replace(tzinfo=datetime.timezone.utc)
                .timestamp()
                * 1000
            )
            open_ = float(open_s)
            high = float(high_s)
            low = float(low_s)
            close = float(close_s)
        except (ValueError, TypeError):
            continue
        try:
            volume = int(float(volume_s))
        except (ValueError, TypeError):
            volume = None
        all_points.append(
            {"t": t, "open": open_, "high": high, "low": low, "close": close, "volume": volume}
        )

    if not all_points:
        return None

    n_rows = RANGE_ROWS[range_]
    points = all_points if n_rows is None else all_points[-n_rows:]
    if not points:
        return None

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
        "name": _display_name(symbol),
        "currency": "USD",
        "exchange": "Stooq",
        "instrumentType": _instrument_type(symbol),
        "price": price,
        "previousClose": prev_close,
        "change": change,
        "changePercent": change_pct,
        "dayHigh": last.get("high"),
        "dayLow": last.get("low"),
        "volume": last.get("volume"),
        # Not a true 52-week figure unless range_ == "1y" — it's the
        # high/low across whatever range was actually fetched.
        "fiftyTwoWeekHigh": max(highs) if highs else None,
        "fiftyTwoWeekLow": min(lows) if lows else None,
        "logoUrl": None,
        "marketTime": last["t"],
        "range": range_,
        "interval": "1d",
        "points": points,
    }
    return envelope("Stooq", "chart", symbol, data)


def yahoo_symbol_to_stooq(symbol: str) -> str | None:
    """Maps a Yahoo Finance ticker to the equivalent Stooq symbol, or None
    if this module has no reliable mapping for it."""
    if not symbol:
        return None

    if symbol.upper() == "GC=F":
        return "xauusd"
    if symbol.upper() == "SI=F":
        return "xagusd"

    if symbol.upper().endswith("=X"):
        code = symbol[:-2]
        if len(code) == 6 and code.isalpha():
            return code.lower()
        if len(code) == 3 and code.isalpha():
            return f"usd{code.lower()}"
        return None

    return None
