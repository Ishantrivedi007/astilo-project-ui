"""Astilo Markets — Watchlists. Plain CRUD over saved symbols, enriched with
live quotes on read the same way TradingHolding rows get enriched in
trading_controller.py's _account_summary. No background scheduler involved
here (nothing time-based to check)."""

import cherrypy
import requests

from app.db import get_session
from app.markets import coingecko, stooq, yahoo
from app.models import TRADE_ASSET_TYPES, WatchlistItem
from app.notify import notify


def _user_id():
    return int(cherrypy.request.user["sub"])


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Upstream market data service timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Upstream market data service failed: {exc}")


def _raise(exc):
    raise exc


def _current_quote(symbol: str, asset_type: str):
    """Real, live price + display name for a symbol — same adapters as
    trading_controller.py's _current_quote. Returns None if the symbol
    doesn't resolve. Kept as a local copy rather than imported since
    trading_controller.py doesn't expose it as a shared/public helper."""
    if asset_type == "crypto":
        env = _guard(coingecko.market_chart, symbol, "1d")
    else:
        try:
            env = yahoo.chart(symbol, "1d")
            yahoo_failed = not env or (isinstance(env, dict) and env.get("error"))
            yahoo_exc = None
        except requests.exceptions.RequestException as exc:
            env = None
            yahoo_failed = True
            yahoo_exc = exc

        if yahoo_failed:
            stooq_symbol = stooq.yahoo_symbol_to_stooq(symbol)
            fallback = None
            if stooq_symbol is not None:
                try:
                    fallback = stooq.chart(stooq_symbol, "1d")
                except requests.exceptions.RequestException:
                    fallback = None
            if fallback is not None and not (isinstance(fallback, dict) and fallback.get("error")):
                env = fallback
            elif yahoo_exc is not None:
                _guard(_raise, yahoo_exc)
    if not env or (isinstance(env, dict) and env.get("error")):
        return None
    data = env.get("data") if isinstance(env, dict) else None
    if not data:
        return None
    price = data.get("price") or data.get("previousClose")
    if price is None:
        return None
    change_percent = data.get("changePercent")
    return {
        "price": price,
        "name": data.get("name") or symbol,
        "currency": data.get("currency") or "USD",
        "changePercent": change_percent,
    }


def _enrich(item: WatchlistItem) -> dict:
    quote = None
    try:
        quote = _current_quote(item.symbol, item.asset_type)
    except cherrypy.HTTPError:
        quote = None
    return {
        **item.to_dict(),
        "name": item.name or (quote["name"] if quote else None),
        "currentPrice": quote["price"] if quote else None,
        "changePercent": quote["changePercent"] if quote else None,
    }


class WatchlistController:
    """GET: the user's watchlist, enriched with live quotes. POST: add a
    symbol (idempotent). DELETE /<item_id>: remove a symbol."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            items = (
                session.query(WatchlistItem)
                .filter_by(user_id=user_id)
                .order_by(WatchlistItem.added_at.desc())
                .all()
            )
            return [_enrich(item) for item in items]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        user_id = _user_id()

        symbol = (body.get("symbol") or "").strip()
        asset_type = body.get("assetType")

        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        if asset_type not in TRADE_ASSET_TYPES:
            raise cherrypy.HTTPError(400, f"assetType must be one of {TRADE_ASSET_TYPES}")

        with get_session() as session:
            existing = session.query(WatchlistItem).filter_by(
                user_id=user_id, symbol=symbol, asset_type=asset_type
            ).first()
            if existing:
                return _enrich(existing)

            quote = None
            try:
                quote = _current_quote(symbol, asset_type)
            except cherrypy.HTTPError:
                quote = None
            name = quote["name"] if quote else symbol

            item = WatchlistItem(
                user_id=user_id,
                symbol=symbol,
                asset_type=asset_type,
                name=name,
                notes=body.get("notes"),
            )
            session.add(item)
            session.flush()

            notify(session, user_id, "markets", f"Added {symbol} to your watchlist")

            return _enrich(item)

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, item_id):
        user_id = _user_id()
        with get_session() as session:
            item = session.query(WatchlistItem).filter_by(id=int(item_id), user_id=user_id).first()
            if not item:
                raise cherrypy.HTTPError(404, "Watchlist item not found")

            session.delete(item)
            return {"deleted": True}
