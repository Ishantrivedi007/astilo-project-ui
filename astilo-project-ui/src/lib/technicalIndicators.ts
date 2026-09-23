import type { MarketPoint } from "./marketsApi";

/** Pure, defensive technical-indicator helpers over MarketPoint[]. Every
 * function returns an array aligned 1:1 with the input points (nulls where
 * the value isn't yet defined — e.g. before an indicator's lookback period
 * has enough history), matching the existing sma() helper's pattern in
 * MarketsAssetView.tsx. None of these throw on short/incomplete input. */

const ema = (values: number[], period: number): (number | null)[] => {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
};

/** Standard Wilder's RSI (0-100), null until `period` closes are available. */
export const rsi = (points: MarketPoint[], period = 14): (number | null)[] => {
  const closes = points.map((p) => p.close);
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsiAt = (ag: number, al: number) => (al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  out[period] = rsiAt(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const gain = gains[i - 1];
    const loss = losses[i - 1];
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = rsiAt(avgGain, avgLoss);
  }

  return out;
};

/** MACD (EMA-based): macd line = EMA(fast) - EMA(slow), signal = EMA(macd, signal),
 * histogram = macd - signal. Each array aligned to input, null before enough history. */
export const macd = (
  points: MarketPoint[],
  fast = 12,
  slow = 26,
  signal = 9
): { macdLine: (number | null)[]; signalLine: (number | null)[]; histogram: (number | null)[] } => {
  const closes = points.map((p) => p.close);
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) => (emaFast[i] != null && emaSlow[i] != null ? emaFast[i]! - emaSlow[i]! : null));

  // EMA the macd line itself, but only over its defined (non-null) tail —
  // ema() expects a dense numeric array, so compact then re-expand.
  const firstDefined = macdLine.findIndex((v) => v != null);
  let signalLine: (number | null)[] = new Array(closes.length).fill(null);
  let histogram: (number | null)[] = new Array(closes.length).fill(null);
  if (firstDefined !== -1) {
    const compact = macdLine.slice(firstDefined).map((v) => v as number);
    const compactSignal = ema(compact, signal);
    signalLine = new Array(closes.length).fill(null);
    for (let i = 0; i < compactSignal.length; i++) {
      signalLine[firstDefined + i] = compactSignal[i];
    }
    histogram = closes.map((_, i) => (macdLine[i] != null && signalLine[i] != null ? macdLine[i]! - signalLine[i]! : null));
  }

  return { macdLine, signalLine, histogram };
};

/** Bollinger Bands: middle = SMA(period), upper/lower = middle +/- (stdDev * multiplier). */
export const bollingerBands = (
  points: MarketPoint[],
  period = 20,
  stdDevMultiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } => {
  const closes = points.map((p) => p.close);
  const middle: (number | null)[] = new Array(closes.length).fill(null);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    middle[i] = mean;
    upper[i] = mean + stdDev * stdDevMultiplier;
    lower[i] = mean - stdDev * stdDevMultiplier;
  }

  return { upper, middle, lower };
};

/** Cumulative volume-weighted average price (typical price = (h+l+c)/3).
 * A point missing volume breaks the running weighted sum's meaning (it's
 * not the same as zero volume — zero would silently pull VWAP toward that
 * point's price with zero weight, which is correct; a *missing* volume is
 * unknown weight, which is not the same thing), so once any point in the
 * series lacks volume, VWAP is undefined from that point forward — this
 * propagates null rather than pretending the running sum is still valid. */
export const vwap = (points: MarketPoint[]): (number | null)[] => {
  const out: (number | null)[] = new Array(points.length).fill(null);
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let broken = false;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.volume == null || p.high == null || p.low == null) {
      broken = true;
    }
    if (broken) {
      out[i] = null;
      continue;
    }
    const typicalPrice = (p.high! + p.low! + p.close) / 3;
    cumulativePV += typicalPrice * p.volume!;
    cumulativeVolume += p.volume!;
    out[i] = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : null;
  }

  return out;
};
