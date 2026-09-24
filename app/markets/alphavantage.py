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

Also live-verified and added later:
- TREASURY_YIELD is a real economic-indicator endpoint (not equity
  data) that directly covers Yahoo's ^IRX/^FVX/^TNX/^TYX yield tickers —
  confirmed live for the 10-year maturity, real Fed/FRED-sourced data.
- International equities work via Alpha Vantage's own exchange-suffix
  convention, confirmed live for India: `RELIANCE.BSE` returned real
  data. Their docs also list `.LON` for London — not independently
  verified live but used from the same, already-proven TIME_SERIES_DAILY
  function and documented consistently, so mapped with reasonable
  confidence. Deliberately NOT mapping Yahoo's NSE suffix (`.NS`): Alpha
  Vantage's docs only list a BSE suffix for India, no NSE-specific one —
  guessing a suffix here risks silently serving the wrong exchange's
  data, worse than no fallback at all.
- Deliberately did NOT add an ETF-proxy fallback for broad index tickers
  (^GSPC, ^DJI, ^IXIC) via SPY/DIA/QQQ: those ETF prices are a different
  number from the actual index level (SPY trades at roughly 1/10th the
  S&P 500's value), so showing one as a stand-in for the other — even
  labeled — risks reading as a data bug rather than a clearly-scaled
  approximation. No fallback beats a misleading one.
"""

import csv
import datetime
import io

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

# Yahoo Treasury-yield index ticker -> (TREASURY_YIELD maturity, display name).
TREASURY_MATURITIES = {
    "^IRX": ("3month", "US 13-Week Treasury Yield"),
    "^FVX": ("5year", "US 5-Year Treasury Yield"),
    "^TNX": ("10year", "US 10-Year Treasury Yield"),
    "^TYX": ("30year", "US 30-Year Treasury Yield"),
}

# Yahoo exchange suffix -> Alpha Vantage's own suffix for the same
# exchange, on their real, live-verified TIME_SERIES_DAILY. NSE (Yahoo's
# ".NS") intentionally has no entry — Alpha Vantage's docs only list a
# BSE suffix for India, not an NSE one.
YAHOO_TO_AV_SUFFIX = {".BO": ".BSE", ".L": ".LON"}


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


class _RateLimited(Exception):
    """Raised inside fetch() (never let cached_fetch persist it) so a
    transient rate-limit/error response from Alpha Vantage doesn't get
    cached for a full hour as if it were real data — confirmed live this
    was happening and made the fallback look "broken" for up to an hour
    after simple rapid testing, not an actual data problem."""


def _get(params: dict):
    key = _api_key()
    if not key:
        return None
    full_params = {**params, "apikey": key}

    def fetch():
        resp = markets_get(BASE, params=full_params)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and (data.get("Information") or data.get("Error Message") or data.get("Note")):
            raise _RateLimited()
        return data

    try:
        raw = cached_fetch("alphavantage", full_params, fetch, ttl_seconds=3600)
    except _RateLimited:
        return None
    if not isinstance(raw, dict):
        return None
    return raw


def _summary(points, name, symbol, source_dataset, instrument_type="EQUITY"):
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
        "instrumentType": instrument_type,
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


def _time_series_daily(av_symbol: str, display_symbol: str, name: str, range_: str):
    """Shared TIME_SERIES_DAILY fetch/parse, used for both plain US
    tickers and international ones (where av_symbol has AV's own suffix
    but display_symbol keeps Yahoo's, so the response stays consistent
    with what the caller asked for)."""
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    raw = _get(
        {
            "function": "TIME_SERIES_DAILY",
            "symbol": av_symbol,
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
    return _summary(points, name, display_symbol, "time_series_daily")


def equity_chart(symbol: str, range_: str = "1mo"):
    """Daily OHLCV for a plain US-listed equity/ETF/bond-ETF ticker — no
    support for "^"-prefixed tickers (indices/yields, handled elsewhere)
    or dotted non-US exchange-suffixed tickers (handled by
    intl_equity_chart for the suffixes that have a mapping, otherwise
    unsupported)."""
    if not symbol or symbol.startswith("^") or "." in symbol:
        return None
    return _time_series_daily(symbol, symbol, symbol, range_)


def intl_equity_chart(yahoo_symbol: str, range_: str = "1mo"):
    """Daily OHLCV for a non-US ticker, translating Yahoo's exchange
    suffix to Alpha Vantage's own (see YAHOO_TO_AV_SUFFIX) — live-verified
    for India (.BO -> .BSE); London (.L -> .LON) is used from the same,
    already-proven function per Alpha Vantage's own docs but wasn't
    independently exercised live."""
    for yahoo_suffix, av_suffix in YAHOO_TO_AV_SUFFIX.items():
        if yahoo_symbol.upper().endswith(yahoo_suffix):
            base = yahoo_symbol[: -len(yahoo_suffix)]
            av_symbol = f"{base}{av_suffix}"
            return _time_series_daily(av_symbol, yahoo_symbol, yahoo_symbol, range_)
    return None


def treasury_yield_chart(yahoo_symbol: str, range_: str = "1mo"):
    """Real US Treasury yield data (Fed/FRED-sourced, via Alpha Vantage's
    TREASURY_YIELD economic-indicator endpoint) for Yahoo's ^IRX/^FVX/
    ^TNX/^TYX tickers — live-verified for the 10-year maturity."""
    entry = TREASURY_MATURITIES.get(yahoo_symbol.upper())
    if not entry:
        return None
    maturity, name = entry
    range_ = range_ if range_ in VALID_RANGES else "1mo"
    raw = _get({"function": "TREASURY_YIELD", "interval": "daily", "maturity": maturity})
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
    return _summary(points, name, yahoo_symbol, "treasury_yield", instrument_type="INDEX")


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
    return _summary(points, name, yahoo_symbol, function.lower(), instrument_type="COMMODITY")


def chart(yahoo_symbol: str, range_: str = "1mo"):
    """Single entry point fallback call sites use — routes to whichever
    shape above applies, or None immediately if no key is configured or
    this symbol isn't one Alpha Vantage's free tier covers here (this
    notably excludes gold/silver and NSE — see module docstring)."""
    if not _api_key() or not yahoo_symbol:
        return None
    upper = yahoo_symbol.upper()
    if upper in COMMODITY_FUNCTIONS:
        return commodity_chart(yahoo_symbol, range_)
    if upper in TREASURY_MATURITIES:
        return treasury_yield_chart(yahoo_symbol, range_)
    if any(upper.endswith(suffix) for suffix in YAHOO_TO_AV_SUFFIX):
        return intl_equity_chart(yahoo_symbol, range_)
    return equity_chart(yahoo_symbol, range_)


def _num(raw: dict, key: str):
    """Alpha Vantage's OVERVIEW returns every field as a string, and uses
    the literal string "None" (not JSON null) for genuinely missing
    numeric fields — both cases must become a real None, never 0.0."""
    v = raw.get(key)
    if v is None or v == "None" or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fundamentals(symbol: str):
    """Real company fundamentals — P/E, dividend yield, beta, sector,
    business description, etc. — via Alpha Vantage's OVERVIEW endpoint.
    Live-verified (real key, AAPL): works on the free tier with no crumb/
    session requirement, unlike Yahoo's equivalent endpoint. Only
    international-suffix and index-style symbols are excluded (same
    equity-only scope as equity_chart/intl_equity_chart above); OVERVIEW
    itself doesn't error cleanly for those, it just returns an empty
    object, so the emptiness is what's actually detected below."""
    if not _api_key() or not symbol:
        return None
    raw = _get({"function": "OVERVIEW", "symbol": symbol})
    if not raw or not raw.get("Symbol"):
        return None

    dividend_yield = _num(raw, "DividendYield")
    market_cap = _num(raw, "MarketCapitalization")
    pe_high = _num(raw, "52WeekHigh")
    pe_low = _num(raw, "52WeekLow")

    return {
        "available": True,
        "peRatioTrailing": _num(raw, "TrailingPE") or _num(raw, "PERatio"),
        "peRatioForward": _num(raw, "ForwardPE"),
        "dividendYield": dividend_yield,
        "dividendRate": _num(raw, "DividendPerShare"),
        "exDividendDate": raw.get("ExDividendDate") if raw.get("ExDividendDate") not in (None, "None", "-", "") else None,
        "payoutRatio": None,  # not provided by this endpoint — genuinely unavailable, not guessed
        "beta": _num(raw, "Beta"),
        "marketCap": market_cap,
        "eps": _num(raw, "EPS"),
        "bookValue": _num(raw, "BookValue"),
        "priceToBook": _num(raw, "PriceToBookRatio"),
        "fiftyTwoWeekChangePercent": None,  # OVERVIEW gives 52-week high/low, not a computed % change — see below
        "fiftyTwoWeekHigh": pe_high,
        "fiftyTwoWeekLow": pe_low,
        "sector": raw.get("Sector") if raw.get("Sector") not in (None, "None", "-", "") else None,
        "industry": raw.get("Industry") if raw.get("Industry") not in (None, "None", "-", "") else None,
        "fullTimeEmployees": None,  # not provided by this endpoint
        "website": raw.get("OfficialSite") if raw.get("OfficialSite") not in (None, "None", "-", "") else None,
        "longBusinessSummary": raw.get("Description") if raw.get("Description") not in (None, "None", "-", "") else None,
        "source": "Alpha Vantage",
    }


def dividends(symbol: str):
    """Real dividend history (ex-date, declaration, record, payment dates
    + amount) — live-verified against AAPL, real dates/amounts."""
    if not _api_key() or not symbol:
        return None
    raw = _get({"function": "DIVIDENDS", "symbol": symbol})
    if not raw or not isinstance(raw.get("data"), list):
        return None
    return raw["data"]


def earnings_calendar(horizon: str = "3month"):
    """Real upcoming company earnings dates — live-verified, returns real
    CSV data on the free tier (confirmed rows for real companies with
    real upcoming report dates). horizon: "3month" | "6month" | "12month"."""
    if not _api_key():
        return None
    if horizon not in ("3month", "6month", "12month"):
        horizon = "3month"

    def fetch():
        resp = markets_get(BASE, params={"function": "EARNINGS_CALENDAR", "horizon": horizon, "apikey": _api_key()})
        resp.raise_for_status()
        return resp.text

    text = cached_fetch("alphavantage_earnings_calendar", {"horizon": horizon}, fetch, ttl_seconds=6 * 3600)
    if not text:
        return None
    return _parse_calendar_csv(text)


def ipo_calendar():
    """Real upcoming IPOs — live-verified, returns real CSV data on the
    free tier (confirmed real company names/dates/price ranges)."""
    if not _api_key():
        return None

    def fetch():
        resp = markets_get(BASE, params={"function": "IPO_CALENDAR", "apikey": _api_key()})
        resp.raise_for_status()
        return resp.text

    text = cached_fetch("alphavantage_ipo_calendar", {}, fetch, ttl_seconds=6 * 3600)
    if not text:
        return None
    return _parse_calendar_csv(text)


def _parse_calendar_csv(text: str):
    """Both EARNINGS_CALENDAR and IPO_CALENDAR return plain CSV (not
    JSON) with a header row — a real quirk of these two endpoints
    specifically, every other function here returns JSON. On a rate-limit
    or error, they return a JSON object instead (`{"Information": ...}`,
    same wording as every other endpoint's `_get()` already filters) —
    caught here specifically because these two bypass `_get()` (which
    expects JSON) and fetch raw text instead, so that filter doesn't
    apply automatically; feeding that JSON straight into csv.DictReader
    silently "succeeds" with garbage single-character columns rather than
    erroring, which is exactly the bug this check exists to prevent."""
    stripped = text.strip()
    if not stripped or stripped.startswith("{"):
        return None
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)
