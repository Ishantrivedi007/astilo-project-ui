"""Astilo Markets — real historical + current data for stocks, ETFs/funds,
indices, commodities, forex (via Yahoo Finance's public chart/search
endpoints) and crypto (via CoinGecko's free API). Both primary providers
are free and need no API key; results are cached the same way as Cosmos's
external data. Multi-provider redundancy for quote lookups (see
app.markets.quotes) is layered on top so no single provider outage takes
Markets down — see that module for which fallbacks cover which asset
classes.
"""

import cherrypy
import requests

from app.markets import alphavantage, coingecko, worldbank, yahoo
from app.markets.http import envelope
from app.markets.quotes import crypto_chart_with_fallback, stock_chart_with_fallback

ASSET_TYPES = ("stock", "crypto")


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Upstream market data service timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Upstream market data service failed: {exc}")


class MarketsAssetController:
    """Current quote + historical price series for one symbol, in one call."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None, asset_type="stock", range="1mo"):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        if asset_type not in ASSET_TYPES:
            raise cherrypy.HTTPError(400, f"asset_type must be one of {ASSET_TYPES}")

        if asset_type == "crypto":
            result = _guard(crypto_chart_with_fallback, symbol, range)
        else:
            result = _guard(stock_chart_with_fallback, symbol, range)

        if result is None:
            raise cherrypy.HTTPError(404, f"No data found for symbol '{symbol}'")
        if isinstance(result, dict) and result.get("error"):
            raise cherrypy.HTTPError(404, str(result["error"]))
        return result


class MarketsSearchController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, asset_type="stock", limit=10):
        if not q:
            raise cherrypy.HTTPError(400, "q is required")
        if asset_type == "crypto":
            return _guard(coingecko.search, q, int(limit))
        return _guard(yahoo.search, q, int(limit))


class MarketsNewsController:
    """Real recent headlines for a symbol, via Yahoo Finance's public RSS
    feed. Crypto tickers are looked up on Yahoo too (e.g. BTC-USD) since
    CoinGecko's free tier has no news endpoint."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None, limit=10):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        return _guard(yahoo.news, symbol, int(limit))


class MarketsRegionsController:
    """Real benchmark-index performance per country, for the world/region
    map — every country's own major index, live from Yahoo Finance."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(yahoo.region_indices)


class MarketsFundamentalsController:
    """Company fundamentals (P/E, dividend yield, key stats) plus a list of
    "similar companies" (same sector/industry — never asserted as actual
    competitors, since that relationship can't be verified from this data).

    Yahoo's underlying endpoint requires an auth crumb this app doesn't
    chase (see yahoo.fundamentals' own docstring), so it always returns
    {available: false} today — Alpha Vantage's OVERVIEW is used as a real
    fallback here (live-verified: works keylessly-of-crumb on their free
    tier, unlike Yahoo's), only if a free API key is configured."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        result = _guard(yahoo.fundamentals, symbol)
        data = result.get("data") or {}

        if not data.get("available"):
            av_data = _try_alphavantage_fundamentals(symbol)
            if av_data is not None:
                result = envelope("Alpha Vantage", "overview", symbol, av_data)
                data = av_data

        similar = []
        if data.get("available"):
            similar = _guard(
                yahoo.similar_companies, symbol, data.get("sector"), data.get("industry")
            )
        data["similarCompanies"] = similar
        return result


def _try_alphavantage_fundamentals(symbol: str):
    try:
        return alphavantage.fundamentals(symbol)
    except requests.exceptions.RequestException:
        return None


class MarketsMacroController:
    """Real historical macroeconomic indicator trends for a country, from
    the World Bank's Indicators API — not a fabricated release calendar."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, country="US"):
        country = (country or "US").upper()
        result = _guard(worldbank.macro_dashboard, country)
        if result is None:
            raise cherrypy.HTTPError(404, f"No macro data found for country '{country}'")
        return result


class MarketsMacroIndicatorController:
    """Single-indicator lookup, for comparing one indicator across
    multiple countries without re-fetching the full dashboard each time."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, country="US", indicator="gdp"):
        country = (country or "US").upper()
        if indicator not in worldbank.INDICATORS:
            raise cherrypy.HTTPError(
                400, f"indicator must be one of {list(worldbank.INDICATORS)}"
            )
        result = _guard(worldbank.indicator_series, country, indicator)
        if result is None:
            raise cherrypy.HTTPError(404, f"No data found for country '{country}'")
        return result


class MarketsCountriesController:
    """The real list of countries the World Bank's macro data covers, for
    driving the macro-dashboard country picker — not a hardcoded shortlist."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        result = _guard(worldbank.countries)
        if result is None:
            raise cherrypy.HTTPError(502, "Country list unavailable right now")
        return result


class MarketsNewsClustersController:
    """Real headlines across multiple symbols, grouped into story clusters
    by a transparent same-day + title-overlap heuristic (not ML)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbols=None, limit_per_symbol=10):
        if not symbols:
            raise cherrypy.HTTPError(400, "symbols is required (comma-separated)")
        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
        if not symbol_list:
            raise cherrypy.HTTPError(400, "symbols is required (comma-separated)")
        if len(symbol_list) > 8:
            raise cherrypy.HTTPError(400, "at most 8 symbols allowed")
        return _guard(yahoo.news_clusters, symbol_list, int(limit_per_symbol))


class MarketsEarningsCalendarController:
    """Real upcoming company earnings dates (Alpha Vantage EARNINGS_CALENDAR
    — live-verified, returns thousands of real rows on the free tier).
    Only if a free API key is configured; 404 otherwise so the frontend
    can show an honest "not configured" state rather than an empty list."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, horizon="3month"):
        if horizon not in ("3month", "6month", "12month"):
            raise cherrypy.HTTPError(400, "horizon must be one of 3month, 6month, 12month")
        rows = _guard(alphavantage.earnings_calendar, horizon)
        if rows is None:
            raise cherrypy.HTTPError(404, "Earnings calendar unavailable (no Alpha Vantage key configured, or upstream error)")
        return envelope("Alpha Vantage", "earnings_calendar", None, {"horizon": horizon, "count": len(rows), "results": rows})


class MarketsIpoCalendarController:
    """Real upcoming IPOs (Alpha Vantage IPO_CALENDAR — live-verified)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        rows = _guard(alphavantage.ipo_calendar)
        if rows is None:
            raise cherrypy.HTTPError(404, "IPO calendar unavailable (no Alpha Vantage key configured, or upstream error)")
        return envelope("Alpha Vantage", "ipo_calendar", None, {"count": len(rows), "results": rows})


class MarketsDividendsController:
    """Real dividend history for a symbol (Alpha Vantage DIVIDENDS —
    live-verified against AAPL, 58 real historical dividend rows)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        rows = _guard(alphavantage.dividends, symbol)
        if rows is None:
            raise cherrypy.HTTPError(404, "Dividend history unavailable for this symbol (no Alpha Vantage key configured, symbol not covered, or upstream error)")
        return envelope("Alpha Vantage", "dividends", symbol, {"count": len(rows), "results": rows})


class MarketsTopController:
    """Curated/trending lists to populate the Markets home page."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, asset_type="crypto", limit=20, region="US"):
        if asset_type == "crypto":
            return _guard(coingecko.top_coins, int(limit))
        return _guard(yahoo.trending, region)
