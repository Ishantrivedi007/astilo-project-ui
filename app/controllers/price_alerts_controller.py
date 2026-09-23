"""Astilo Markets — Price Alerts. Same "lazy check on poll" architecture as
trading_controller.py's pending limit/stop orders: there is no background
scheduler in this app, so active alerts are checked at the top of every GET
here instead."""

import cherrypy
import requests

from app.db import get_session
from app.markets import coingecko, frankfurter, yahoo
from app.models import (
    PRICE_ALERT_CONDITIONS,
    TRADE_ASSET_TYPES,
    PriceAlert,
    utcnow,
)
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
            pair = frankfurter.yahoo_symbol_to_frankfurter(symbol)
            fallback = None
            if pair is not None:
                try:
                    fallback = frankfurter.chart(pair[0], pair[1], "1d")
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
    return {"price": price, "name": data.get("name") or symbol, "currency": data.get("currency") or "USD"}


def _check_alerts(session, user_id):
    """Lazily checks/triggers active price alerts — no background scheduler
    in this app, so this runs at the top of every GET here, same grouping
    optimization as trading_controller.py's _check_pending_orders."""
    alerts = session.query(PriceAlert).filter_by(user_id=user_id, status="active").all()
    if not alerts:
        return

    groups = {}
    for alert in alerts:
        groups.setdefault((alert.symbol, alert.asset_type), []).append(alert)

    quotes = {}
    for (symbol, asset_type) in groups:
        try:
            quotes[(symbol, asset_type)] = _current_quote(symbol, asset_type)
        except cherrypy.HTTPError:
            quotes[(symbol, asset_type)] = None

    for key, group_alerts in groups.items():
        quote = quotes.get(key)
        if not quote:
            continue  # skip this pass, leave alerts active, try again next poll
        price = quote["price"]
        for alert in group_alerts:
            triggered = (
                (alert.condition == "above" and price >= alert.target_price)
                or (alert.condition == "below" and price <= alert.target_price)
            )
            if not triggered:
                continue

            alert.status = "triggered"
            alert.triggered_at = utcnow()
            alert.triggered_price = price
            session.flush()
            notify(
                session, user_id, "markets",
                f"Price alert triggered: {alert.symbol} is now ${price:,.2f} "
                f"({alert.condition} your ${alert.target_price:,.2f} target)",
            )


class PriceAlertsController:
    """GET: checks active alerts for triggers, then returns the full alert
    history (active/triggered/cancelled). POST: create an alert. DELETE
    /<alert_id>: cancels a still-active alert."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            _check_alerts(session, user_id)
            alerts = (
                session.query(PriceAlert)
                .filter_by(user_id=user_id)
                .order_by(PriceAlert.created_at.desc())
                .all()
            )
            return [a.to_dict() for a in alerts]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        user_id = _user_id()

        symbol = (body.get("symbol") or "").strip()
        asset_type = body.get("assetType")
        condition = body.get("condition")
        try:
            target_price = float(body.get("targetPrice"))
        except (TypeError, ValueError):
            raise cherrypy.HTTPError(400, "targetPrice must be a number")

        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        if asset_type not in TRADE_ASSET_TYPES:
            raise cherrypy.HTTPError(400, f"assetType must be one of {TRADE_ASSET_TYPES}")
        if condition not in PRICE_ALERT_CONDITIONS:
            raise cherrypy.HTTPError(400, f"condition must be one of {PRICE_ALERT_CONDITIONS}")
        if target_price <= 0:
            raise cherrypy.HTTPError(400, "targetPrice must be a positive number")

        with get_session() as session:
            quote = None
            try:
                quote = _current_quote(symbol, asset_type)
            except cherrypy.HTTPError:
                quote = None
            name = quote["name"] if quote else symbol

            alert = PriceAlert(
                user_id=user_id,
                symbol=symbol,
                asset_type=asset_type,
                name=name,
                condition=condition,
                target_price=target_price,
                status="active",
            )
            session.add(alert)
            session.flush()

            notify(session, user_id, "markets", f"Price alert set: {symbol} {condition} ${target_price:,.2f}")

            return alert.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, alert_id):
        user_id = _user_id()
        with get_session() as session:
            alert = session.query(PriceAlert).filter_by(
                id=int(alert_id), user_id=user_id, status="active"
            ).first()
            if not alert:
                raise cherrypy.HTTPError(404, "Active price alert not found")

            alert.status = "cancelled"
            alert.cancelled_at = utcnow()
            session.flush()
            notify(session, user_id, "markets", f"Cancelled price alert: {alert.symbol} {alert.condition} ${alert.target_price:,.2f}")
            return {"cancelled": True}
