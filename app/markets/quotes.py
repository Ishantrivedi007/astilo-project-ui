"""Shared multi-provider fallback chains for Markets — the single place
that decides what "no single point of failure" means for a quote lookup,
used by every controller that needs a live price (read-only Markets
endpoints, simulated trading, watchlist, price alerts) so the fallback
policy can't drift between them.

Non-crypto: Yahoo Finance -> Frankfurter/ECB (forex pairs only) -> Alpha
Vantage (equities/ETFs/bonds/commodities/metals, only if a free API key is
configured — see app/markets/alphavantage.py).

Crypto: CoinGecko -> Binance (real trading data, keyless).

Each fallback is genuinely independent data (a different upstream, not a
retry of the same one), and a fallback provider having no coverage for a
given symbol, or failing outright, never masks or replaces the primary
provider's own error — that original error is what surfaces when nothing
else has an answer, rather than a generic "fallback also failed" message.
"""

import requests

from app.markets import alphavantage, binance, coingecko, frankfurter, yahoo


def _ok(result) -> bool:
    return result is not None and not (isinstance(result, dict) and result.get("error"))


def _try(fn, *args):
    """Best-effort call — one fallback provider failing outright (network
    error, unmapped symbol) should never block the ones after it."""
    try:
        result = fn(*args)
        return result if _ok(result) else None
    except requests.exceptions.RequestException:
        return None


def stock_chart_with_fallback(symbol: str, range_: str):
    try:
        result = yahoo.chart(symbol, range_)
        primary_exc = None
    except requests.exceptions.RequestException as exc:
        result = None
        primary_exc = exc

    if _ok(result):
        return result

    pair = frankfurter.yahoo_symbol_to_frankfurter(symbol)
    if pair is not None:
        fallback = _try(frankfurter.chart, pair[0], pair[1], range_)
        if fallback is not None:
            return fallback

    fallback = _try(alphavantage.chart, symbol, range_)
    if fallback is not None:
        return fallback

    if primary_exc is not None:
        raise primary_exc
    return result


def crypto_chart_with_fallback(symbol: str, range_: str):
    try:
        result = coingecko.market_chart(symbol, range_)
        primary_exc = None
    except requests.exceptions.RequestException as exc:
        result = None
        primary_exc = exc

    if _ok(result):
        return result

    fallback = _try(binance.chart, symbol, range_)
    if fallback is not None:
        return fallback

    if primary_exc is not None:
        raise primary_exc
    return result
