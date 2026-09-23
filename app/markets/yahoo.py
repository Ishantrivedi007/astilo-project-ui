"""Yahoo Finance's public (keyless) chart/search endpoints — covers stocks,
ETFs/funds, indices, commodities futures, and forex all through the same
ticker-symbol interface. No official API/SDK, but these endpoints are the
same ones Yahoo Finance's own website calls and are widely used for
personal/non-commercial tooling.
"""

import email.utils
import re
import string
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
TRENDING_URL = "https://query1.finance.yahoo.com/v1/finance/trending/US"
NEWS_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"
QUOTE_SUMMARY_URL = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"

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


# Each country's real, major benchmark index — the same free Yahoo chart
# endpoint used everywhere else here, just one call per country so the
# world map can show each market's *actual* current performance rather
# than an invented number.
REGION_INDICES = (
    {"country": "US", "region": "North America", "name": "United States", "symbol": "^GSPC", "indexName": "S&P 500"},
    {"country": "CA", "region": "North America", "name": "Canada", "symbol": "^GSPTSE", "indexName": "S&P/TSX Composite"},
    {"country": "MX", "region": "North America", "name": "Mexico", "symbol": "^MXX", "indexName": "IPC Mexico"},
    {"country": "BR", "region": "South America", "name": "Brazil", "symbol": "^BVSP", "indexName": "Bovespa"},
    {"country": "AR", "region": "South America", "name": "Argentina", "symbol": "^MERV", "indexName": "Merval"},
    {"country": "GB", "region": "Europe", "name": "United Kingdom", "symbol": "^FTSE", "indexName": "FTSE 100"},
    {"country": "DE", "region": "Europe", "name": "Germany", "symbol": "^GDAXI", "indexName": "DAX"},
    {"country": "FR", "region": "Europe", "name": "France", "symbol": "^FCHI", "indexName": "CAC 40"},
    {"country": "IT", "region": "Europe", "name": "Italy", "symbol": "FTSEMIB.MI", "indexName": "FTSE MIB"},
    {"country": "ES", "region": "Europe", "name": "Spain", "symbol": "^IBEX", "indexName": "IBEX 35"},
    {"country": "NL", "region": "Europe", "name": "Netherlands", "symbol": "^AEX", "indexName": "AEX"},
    {"country": "CH", "region": "Europe", "name": "Switzerland", "symbol": "^SSMI", "indexName": "SMI"},
    {"country": "RU", "region": "Europe", "name": "Russia", "symbol": "IMOEX.ME", "indexName": "MOEX Russia"},
    {"country": "JP", "region": "Asia", "name": "Japan", "symbol": "^N225", "indexName": "Nikkei 225"},
    {"country": "CN", "region": "Asia", "name": "China", "symbol": "000001.SS", "indexName": "SSE Composite"},
    {"country": "HK", "region": "Asia", "name": "Hong Kong", "symbol": "^HSI", "indexName": "Hang Seng"},
    {"country": "IN", "region": "Asia", "name": "India", "symbol": "^BSESN", "indexName": "BSE Sensex"},
    {"country": "KR", "region": "Asia", "name": "South Korea", "symbol": "^KS11", "indexName": "KOSPI"},
    {"country": "SG", "region": "Asia", "name": "Singapore", "symbol": "^STI", "indexName": "STI"},
    {"country": "ID", "region": "Asia", "name": "Indonesia", "symbol": "^JKSE", "indexName": "IDX Composite"},
    {"country": "TR", "region": "Middle East", "name": "Turkey", "symbol": "XU100.IS", "indexName": "BIST 100"},
    {"country": "SA", "region": "Middle East", "name": "Saudi Arabia", "symbol": "^TASI.SR", "indexName": "TASI"},
    {"country": "AU", "region": "Oceania", "name": "Australia", "symbol": "^AXJO", "indexName": "ASX 200"},
    {"country": "ZA", "region": "Africa", "name": "South Africa", "symbol": "^J203.JO", "indexName": "JSE Top 40"},
)


def region_indices():
    """One real quote per country's benchmark index, fetched in parallel
    (each call is independently cached, so repeat loads are instant)."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = []

    def fetch_one(entry):
        env = chart(entry["symbol"], "5d")
        if not env or (isinstance(env, dict) and env.get("error")):
            return None
        data = env.get("data") if isinstance(env, dict) else None
        if not data:
            return None
        return {
            **entry,
            "price": data.get("price"),
            "changePercent": data.get("changePercent"),
            "currency": data.get("currency"),
        }

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_one, entry): entry for entry in REGION_INDICES}
        for future in as_completed(futures):
            try:
                row = future.result()
            except Exception:
                row = None
            if row:
                results.append(row)

    return envelope("Yahoo Finance", "region_indices", None, {"count": len(results), "results": results})


def _raw(value):
    """Yahoo's quoteSummary fields are usually {"raw": ..., "fmt": "..."} —
    unwrap that, or pass through a plain scalar/None as-is."""
    if isinstance(value, dict):
        return value.get("raw")
    return value


def fundamentals(symbol: str):
    """Company fundamentals (P/E, dividend yield, key stats) via Yahoo's
    quoteSummary endpoint. Unlike the chart/search endpoints this module
    otherwise uses, quoteSummary has in the past required a session
    cookie + "crumb" token for keyless callers; empirically it currently
    returns 401 "Invalid Crumb" for anonymous requests, and this app does
    not implement Yahoo's fragile crumb/cookie auth handshake (out of
    scope). So this degrades honestly: no data is fabricated, we simply
    report the provider is unavailable right now."""
    modules = "summaryDetail,defaultKeyStatistics,assetProfile,price"

    def fetch():
        resp = markets_get(QUOTE_SUMMARY_URL.format(symbol=symbol), params={"modules": modules})
        return {"status_code": resp.status_code, "body": resp.json() if resp.content else {}}

    raw = cached_fetch("yahoo_fundamentals", {"symbol": symbol}, fetch, ttl_seconds=3600)

    body = raw.get("body") or {}
    result = ((body.get("quoteSummary") or {}).get("result") or [None])[0]
    error = (body.get("quoteSummary") or {}).get("error")

    if raw.get("status_code") != 200 or not result or error:
        reason = (error or {}).get("description") if isinstance(error, dict) else None
        return envelope(
            "Yahoo Finance",
            "fundamentals",
            symbol,
            {
                "available": False,
                "reason": reason
                or "Fundamentals data isn't available from Yahoo Finance's keyless API right now "
                "(this endpoint currently requires an authenticated session).",
            },
        )

    summary_detail = result.get("summaryDetail") or {}
    key_stats = result.get("defaultKeyStatistics") or {}
    asset_profile = result.get("assetProfile") or {}
    price_mod = result.get("price") or {}

    ex_div = summary_detail.get("exDividendDate")
    ex_div_fmt = ex_div.get("fmt") if isinstance(ex_div, dict) else None

    data = {
        "available": True,
        "peRatioTrailing": _raw(summary_detail.get("trailingPE")),
        "peRatioForward": _raw(summary_detail.get("forwardPE")),
        "dividendYield": _raw(summary_detail.get("dividendYield")),
        "dividendRate": _raw(summary_detail.get("dividendRate")),
        "exDividendDate": ex_div_fmt,
        "payoutRatio": _raw(summary_detail.get("payoutRatio")),
        "beta": _raw(summary_detail.get("beta")),
        "marketCap": _raw(summary_detail.get("marketCap")) or _raw(price_mod.get("marketCap")),
        "eps": _raw(key_stats.get("trailingEps")),
        "bookValue": _raw(key_stats.get("bookValue")),
        "priceToBook": _raw(key_stats.get("priceToBook")),
        "fiftyTwoWeekChangePercent": _raw(key_stats.get("52WeekChange")),
        "sector": asset_profile.get("sector"),
        "industry": asset_profile.get("industry"),
        "fullTimeEmployees": asset_profile.get("fullTimeEmployees"),
        "website": asset_profile.get("website"),
        "longBusinessSummary": asset_profile.get("longBusinessSummary"),
    }
    return envelope("Yahoo Finance", "fundamentals", symbol, data)


def similar_companies(symbol: str, sector: str | None, industry: str | None, limit: int = 6):
    """Companies sharing the same sector/industry, found via Yahoo's search
    endpoint. Explicitly NOT labeled "competitors" — this app has no way to
    verify an actual competitive relationship, only a shared classification,
    and it never asserts a relationship it can't verify."""
    query = industry or sector
    if not query:
        return []

    env = search(query, limit=limit + 5)
    results = (env.get("data") or {}).get("results") or []

    filtered = []
    for r in results:
        if r.get("symbol") == symbol:
            continue
        if r.get("quoteType") not in ("EQUITY", "ETF"):
            continue
        filtered.append(r)
        if len(filtered) >= limit:
            break
    return filtered


_STOPWORDS = {"the", "a", "an", "of", "to", "in", "for", "and", "on", "is", "its", "as", "at", "by", "with"}
_PUNCT_TABLE = str.maketrans("", "", string.punctuation)


def _title_tokens(title: str) -> set:
    normalized = (title or "").lower().translate(_PUNCT_TABLE)
    return {w for w in normalized.split() if w and w not in _STOPWORDS}


def _parse_published(published_at: str):
    try:
        return email.utils.parsedate_to_datetime(published_at)
    except (TypeError, ValueError, IndexError):
        return None


def news_clusters(symbols: list[str], limit_per_symbol: int = 10):
    """Fetch each symbol's real RSS headlines, then group into clusters by
    same-day + title-token-overlap — a transparent, inspectable heuristic
    (not ML), so a cluster is always traceable back to why its articles
    were grouped."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    pooled = []

    def fetch_one(sym):
        env = news(sym, limit_per_symbol)
        articles = ((env.get("data") or {}).get("results")) or []
        out = []
        for a in articles:
            link = a.get("link") or ""
            try:
                source = urlparse(link).netloc
            except ValueError:
                source = None
            out.append({**a, "symbol": sym, "source": source})
        return out

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_one, sym): sym for sym in symbols}
        for future in as_completed(futures):
            try:
                pooled.extend(future.result())
            except Exception:
                pass

    clusters = []
    for article in pooled:
        dt = _parse_published(article.get("publishedAt"))
        tokens = _title_tokens(article.get("title"))
        matched = None
        for cluster in clusters:
            rep = cluster["_rep"]
            rep_dt = cluster["_rep_dt"]
            if dt is None or rep_dt is None or dt.date() != rep_dt.date():
                continue
            rep_tokens = cluster["_rep_tokens"]
            if not tokens or not rep_tokens:
                continue
            overlap = len(tokens & rep_tokens) / len(tokens | rep_tokens)
            if overlap >= 0.4:
                matched = cluster
                break
        if matched is None:
            matched = {
                "_rep": article,
                "_rep_dt": dt,
                "_rep_tokens": tokens,
                "articles": [],
            }
            clusters.append(matched)
        matched["articles"].append({**article, "_dt": dt})

    built = []
    for cluster in clusters:
        articles = sorted(
            cluster["articles"],
            key=lambda a: a["_dt"] or email.utils.parsedate_to_datetime("Thu, 01 Jan 1970 00:00:00 +0000"),
            reverse=True,
        )
        timeline = [{k: v for k, v in a.items() if k != "_dt"} for a in articles]
        sources = list(dict.fromkeys(a.get("source") for a in timeline if a.get("source")))
        syms = list(dict.fromkeys(a.get("symbol") for a in timeline if a.get("symbol")))
        built.append(
            {
                "headline": timeline[0]["title"] if timeline else None,
                "timeline": timeline,
                "sources": sources,
                "symbols": syms,
            }
        )

    # Sort clusters by most recent article's actual parsed date, newest first.
    def _cluster_sort_key(c):
        if not c["timeline"]:
            return email.utils.parsedate_to_datetime("Thu, 01 Jan 1970 00:00:00 +0000")
        dt = _parse_published(c["timeline"][0].get("publishedAt"))
        return dt or email.utils.parsedate_to_datetime("Thu, 01 Jan 1970 00:00:00 +0000")

    built.sort(key=_cluster_sort_key, reverse=True)

    return envelope("Yahoo Finance", "news_clusters", None, {"count": len(built), "clusters": built})
