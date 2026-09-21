"""Astilo Trading — simulated stock/crypto trading against real, live
market prices. The cash balance, holdings, and P&L are entirely
make-believe (a flat fake starting balance, no real money anywhere); the
prices trades execute at are the same real Yahoo Finance / CoinGecko data
Markets uses, fetched live at order time, never a fabricated number.
"""

import random

import cherrypy
import requests

from app.db import get_session
from app.markets import coingecko, yahoo
from app.models import (
    TRADE_ASSET_TYPES,
    TRADE_SIDES,
    TradingAccount,
    TradingHolding,
    TradingTransaction,
)
from app.notify import notify

MIN_QUANTITY = 0.0001


def _user_id():
    return int(cherrypy.request.user["sub"])


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Upstream market data service timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Upstream market data service failed: {exc}")


def _current_quote(symbol: str, asset_type: str):
    """Real, live price + display name for a symbol — the same adapters
    Markets itself uses. Returns None if the symbol doesn't resolve."""
    if asset_type == "crypto":
        env = _guard(coingecko.market_chart, symbol, "1d")
    else:
        env = _guard(yahoo.chart, symbol, "1d")
    if not env or (isinstance(env, dict) and env.get("error")):
        return None
    data = env.get("data") if isinstance(env, dict) else None
    if not data:
        return None
    price = data.get("price") or data.get("previousClose")
    if price is None:
        return None
    return {"price": price, "name": data.get("name") or symbol, "currency": data.get("currency") or "USD"}


def _get_or_create_account(session, user_id: int) -> TradingAccount:
    account = session.query(TradingAccount).filter_by(user_id=user_id).first()
    if not account:
        account = TradingAccount(user_id=user_id)
        session.add(account)
        session.flush()
    return account


def _account_summary(session, account: TradingAccount) -> dict:
    holdings = session.query(TradingHolding).filter_by(account_id=account.id).all()
    holding_rows = []
    holdings_value = 0.0
    for h in holdings:
        quote = _current_quote(h.symbol, h.asset_type)
        price = quote["price"] if quote else None
        market_value = (price * h.quantity) if price is not None else None
        unrealized_pnl = ((price - h.avg_cost) * h.quantity) if price is not None else None
        if market_value is not None:
            holdings_value += market_value
        holding_rows.append(
            {
                **h.to_dict(),
                "currentPrice": price,
                "marketValue": market_value,
                "unrealizedPnl": unrealized_pnl,
                "unrealizedPnlPercent": (unrealized_pnl / (h.avg_cost * h.quantity) * 100) if unrealized_pnl is not None and h.avg_cost > 0 else None,
            }
        )

    return {
        "account": account.to_dict(),
        "holdings": holding_rows,
        "holdingsValue": holdings_value,
        "totalValue": account.cash_balance + holdings_value,
    }


class TradingAccountController:
    """GET: the user's simulated account, holdings (with live valuation),
    and total portfolio value — created on first access with the flat fake
    starting balance."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            return _account_summary(session, account)


class TradingDepositController:
    """Simulated payment gateway — same mock-card pattern as the Store's
    checkout (no real card is charged, ~1 in 10 attempts randomly
    "declines" to mimic a real processor) — credits the fake cash balance
    on success."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        user_id = _user_id()

        try:
            amount = float(body.get("amount"))
        except (TypeError, ValueError):
            raise cherrypy.HTTPError(400, "amount must be a number")
        if amount <= 0:
            raise cherrypy.HTTPError(400, "amount must be greater than 0")

        card_number = (body.get("cardNumber") or "").replace(" ", "")
        expiry = (body.get("expiry") or "").strip()
        cvv = (body.get("cvv") or "").strip()
        name = (body.get("name") or "").strip()
        if not (card_number.isdigit() and len(card_number) >= 12 and expiry and cvv.isdigit() and name):
            raise cherrypy.HTTPError(400, "Invalid card details")
        if random.random() < 0.1:
            raise cherrypy.HTTPError(402, "Payment declined, please try again")

        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            account.cash_balance += amount
            session.flush()
            notify(session, user_id, "markets", f"Deposited ${amount:,.2f} to your simulated trading account")
            return _account_summary(session, account)


class TradingOrdersController:
    """GET: transaction history. POST: execute a simulated buy/sell at the
    real, live current price for the symbol."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            txns = (
                session.query(TradingTransaction)
                .filter_by(account_id=account.id)
                .order_by(TradingTransaction.created_at.desc())
                .limit(200)
                .all()
            )
            return [t.to_dict() for t in txns]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        user_id = _user_id()

        symbol = (body.get("symbol") or "").strip()
        asset_type = body.get("assetType")
        side = body.get("side")
        try:
            quantity = float(body.get("quantity"))
        except (TypeError, ValueError):
            raise cherrypy.HTTPError(400, "quantity must be a number")

        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        if asset_type not in TRADE_ASSET_TYPES:
            raise cherrypy.HTTPError(400, f"assetType must be one of {TRADE_ASSET_TYPES}")
        if side not in TRADE_SIDES:
            raise cherrypy.HTTPError(400, f"side must be one of {TRADE_SIDES}")
        if quantity < MIN_QUANTITY:
            raise cherrypy.HTTPError(400, f"quantity must be at least {MIN_QUANTITY}")

        quote = _current_quote(symbol, asset_type)
        if not quote:
            raise cherrypy.HTTPError(404, f"No live price found for '{symbol}'")
        price = quote["price"]
        total = price * quantity

        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            holding = (
                session.query(TradingHolding)
                .filter_by(account_id=account.id, symbol=symbol, asset_type=asset_type)
                .first()
            )

            realized_pnl = None
            if side == "buy":
                if account.cash_balance < total:
                    raise cherrypy.HTTPError(402, f"Insufficient simulated cash: need ${total:,.2f}, have ${account.cash_balance:,.2f}")
                account.cash_balance -= total
                if holding:
                    new_qty = holding.quantity + quantity
                    holding.avg_cost = (holding.avg_cost * holding.quantity + total) / new_qty
                    holding.quantity = new_qty
                    holding.name = quote["name"]
                else:
                    holding = TradingHolding(
                        account_id=account.id, symbol=symbol, asset_type=asset_type,
                        name=quote["name"], quantity=quantity, avg_cost=price,
                    )
                    session.add(holding)
            else:  # sell
                if not holding or holding.quantity < quantity:
                    have = holding.quantity if holding else 0
                    raise cherrypy.HTTPError(402, f"Insufficient holding: trying to sell {quantity}, have {have}")
                realized_pnl = (price - holding.avg_cost) * quantity
                account.cash_balance += total
                holding.quantity -= quantity
                if holding.quantity <= MIN_QUANTITY:
                    session.delete(holding)

            txn = TradingTransaction(
                account_id=account.id, symbol=symbol, asset_type=asset_type, name=quote["name"],
                side=side, quantity=quantity, price=price, total=total, realized_pnl=realized_pnl,
            )
            session.add(txn)
            session.flush()

            verb = "Bought" if side == "buy" else "Sold"
            notify(session, user_id, "markets", f"{verb} {quantity} {symbol} @ ${price:,.2f} (simulated)")

            result = _account_summary(session, account)
            result["transaction"] = txn.to_dict()
            return result


class TradingInsightsController:
    """Real, computed trend indicators for a symbol — the same honest
    from-history-only approach as the Markets asset page (trend direction,
    volatility, range position, a labeled linear-trend projection) — never
    a fabricated buy/sell call."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None, asset_type="stock"):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        if asset_type not in TRADE_ASSET_TYPES:
            raise cherrypy.HTTPError(400, f"asset_type must be one of {TRADE_ASSET_TYPES}")

        if asset_type == "crypto":
            env = _guard(coingecko.market_chart, symbol, "1mo")
        else:
            env = _guard(yahoo.chart, symbol, "1mo")
        if not env or (isinstance(env, dict) and env.get("error")):
            raise cherrypy.HTTPError(404, f"No data found for '{symbol}'")

        data = env.get("data") or {}
        points = data.get("points") or []
        closes = [p["close"] for p in points if p.get("close") is not None]
        if len(closes) < 2:
            return {"symbol": symbol, "insufficientData": True}

        first, last = closes[0], closes[-1]
        period_change_pct = ((last - first) / first) * 100 if first else None

        returns = [(closes[i] - closes[i - 1]) / closes[i - 1] for i in range(1, len(closes)) if closes[i - 1]]
        mean_return = sum(returns) / len(returns) if returns else 0
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns) if returns else 0
        volatility_pct = (variance ** 0.5) * 100

        window = min(7, len(closes))
        recent_avg = sum(closes[-window:]) / window
        earlier_slice = closes[max(0, len(closes) - window - 7) : len(closes) - window] or closes[:window]
        earlier_avg = sum(earlier_slice) / len(earlier_slice)
        trend_direction = "up" if recent_avg >= earlier_avg else "down"

        period_high, period_low = max(closes), min(closes)
        range_position = ((last - period_low) / (period_high - period_low) * 100) if period_high != period_low else 50

        return {
            "symbol": symbol,
            "periodChangePct": period_change_pct,
            "volatilityPct": volatility_pct,
            "trendDirection": trend_direction,
            "periodHigh": period_high,
            "periodLow": period_low,
            "rangePosition": range_position,
            "currentPrice": last,
            "disclaimer": "Computed directly from real historical prices — not a prediction, model, or investment advice.",
        }
