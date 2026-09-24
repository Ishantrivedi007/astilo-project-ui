"""NSE India's own public archive — real, keyless, official end-of-day
data, used as a fallback for `.NS`-suffixed equities and the NIFTY 50
index when Yahoo Finance fails.

Important distinction, confirmed by live testing both: NSE's LIVE quote
API (`nseindia.com/api/quote-equity`) is behind Akamai bot protection and
returns "Access Denied" even with valid session cookies fetched from
their own homepage — that's a dead end, not attempted here. But NSE's
DAILY ARCHIVE REPORTS (bhavcopy — literally "the day's book of prices",
published for their own regulatory/transparency purposes) are served as
plain CSV files from a separate, unprotected static file host
(`nsearchives.nseindia.com`) with no bot-check at all — confirmed live
for both today's date and a month back.

Real, stated limitation: this is END-OF-DAY data only, one data point per
trading day, never intraday/live — a real degradation versus Yahoo's own
(when it's working) live quotes. There is no free way around that for
NSE specifically (see app/markets/quotes.py's docstring for the fuller
multi-provider picture). Also real: no file is published for weekends/
market holidays, so requesting N calendar days back yields somewhat fewer
actual data points — handled here by requesting more calendar days than
strictly needed and simply using whatever files exist, not by fabricating
missing days.

Range support: up to 1y. Each trading day is a SEPARATE file fetch, but
every file covers every NSE symbol/index at once and is cached
indefinitely once fetched (a real historical report never changes), so
the cost is front-loaded onto the first cold request for a given period
— fetched with high concurrency (20 parallel requests) — and every
lookup after that (any symbol, any date already seen) is instant from
cache. That one-time cost is judged acceptable since this only runs
during an actual Yahoo outage, not on every request. 5y/max are NOT
supported (would mean 1,500+ individual requests even on a cold cache —
real risk of NSE rate-limiting or simply timing out): confirmed live
that NSE's own archive actually has data that far back (tested 1/3/5
years back successfully, 8 years back 404s), so the data exists, it's
just not exposed through this fallback at that depth.
"""

import csv
import datetime
import io
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.cosmos.cache import cached_fetch
from app.markets.http import envelope, markets_get

EQUITY_URL = "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{date}.csv"
INDEX_URL = "https://nsearchives.nseindia.com/content/indices/ind_close_all_{date}.csv"

VALID_RANGES = ("1d", "5d", "1mo", "6mo", "1y")
# Calendar days to scan back per range — comfortably more than the
# trading-day count, since weekends/holidays produce no file.
RANGE_CALENDAR_DAYS = {"1d": 4, "5d": 10, "1mo": 33, "6mo": 190, "1y": 375}

# Yahoo index ticker -> the exact index name NSE's own file uses.
INDEX_NAMES = {"^NSEI": "Nifty 50"}


def _dates_back(n_days: int) -> list[datetime.date]:
    today = datetime.date.today()
    return [today - datetime.timedelta(days=i) for i in range(n_days)]


def _fetch_csv(url_template: str, cache_prefix: str, date: datetime.date) -> str | None:
    date_str = date.strftime("%d%m%Y")

    def fetch():
        # Shorter per-file timeout than the shared default (15s): with
        # hundreds of files in flight for a 6mo/1y range, one slow/hung
        # file shouldn't hold up the whole batch for that long — a
        # missed file just means one fewer data point, handled the same
        # as a real 404 (weekend/holiday), not an error.
        resp = markets_get(url_template.format(date=date_str), timeout=8)
        if resp.status_code == 404:
            return None  # weekend/holiday — no file published, not an error
        resp.raise_for_status()
        return resp.text

    # Past dates are immutable once published (a real historical report,
    # never revised) — cache indefinitely-ish. Today's file is fetched
    # more cautiously in case it publishes mid-day.
    ttl = 600 if date == datetime.date.today() else 30 * 24 * 3600
    return cached_fetch(cache_prefix, {"date": date_str}, fetch, ttl_seconds=ttl)


def _fetch_many(url_template: str, cache_prefix: str, dates: list[datetime.date]) -> dict[datetime.date, str]:
    """Parallel fetch (same ThreadPoolExecutor pattern used elsewhere in
    this app, e.g. yahoo.region_indices) — each date is an independent
    file, so there's no reason to fetch them one at a time."""
    results: dict[datetime.date, str] = {}
    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {pool.submit(_fetch_csv, url_template, cache_prefix, d): d for d in dates}
        for future in as_completed(futures):
            d = futures[future]
            try:
                text = future.result()
            except Exception:
                text = None
            if text:
                results[d] = text
    return results


def equity_chart(yahoo_symbol: str, range_: str = "1mo"):
    if not yahoo_symbol or not yahoo_symbol.upper().endswith(".NS"):
        return None
    range_ = range_ if range_ in VALID_RANGES else None
    if range_ is None:
        return None  # out of scope — see module docstring
    nse_symbol = yahoo_symbol[:-3].upper()

    dates = _dates_back(RANGE_CALENDAR_DAYS[range_])
    files = _fetch_many(EQUITY_URL, "nse_bhavcopy_equity", dates)
    if not files:
        return None

    points = []
    name = None
    for date in sorted(files.keys()):
        text = files[date]
        try:
            reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)
            for row in reader:
                if row.get("SYMBOL", "").strip() != nse_symbol or row.get("SERIES", "").strip() != "EQ":
                    continue
                close = float(row["CLOSE_PRICE"])
                points.append(
                    {
                        "t": datetime.datetime.combine(date, datetime.time(), tzinfo=datetime.timezone.utc).timestamp() * 1000,
                        "open": float(row["OPEN_PRICE"]),
                        "high": float(row["HIGH_PRICE"]),
                        "low": float(row["LOW_PRICE"]),
                        "close": close,
                        "volume": float(row["TTL_TRD_QNTY"]) if row.get("TTL_TRD_QNTY") else None,
                    }
                )
                break
        except (KeyError, ValueError, csv.Error):
            continue
    if not points:
        return None
    points.sort(key=lambda p: p["t"])

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
        "name": nse_symbol,
        "currency": "INR",
        "exchange": "NSE (EOD archive)",
        "instrumentType": "EQUITY",
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
    return envelope("NSE India", "bhavcopy_equity", yahoo_symbol, data)


def index_chart(yahoo_symbol: str, range_: str = "1mo"):
    index_name = INDEX_NAMES.get((yahoo_symbol or "").upper())
    if not index_name:
        return None
    range_ = range_ if range_ in VALID_RANGES else None
    if range_ is None:
        return None

    dates = _dates_back(RANGE_CALENDAR_DAYS[range_])
    files = _fetch_many(INDEX_URL, "nse_bhavcopy_index", dates)
    if not files:
        return None

    points = []
    pe = pb = div_yield = None
    for date in sorted(files.keys()):
        text = files[date]
        try:
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                if row.get("Index Name", "").strip() != index_name:
                    continue
                close = float(row["Closing Index Value"])
                points.append(
                    {
                        "t": datetime.datetime.combine(date, datetime.time(), tzinfo=datetime.timezone.utc).timestamp() * 1000,
                        "open": float(row["Open Index Value"]),
                        "high": float(row["High Index Value"]),
                        "low": float(row["Low Index Value"]),
                        "close": close,
                        "volume": float(row["Volume"]) if row.get("Volume") else None,
                    }
                )
                # The index's own real P/E/P/B/dividend yield for that day
                # — kept from the most recent day seen, real data NSE
                # itself publishes for the index as a whole.
                try:
                    pe = float(row["P/E"])
                    pb = float(row["P/B"])
                    div_yield = float(row["Div Yield"])
                except (KeyError, ValueError):
                    pass
                break
        except (KeyError, ValueError, csv.Error):
            continue
    if not points:
        return None
    points.sort(key=lambda p: p["t"])

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
        "name": index_name,
        "currency": "INR",
        "exchange": "NSE (EOD archive)",
        "instrumentType": "INDEX",
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
        # Real, index-level fundamentals NSE itself publishes daily —
        # not something any other provider in this app offers for an
        # index. None if not found in the fetched files.
        "peRatio": pe,
        "priceToBook": pb,
        "dividendYield": div_yield,
    }
    return envelope("NSE India", "bhavcopy_index", yahoo_symbol, data)


def chart(yahoo_symbol: str, range_: str = "1mo"):
    """Single entry point fallback call sites use."""
    if not yahoo_symbol:
        return None
    if yahoo_symbol.upper() in INDEX_NAMES:
        return index_chart(yahoo_symbol, range_)
    return equity_chart(yahoo_symbol, range_)
