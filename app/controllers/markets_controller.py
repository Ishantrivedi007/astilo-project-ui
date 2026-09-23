"""Astilo Markets — real historical + current data for stocks, ETFs/funds,
indices, commodities, forex (via Yahoo Finance's public chart/search
endpoints) and crypto (via CoinGecko's free API). Both are free and need no
API key; results are cached the same way as Cosmos's external data.
"""

import cherrypy
import requests

from app.markets import coingecko, frankfurter, worldbank, yahoo

ASSET_TYPES = ("stock", "crypto")


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Upstream market data service timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Upstream market data service failed: {exc}")


def _raise(exc):
    raise exc


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
            result = _guard(coingecko.market_chart, symbol, range)
        else:
            try:
                result = yahoo.chart(symbol, range)
                yahoo_failed = result is None or (isinstance(result, dict) and result.get("error"))
                yahoo_exc = None
            except requests.exceptions.RequestException as exc:
                result = None
                yahoo_failed = True
                yahoo_exc = exc

            if yahoo_failed:
                pair = frankfurter.yahoo_symbol_to_frankfurter(symbol)
                fallback = None
                if pair is not None:
                    try:
                        fallback = frankfurter.chart(pair[0], pair[1], range)
                    except requests.exceptions.RequestException:
                        fallback = None
                if fallback is not None and not (isinstance(fallback, dict) and fallback.get("error")):
                    result = fallback
                elif yahoo_exc is not None:
                    # No viable fallback — surface Yahoo's original error.
                    result = _guard(_raise, yahoo_exc)

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
    competitors, since that relationship can't be verified from this data)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        result = _guard(yahoo.fundamentals, symbol)
        data = result.get("data") or {}
        similar = []
        if data.get("available"):
            similar = _guard(
                yahoo.similar_companies, symbol, data.get("sector"), data.get("industry")
            )
        data["similarCompanies"] = similar
        return result


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


class MarketsTopController:
    """Curated/trending lists to populate the Markets home page."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, asset_type="crypto", limit=20, region="US"):
        if asset_type == "crypto":
            return _guard(coingecko.top_coins, int(limit))
        return _guard(yahoo.trending, region)
