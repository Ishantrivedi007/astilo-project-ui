"""Binance's free, keyless public market-data API (no key, no signup,
no rate-limit auth needed for these read-only endpoints) — an independent
second data source for crypto, used as an automatic fallback when
CoinGecko's chart call fails or has no data.

Real, stated limitation: Binance prices are quoted in USDT (Tether), not
literal USD — treated here as ~USD like every other provider in this
codebase treats stablecoins, but it's an approximation, not the exact same
number CoinGecko's USD price would show. Also: not every CoinGecko coin
has a USDT trading pair on Binance (most do; illiquid/small-cap ones often
don't), so this fallback silently has no coverage for those rather than
guessing a symbol that doesn't exist.
"""

import datetime

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.binance.com/api/v3"
COINGECKO_LIST_URL = "https://api.coingecko.com/api/v3/coins/list"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")
# (Binance kline interval, how many bars to request)
RANGE_PARAMS = {
    "1d": ("5m", 288),
    "5d": ("1h", 120),
    "1mo": ("1d", 30),
    "6mo": ("1d", 180),
    "1y": ("1d", 365),
    "5y": ("1w", 260),
    "max": ("1M", 200),
}


def _coin_id_to_ticker(coin_id: str) -> str | None:
    """Real, live CoinGecko id -> ticker lookup via their lightweight
    /coins/list endpoint (id/symbol/name only, no market data) — cached
    24h. Deliberately NOT a hardcoded id->ticker table: ticker assignments
    are looked up dynamically each cache cycle, and this endpoint is far
    lighter/less likely to be the thing failing than the heavier
    market_chart endpoint this whole module exists to fall back for."""

    def fetch():
        resp = markets_get(COINGECKO_LIST_URL)
        resp.raise_for_status()
        return resp.json()

    try:
        coins = cached_fetch("coingecko_coin_list", {}, fetch, ttl_seconds=24 * 3600)
    except Exception:
        return None
    if not isinstance(coins, list):
        return None
    for c in coins:
        if isinstance(c, dict) and c.get("id") == coin_id:
            symbol = c.get("symbol")
            return symbol.upper() if symbol else None
    return None


def chart(coin_id: str, range_: str = "1mo"):
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    ticker = _coin_id_to_ticker(coin_id)
    if not ticker:
        return None
    binance_symbol = f"{ticker}USDT"
    interval, limit = RANGE_PARAMS[range_]

    def fetch():
        resp = markets_get(f"{BASE}/klines", params={"symbol": binance_symbol, "interval": interval, "limit": limit})
        if resp.status_code == 400:
            return None  # no such trading pair on Binance
        resp.raise_for_status()
        return resp.json()

    ttl = 120 if range_ == "1d" else 1800
    rows = cached_fetch(f"binance_klines_{range_}", {"symbol": binance_symbol}, fetch, ttl_seconds=ttl)
    if not rows:
        return None

    points = []
    for row in rows:
        try:
            t, o, h, l, c, v = row[0], row[1], row[2], row[3], row[4], row[5]
            points.append(
                {"t": t, "open": float(o), "high": float(h), "low": float(l), "close": float(c), "volume": float(v)}
            )
        except (TypeError, ValueError, IndexError):
            continue
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
        "symbol": coin_id,
        "name": ticker,
        "currency": "USD",
        "exchange": "Binance",
        "instrumentType": "CRYPTOCURRENCY",
        "price": price,
        "previousClose": prev_close,
        "change": change,
        "changePercent": change_pct,
        "dayHigh": last.get("high"),
        "dayLow": last.get("low"),
        "volume": last.get("volume"),
        "marketCap": None,
        "fiftyTwoWeekHigh": max(highs) if highs else None,
        "fiftyTwoWeekLow": min(lows) if lows else None,
        "logoUrl": None,
        "marketTime": last["t"],
        "range": range_,
        "interval": interval,
        "points": points,
    }
    return envelope("Binance", "klines", coin_id, data)
