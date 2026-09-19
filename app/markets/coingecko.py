"""CoinGecko's free public API (no key required for the endpoints used
here) — crypto prices, market stats, and historical charts."""

import re

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

BASE = "https://api.coingecko.com/api/v3"

# days param per UI range; CoinGecko picks granularity automatically
# (5-min for <=1 day, hourly for <=90 days, daily beyond that).
RANGE_DAYS = {"1d": "1", "5d": "5", "1mo": "30", "6mo": "180", "1y": "365", "5y": "1825", "max": "max"}


def market_chart(coin_id: str, range_: str = "1mo"):
    days = RANGE_DAYS.get(range_, "30")
    params = {"vs_currency": "usd", "days": days}

    def fetch_prices():
        resp = markets_get(f"{BASE}/coins/{coin_id}/market_chart", params=params)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    ttl = 120 if range_ == "1d" else 1800
    raw = cached_fetch(f"coingecko_chart_{range_}", {"id": coin_id}, fetch_prices, ttl_seconds=ttl)
    if raw is None:
        return None

    def fetch_meta():
        resp = markets_get(
            f"{BASE}/coins/{coin_id}",
            params={"localization": "false", "tickers": "false", "community_data": "false", "developer_data": "false"},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    meta = cached_fetch("coingecko_meta", {"id": coin_id}, fetch_meta, ttl_seconds=6 * 3600) or {}
    market_data = meta.get("market_data") or {}
    description = ((meta.get("description") or {}).get("en") or "").strip()
    # Descriptions often include raw HTML anchor tags — strip them for plain
    # display rather than rendering markup we didn't sanitize.
    description = re.sub(r"<[^>]+>", "", description)
    if len(description) > 600:
        description = description[:600].rsplit(". ", 1)[0] + "."

    points = [{"t": int(t), "close": price, "open": None, "high": None, "low": None, "volume": None} for t, price in (raw.get("prices") or [])]

    price = market_data.get("current_price", {}).get("usd")
    change_pct = market_data.get("price_change_percentage_24h")
    prev_close = (price / (1 + change_pct / 100)) if (price is not None and change_pct) else None

    data = {
        "symbol": (meta.get("symbol") or coin_id).upper(),
        "name": meta.get("name") or coin_id,
        "currency": "USD",
        "exchange": "Crypto",
        "instrumentType": "CRYPTOCURRENCY",
        "price": price,
        "previousClose": prev_close,
        "change": (price - prev_close) if (price is not None and prev_close) else None,
        "changePercent": change_pct,
        "dayHigh": market_data.get("high_24h", {}).get("usd"),
        "dayLow": market_data.get("low_24h", {}).get("usd"),
        "volume": market_data.get("total_volume", {}).get("usd"),
        "marketCap": market_data.get("market_cap", {}).get("usd"),
        "fiftyTwoWeekHigh": market_data.get("ath", {}).get("usd"),
        "fiftyTwoWeekLow": market_data.get("atl", {}).get("usd"),
        "logoUrl": (meta.get("image") or {}).get("large") or (meta.get("image") or {}).get("small"),
        "marketTime": None,
        "founded": meta.get("genesis_date"),
        "about": description or None,
        "athPrice": market_data.get("ath", {}).get("usd"),
        "athDate": market_data.get("ath_date", {}).get("usd"),
        "atlPrice": market_data.get("atl", {}).get("usd"),
        "atlDate": market_data.get("atl_date", {}).get("usd"),
        "range": range_,
        "interval": "auto",
        "points": points,
    }
    return envelope("CoinGecko", "market_chart", coin_id, data)


def search(query: str, limit: int = 10):
    def fetch():
        resp = markets_get(f"{BASE}/search", params={"query": query})
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("coingecko_search", {"query": query}, fetch, ttl_seconds=6 * 3600)

    results = [
        {
            "symbol": c["id"],
            "name": c.get("name"),
            "exchange": "Crypto",
            "quoteType": "CRYPTOCURRENCY",
            "sector": None,
            "logoUrl": c.get("large") or c.get("thumb"),
        }
        for c in (raw.get("coins") or [])[:limit]
    ]
    return envelope("CoinGecko", "search", None, {"count": len(results), "results": results})


def top_coins(limit: int = 20):
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": limit,
        "page": 1,
        "price_change_percentage": "24h",
    }

    def fetch():
        resp = markets_get(f"{BASE}/coins/markets", params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("coingecko_top", params, fetch, ttl_seconds=300)

    results = [
        {
            "symbol": c["id"],
            "name": c.get("name"),
            "ticker": (c.get("symbol") or "").upper(),
            "price": c.get("current_price"),
            "changePercent": c.get("price_change_percentage_24h"),
            "marketCap": c.get("market_cap"),
            "logoUrl": c.get("image"),
        }
        for c in (raw or [])
    ]
    return envelope("CoinGecko", "markets", None, {"count": len(results), "results": results})
