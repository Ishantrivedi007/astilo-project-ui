"""Astilo Trading — simulated stock/crypto trading against real, live
market prices. The cash balance, holdings, and P&L are entirely
make-believe (a flat fake starting balance, no real money anywhere); the
prices trades execute at are the same real Yahoo Finance / CoinGecko data
Markets uses, fetched live at order time, never a fabricated number.
"""

import datetime
import random

import cherrypy
import requests

from app.db import get_session
from app.markets.quotes import crypto_chart_with_fallback, stock_chart_with_fallback
from app.models import (
    TRADE_ASSET_TYPES,
    TRADE_ORDER_TYPES,
    TRADE_SIDES,
    TradingAccount,
    TradingHolding,
    TradingOrder,
    TradingTransaction,
    utcnow,
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
    """Real, live price + display name for a symbol — the same
    multi-provider fallback chain Markets itself uses (app.markets.quotes).
    Returns None if the symbol doesn't resolve on any provider."""
    if asset_type == "crypto":
        env = _guard(crypto_chart_with_fallback, symbol, "1d")
    else:
        env = _guard(stock_chart_with_fallback, symbol, "1d")
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


def _apply_fill(session, account, symbol, asset_type, name, side, quantity, price):
    """Executes a buy/sell against the account at `price` — the same
    cash/holding bookkeeping TradingOrdersController.POST used to do inline,
    now shared by the synchronous market-order path and the lazy
    pending-order fill check. Never raises: on failure (insufficient cash
    or insufficient holding) it returns (None, error_message) so a pending
    order can just stay pending rather than blowing up a request that
    happens to be checking it."""
    total = price * quantity
    holding = (
        session.query(TradingHolding)
        .filter_by(account_id=account.id, symbol=symbol, asset_type=asset_type)
        .first()
    )

    realized_pnl = None
    if side == "buy":
        if account.cash_balance < total:
            return None, f"Insufficient simulated cash: need ${total:,.2f}, have ${account.cash_balance:,.2f}"
        account.cash_balance -= total
        if holding:
            new_qty = holding.quantity + quantity
            holding.avg_cost = (holding.avg_cost * holding.quantity + total) / new_qty
            holding.quantity = new_qty
            holding.name = name
        else:
            holding = TradingHolding(
                account_id=account.id, symbol=symbol, asset_type=asset_type,
                name=name, quantity=quantity, avg_cost=price,
            )
            session.add(holding)
    else:  # sell
        if not holding or holding.quantity < quantity:
            have = holding.quantity if holding else 0
            return None, f"Insufficient holding: trying to sell {quantity}, have {have}"
        realized_pnl = (price - holding.avg_cost) * quantity
        account.cash_balance += total
        holding.quantity -= quantity
        if holding.quantity <= MIN_QUANTITY:
            session.delete(holding)

    txn = TradingTransaction(
        account_id=account.id, symbol=symbol, asset_type=asset_type, name=name,
        side=side, quantity=quantity, price=price, total=total, realized_pnl=realized_pnl,
    )
    session.add(txn)
    session.flush()
    return txn, None


def _check_pending_orders(session, account):
    """Lazily fills/skips pending limit & stop orders — there is no
    background scheduler in this app, so this runs at the top of every
    account/orders read or write instead, backed by the frontend's existing
    30s poll of /trading/account."""
    orders = (
        session.query(TradingOrder)
        .filter_by(account_id=account.id, status="pending")
        .all()
    )
    if not orders:
        return

    groups = {}
    for order in orders:
        groups.setdefault((order.symbol, order.asset_type), []).append(order)

    quotes = {}
    for (symbol, asset_type) in groups:
        quotes[(symbol, asset_type)] = _current_quote(symbol, asset_type)

    for key, group_orders in groups.items():
        quote = quotes.get(key)
        if not quote:
            continue
        price = quote["price"]
        for order in group_orders:
            triggered = False
            if order.order_type == "limit":
                if order.side == "buy" and price <= order.limit_price:
                    triggered = True
                elif order.side == "sell" and price >= order.limit_price:
                    triggered = True
            elif order.order_type == "stop":
                if order.side == "buy" and price >= order.stop_price:
                    triggered = True
                elif order.side == "sell" and price <= order.stop_price:
                    triggered = True

            if not triggered:
                continue

            txn, error = _apply_fill(
                session, account, order.symbol, order.asset_type, order.name or quote["name"],
                order.side, order.quantity, price,
            )
            if error:
                continue  # leave it pending — e.g. cash dried up since placement

            order.status = "filled"
            order.filled_at = utcnow()
            order.filled_price = price
            session.flush()
            notify(
                session, account.user_id, "markets",
                f"Pending {order.order_type} {order.side} order filled: {order.quantity} {order.symbol} @ ${price:,.2f} (simulated)",
            )


def _reserved_buy_cost(session, account, exclude_order_id=None):
    """Total cash reserved by the account's other pending buy orders —
    quantity * limit/stop price, so a new buy order can't be placed against
    cash that's already spoken for by an earlier pending order."""
    query = session.query(TradingOrder).filter_by(account_id=account.id, status="pending", side="buy")
    if exclude_order_id is not None:
        query = query.filter(TradingOrder.id != exclude_order_id)
    total = 0.0
    for order in query.all():
        ref_price = order.limit_price if order.limit_price is not None else order.stop_price
        if ref_price is not None:
            total += order.quantity * ref_price
    return total


def _reserved_sell_qty(session, account, symbol, asset_type, exclude_order_id=None):
    """Total quantity reserved by the account's other pending sell orders
    for this same symbol/asset_type."""
    query = session.query(TradingOrder).filter_by(
        account_id=account.id, status="pending", side="sell", symbol=symbol, asset_type=asset_type,
    )
    if exclude_order_id is not None:
        query = query.filter(TradingOrder.id != exclude_order_id)
    return sum(order.quantity for order in query.all())


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
            _check_pending_orders(session, account)
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
            _check_pending_orders(session, account)
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
        order_type = body.get("orderType") or "market"
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
        if order_type not in TRADE_ORDER_TYPES:
            raise cherrypy.HTTPError(400, f"orderType must be one of {TRADE_ORDER_TYPES}")
        if quantity < MIN_QUANTITY:
            raise cherrypy.HTTPError(400, f"quantity must be at least {MIN_QUANTITY}")

        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            _check_pending_orders(session, account)

            if order_type == "market":
                quote = _current_quote(symbol, asset_type)
                if not quote:
                    raise cherrypy.HTTPError(404, f"No live price found for '{symbol}'")
                price = quote["price"]

                txn, error = _apply_fill(session, account, symbol, asset_type, quote["name"], side, quantity, price)
                if error:
                    raise cherrypy.HTTPError(402, error)

                verb = "Bought" if side == "buy" else "Sold"
                notify(session, user_id, "markets", f"{verb} {quantity} {symbol} @ ${price:,.2f} (simulated)")

                result = _account_summary(session, account)
                result["transaction"] = txn.to_dict()
                return result

            # limit / stop order — placed, not executed, pending a future price trigger.
            ref_field = "limitPrice" if order_type == "limit" else "stopPrice"
            try:
                ref_price = float(body.get(ref_field))
            except (TypeError, ValueError):
                raise cherrypy.HTTPError(400, f"{ref_field} must be a positive number")
            if ref_price <= 0:
                raise cherrypy.HTTPError(400, f"{ref_field} must be a positive number")

            quote = _current_quote(symbol, asset_type)
            name = quote["name"] if quote else symbol

            if side == "buy":
                this_cost = quantity * ref_price
                reserved = _reserved_buy_cost(session, account)
                if account.cash_balance < reserved + this_cost:
                    raise cherrypy.HTTPError(
                        402,
                        f"Insufficient simulated cash: need ${this_cost:,.2f} (${reserved:,.2f} already reserved by other pending orders), have ${account.cash_balance:,.2f}",
                    )
            else:  # sell
                holding = (
                    session.query(TradingHolding)
                    .filter_by(account_id=account.id, symbol=symbol, asset_type=asset_type)
                    .first()
                )
                have = holding.quantity if holding else 0
                reserved_qty = _reserved_sell_qty(session, account, symbol, asset_type)
                available = have - reserved_qty
                if available < quantity:
                    raise cherrypy.HTTPError(
                        402,
                        f"Insufficient holding: trying to reserve {quantity}, have {have} ({reserved_qty} already reserved by other pending orders)",
                    )

            order = TradingOrder(
                account_id=account.id,
                symbol=symbol,
                asset_type=asset_type,
                name=name,
                side=side,
                order_type=order_type,
                quantity=quantity,
                limit_price=ref_price if order_type == "limit" else None,
                stop_price=ref_price if order_type == "stop" else None,
                status="pending",
            )
            session.add(order)
            session.flush()

            notify(session, user_id, "markets", f"Placed {order_type} {side} order: {quantity} {symbol} (simulated)")

            result = _account_summary(session, account)
            result["pendingOrder"] = order.to_dict()
            return result


class TradingPendingOrdersController:
    """GET: the account's current pending limit/stop orders (checking for
    fills first). DELETE /<order_id>: cancels a still-pending order."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            _check_pending_orders(session, account)
            orders = (
                session.query(TradingOrder)
                .filter_by(account_id=account.id, status="pending")
                .order_by(TradingOrder.created_at.desc())
                .all()
            )
            return [o.to_dict() for o in orders]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, order_id):
        user_id = _user_id()
        with get_session() as session:
            account = _get_or_create_account(session, user_id)
            order = (
                session.query(TradingOrder)
                .filter_by(id=int(order_id), account_id=account.id, status="pending")
                .first()
            )
            if not order:
                raise cherrypy.HTTPError(404, "Pending order not found")

            order.status = "cancelled"
            order.cancelled_at = utcnow()
            session.flush()
            notify(session, user_id, "markets", f"Cancelled {order.order_type} {order.side} order: {order.quantity} {order.symbol} (simulated)")
            return {"cancelled": True}


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
            env = _guard(crypto_chart_with_fallback, symbol, "1mo")
        else:
            env = _guard(stock_chart_with_fallback, symbol, "1mo")
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

        # Max drawdown — largest peak-to-trough decline over the period.
        peak = closes[0]
        max_drawdown_pct = 0.0
        for c in closes:
            if c > peak:
                peak = c
            if peak > 0:
                drawdown = (peak - c) / peak * 100
                if drawdown > max_drawdown_pct:
                    max_drawdown_pct = drawdown

        # Sharpe ratio — simplified: 0% risk-free rate, and every period is
        # treated as a trading day regardless of the range/interval actually
        # used, so this is a rough annualization, not a precise one.
        std_return = variance ** 0.5
        sharpe_ratio_annualized = (mean_return / std_return * (252 ** 0.5)) if std_return > 0 else None

        beta = None
        beta_benchmark = None
        try:
            if asset_type == "crypto":
                bench_env = _guard(crypto_chart_with_fallback, "bitcoin", "1mo")
                bench_label = "Bitcoin"
            else:
                bench_env = _guard(stock_chart_with_fallback, "^GSPC", "1mo")
                bench_label = "S&P 500"
            bench_data = (bench_env or {}).get("data") or {}
            bench_points = bench_data.get("points") or []
            bench_closes = [p["close"] for p in bench_points if p.get("close") is not None]
            if len(bench_closes) >= 2:
                bench_returns = [
                    (bench_closes[i] - bench_closes[i - 1]) / bench_closes[i - 1]
                    for i in range(1, len(bench_closes)) if bench_closes[i - 1]
                ]
                n = min(len(returns), len(bench_returns))
                if n >= 2:
                    asset_tail = returns[-n:]
                    bench_tail = bench_returns[-n:]
                    asset_mean = sum(asset_tail) / n
                    bench_mean = sum(bench_tail) / n
                    covariance = sum((asset_tail[i] - asset_mean) * (bench_tail[i] - bench_mean) for i in range(n)) / n
                    bench_variance = sum((r - bench_mean) ** 2 for r in bench_tail) / n
                    if bench_variance > 0:
                        beta = covariance / bench_variance
                        beta_benchmark = bench_label
        except cherrypy.HTTPError:
            beta = None
            beta_benchmark = None

        return {
            "symbol": symbol,
            "periodChangePct": period_change_pct,
            "volatilityPct": volatility_pct,
            "trendDirection": trend_direction,
            "periodHigh": period_high,
            "periodLow": period_low,
            "rangePosition": range_position,
            "currentPrice": last,
            "maxDrawdownPct": max_drawdown_pct,
            "sharpeRatioAnnualized": sharpe_ratio_annualized,
            "beta": beta,
            "betaBenchmark": beta_benchmark,
            "disclaimer": "Computed directly from real historical prices — not a prediction, model, or investment advice. Drawdown, Sharpe ratio, and beta are also computed directly from real historical prices, not predictions.",
        }


class TradingWhatIfController:
    """"What if I invested $X N years ago" — a real, honest backtest over
    the actual historical price series for the symbol (no model, no
    prediction), same public/no-auth pattern as TradingInsightsController."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, symbol=None, asset_type="stock", amount=10000, years=5):
        if not symbol:
            raise cherrypy.HTTPError(400, "symbol is required")
        if asset_type not in TRADE_ASSET_TYPES:
            raise cherrypy.HTTPError(400, f"asset_type must be one of {TRADE_ASSET_TYPES}")
        try:
            amount = float(amount)
            years = float(years)
        except (TypeError, ValueError):
            raise cherrypy.HTTPError(400, "amount and years must be numbers")
        if amount <= 0:
            raise cherrypy.HTTPError(400, "amount must be greater than 0")
        if years <= 0:
            raise cherrypy.HTTPError(400, "years must be greater than 0")

        if years <= 1:
            range_ = "1y"
        elif years <= 5:
            range_ = "5y"
        else:
            range_ = "max"

        if asset_type == "crypto":
            env = _guard(crypto_chart_with_fallback, symbol, range_)
        else:
            env = _guard(stock_chart_with_fallback, symbol, range_)
        if not env or (isinstance(env, dict) and env.get("error")):
            raise cherrypy.HTTPError(404, f"No data found for '{symbol}'")

        data = env.get("data") or {}
        points = data.get("points") or []
        usable = [p for p in points if p.get("close") is not None]
        if len(usable) < 2:
            return {"symbol": symbol, "insufficientData": True}

        first, last = usable[0], usable[-1]
        shares = amount / first["close"]
        current_value = shares * last["close"]
        actual_years = (last["t"] - first["t"]) / (365.25 * 86400 * 1000)

        cagr = None
        if actual_years > 0 and current_value > 0 and amount > 0:
            cagr = (current_value / amount) ** (1 / actual_years) - 1

        return {
            "symbol": symbol,
            "amountInvested": amount,
            "requestedYears": years,
            "actualYears": actual_years,
            "investedAtDate": datetime.datetime.utcfromtimestamp(first["t"] / 1000).isoformat() + "Z",
            "investedAtPrice": first["close"],
            "currentDate": datetime.datetime.utcfromtimestamp(last["t"] / 1000).isoformat() + "Z",
            "currentPrice": last["close"],
            "sharesBought": shares,
            "currentValue": current_value,
            "totalReturn": current_value - amount,
            "totalReturnPct": (current_value - amount) / amount * 100,
            "cagr": cagr,
            "disclaimer": "Computed directly from real historical prices for this exact period — not a prediction, and past performance never guarantees future results.",
        }
