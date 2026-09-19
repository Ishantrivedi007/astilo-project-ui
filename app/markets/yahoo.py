"""Yahoo Finance's public (keyless) chart/search endpoints — covers stocks,
ETFs/funds, indices, commodities futures, and forex all through the same
ticker-symbol interface. No official API/SDK, but these endpoints are the
same ones Yahoo Finance's own website calls and are widely used for
personal/non-commercial tooling.
"""

import re
import xml.etree.ElementTree as ET

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
TRENDING_URL = "https://query1.finance.yahoo.com/v1/finance/trending/US"
NEWS_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"

# financialmodelingprep.com serves company logos free and keyless, keyed
# directly by ticker (no domain-guessing) — but only for actual equities/
# ETFs, not indices ("^GSPC"), futures ("GC=F"), or forex ("EURUSD=X").
_PLAIN_TICKER = re.compile(r"^[A-Z]{1,6}(\.[A-Z]{1,2})?$")


def _guess_logo_url(symbol: str, instrument_type: str | None) -> str | None:
    if instrument_type not in ("EQUITY", "ETF") or not symbol:
        return None
    if not _PLAIN_TICKER.match(symbol.upper()):
        return None
    return f"https://images.financialmodelingprep.com/symbol/{symbol.upper()}.png"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y", "5y", "max")
RANGE_INTERVAL = {
    "1d": "5m",
    "5d": "15m",
    "1mo": "1d",
    "6mo": "1d",
    "1y": "1wk",
    "5y": "1wk",
    "max": "1mo",
}


def chart(symbol: str, range_: str = "1mo"):
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    interval = RANGE_INTERVAL[range_]
    params = {"range": range_, "interval": interval, "includePrePost": "false"}

    def fetch():
        resp = markets_get(CHART_URL.format(symbol=symbol), params=params)
        resp.raise_for_status()
        return resp.json()

    ttl = 60 if range_ == "1d" else 900
    raw = cached_fetch(f"yahoo_chart_{range_}", {"symbol": symbol}, fetch, ttl_seconds=ttl)

    result = (raw.get("chart", {}).get("result") or [None])[0]
    if not result:
        error = raw.get("chart", {}).get("error")
        return None if not error else {"error": error.get("description", "Symbol not found")}

    meta = result.get("meta", {})
    timestamps = result.get("timestamp") or []
    quote = (result.get("indicators", {}).get("quote") or [{}])[0]
    closes = quote.get("close") or []
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    volumes = quote.get("volume") or []

    points = []
    for i, ts in enumerate(timestamps):
        close = closes[i] if i < len(closes) else None
        if close is None:
            continue
        points.append(
            {
                "t": ts * 1000,
                "open": opens[i] if i < len(opens) else None,
                "high": highs[i] if i < len(highs) else None,
                "low": lows[i] if i < len(lows) else None,
                "close": close,
                "volume": volumes[i] if i < len(volumes) else None,
            }
        )

    prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
    price = meta.get("regularMarketPrice")
    change = (price - prev_close) if (price is not None and prev_close) else None
    change_pct = (change / prev_close * 100) if (change is not None and prev_close) else None

    data = {
        "symbol": meta.get("symbol", symbol),
        "name": meta.get("longName") or meta.get("shortName") or meta.get("symbol"),
        "currency": meta.get("currency"),
        "exchange": meta.get("fullExchangeName"),
        "instrumentType": meta.get("instrumentType"),
        "price": price,
        "previousClose": prev_close,
        "change": change,
        "changePercent": change_pct,
        "dayHigh": meta.get("regularMarketDayHigh"),
        "dayLow": meta.get("regularMarketDayLow"),
        "volume": meta.get("regularMarketVolume"),
        "fiftyTwoWeekHigh": meta.get("fiftyTwoWeekHigh"),
        "fiftyTwoWeekLow": meta.get("fiftyTwoWeekLow"),
        "logoUrl": _guess_logo_url(meta.get("symbol", symbol), meta.get("instrumentType")),
        "marketTime": (meta.get("regularMarketTime") or 0) * 1000 or None,
        "range": range_,
        "interval": interval,
        "points": points,
    }
    return envelope("Yahoo Finance", "chart", meta.get("symbol", symbol), data)


def search(query: str, limit: int = 10):
    params = {"q": query, "quotesCount": limit, "newsCount": 0}

    def fetch():
        resp = markets_get(SEARCH_URL, params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("yahoo_search", params, fetch, ttl_seconds=6 * 3600)

    results = []
    for q in raw.get("quotes") or []:
        symbol = q.get("symbol")
        if not symbol:
            continue
        results.append(
            {
                "symbol": symbol,
                "name": q.get("longname") or q.get("shortname") or symbol,
                "exchange": q.get("exchDisp"),
                "quoteType": q.get("quoteType"),
                "sector": q.get("sectorDisp"),
                "logoUrl": _guess_logo_url(symbol, q.get("quoteType")),
            }
        )
    return envelope("Yahoo Finance", "search", None, {"count": len(results), "results": results})


def news(symbol: str, limit: int = 10):
    """Real per-ticker headlines from Yahoo Finance's public RSS feed — works
    for equities, ETFs, commodities futures, and crypto tickers alike."""
    params = {"s": symbol, "region": "US", "lang": "en-US"}

    def fetch():
        resp = markets_get(NEWS_RSS_URL, params=params)
        resp.raise_for_status()
        return resp.text

    raw_xml = cached_fetch("yahoo_news", {"symbol": symbol}, fetch, ttl_seconds=1800)

    articles = []
    try:
        root = ET.fromstring(raw_xml)
        for item in root.findall("./channel/item")[:limit]:
            articles.append(
                {
                    "title": (item.findtext("title") or "").strip(),
                    "link": (item.findtext("link") or "").strip(),
                    "description": (item.findtext("description") or "").strip(),
                    "publishedAt": (item.findtext("pubDate") or "").strip(),
                }
            )
    except ET.ParseError:
        pass

    return envelope("Yahoo Finance", "news_rss", symbol, {"count": len(articles), "results": articles})


def trending():
    def fetch():
        resp = markets_get(TRENDING_URL)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("yahoo_trending", {}, fetch, ttl_seconds=1800)

    result = (raw.get("finance", {}).get("result") or [{}])[0]
    symbols = [q["symbol"] for q in (result.get("quotes") or []) if q.get("symbol")]
    return envelope("Yahoo Finance", "trending", None, {"symbols": symbols})
