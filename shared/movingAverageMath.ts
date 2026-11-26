export type MovingAverageType = 'EMA' | 'SMA' | 'WMA' | 'RMA' | 'HMA' | 'VWMA';
export type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';

export interface OHLCVSourceBar {
  timestamp?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function extractSourceValue(bar: OHLCVSourceBar, source: PriceSource): number {
  switch (source) {
    case 'open':
      return bar.open;
    case 'high':
      return bar.high;
    case 'low':
      return bar.low;
    case 'hl2':
      return (bar.high + bar.low) / 2;
    case 'hlc3':
      return (bar.high + bar.low + bar.close) / 3;
    case 'ohlc4':
      return (bar.open + bar.high + bar.low + bar.close) / 4;
    case 'close':
    default:
      return bar.close;
  }
}

export function calcSMA(
  values: Array<number | undefined>,
  length: number
): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (length <= 0) return result;
  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== undefined) {
      sum += v;
      validCount++;
    }
    if (i >= length) {
      const removed = values[i - length];
      if (removed !== undefined) {
        sum -= removed;
        validCount--;
      }
    }
    if (i >= length - 1 && validCount === length) {
      result[i] = sum / length;
    }
  }
  return result;
}

export function calcEMA(
  values: Array<number | undefined>,
  length: number
): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (length <= 0) return result;
  const k = 2 / (length + 1);
  let ema: number | undefined;
  let seedSum = 0;
  let seedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === undefined) continue;
    if (ema === undefined) {
      seedSum += v;
      seedCount++;
      if (seedCount === length) {
        ema = seedSum / length;
        result[i] = ema;
      }
    } else {
      ema = v * k + ema * (1 - k);
      result[i] = ema;
    }
  }
  return result;
}

export function calcWMA(
  values: Array<number | undefined>,
  length: number
): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (length <= 0) return result;
  const denom = (length * (length + 1)) / 2;

  for (let i = length - 1; i < values.length; i++) {
    let weightedSum = 0;
    let complete = true;
    for (let j = 0; j < length; j++) {
      const v = values[i - j];
      if (v === undefined) {
        complete = false;
        break;
      }
      weightedSum += v * (length - j);
    }
    if (complete) {
      result[i] = weightedSum / denom;
    }
  }
  return result;
}

export function calcRMA(
  values: Array<number | undefined>,
  length: number
): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(values.length).fill(undefined);
  if (length <= 0) return result;
  let rma: number | undefined;
  let seedSum = 0;
  let seedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === undefined) continue;
    if (rma === undefined) {
      seedSum += v;
      seedCount++;
      if (seedCount === length) {
        rma = seedSum / length;
        result[i] = rma;
      }
    } else {
      rma = (rma * (length - 1) + v) / length;
      result[i] = rma;
    }
  }
  return result;
}

function calcHMA(values: Array<number | undefined>, length: number): Array<number | undefined> {
  const halfLen = Math.max(1, Math.floor(length / 2));
  const sqrtLen = Math.max(1, Math.round(Math.sqrt(length)));
  const wmaHalf = calcWMA(values, halfLen);
  const wmaFull = calcWMA(values, length);
  const diff: Array<number | undefined> = values.map((_, i) =>
    wmaHalf[i] !== undefined && wmaFull[i] !== undefined
      ? 2 * (wmaHalf[i] as number) - (wmaFull[i] as number)
      : undefined
  );
  return calcWMA(diff, sqrtLen);
}

function calcVWMA(
  bars: OHLCVSourceBar[],
  source: PriceSource,
  length: number
): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(bars.length).fill(undefined);
  if (length <= 0) return result;

  for (let i = length - 1; i < bars.length; i++) {
    let pvSum = 0;
    let volSum = 0;
    for (let j = 0; j < length; j++) {
      const bar = bars[i - j];
      const v = extractSourceValue(bar, source);
      const vol = bar.volume ?? 0;
      pvSum += v * vol;
      volSum += vol;
    }
    if (volSum > 0) {
      result[i] = pvSum / volSum;
    } else {
      let s = 0;
      for (let j = 0; j < length; j++) s += extractSourceValue(bars[i - j], source);
      result[i] = s / length;
    }
  }
  return result;
}

export function calcMovingAverageSeries(
  bars: OHLCVSourceBar[],
  maType: MovingAverageType,
  length: number,
  source: PriceSource = 'close',
  offset = 0
): Array<number | undefined> {
  const safeLen = Math.max(1, Math.round(length));
  const values = bars.map((bar) => extractSourceValue(bar, source));

  let raw: Array<number | undefined>;
  switch (maType) {
    case 'SMA':
      raw = calcSMA(values, safeLen);
      break;
    case 'WMA':
      raw = calcWMA(values, safeLen);
      break;
    case 'RMA':
      raw = calcRMA(values, safeLen);
      break;
    case 'HMA':
      raw = calcHMA(values, safeLen);
      break;
    case 'VWMA':
      raw = calcVWMA(bars, source, safeLen);
      break;
    case 'EMA':
    default:
      raw = calcEMA(values, safeLen);
      break;
  }

  const intOffset = Math.trunc(offset);
  if (intOffset === 0) return raw;

  const shifted: Array<number | undefined> = new Array(bars.length).fill(undefined);
  for (let i = 0; i < raw.length; i++) {
    const targetIdx = i + intOffset;
    if (targetIdx >= 0 && targetIdx < shifted.length) {
      shifted[targetIdx] = raw[i];
    }
  }
  return shifted;
}

/**
 * Computes Wilder's Average True Range (ATR) using RMA smoothing over True Range,
 * matching TradingView's built-in `ta.atr(length)`.
 */
export function calcATRSeries(
  bars: OHLCVSourceBar[],
  length = 14
): Array<number | undefined> {
  const safeLen = Math.max(1, Math.round(length));
  if (bars.length === 0) return [];
  const trValues: Array<number | undefined> = bars.map((bar, i) => {
    const hl = bar.high - bar.low;
    if (i === 0) return hl;
    const prevClose = bars[i - 1].close;
    return Math.max(hl, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
  });
  return calcRMA(trValues, safeLen);
}

export interface SupertrendPoint {
  value?: number;
  direction?: 1 | -1;
}

/**
 * Computes TradingView's classic Supertrend trend-following trailing band
 * (`hl2 ± multiplier * ATR(period)`). Direction `1` = bullish green support, `-1` = bearish red resistance.
 */
export function calcSupertrendSeries(
  bars: OHLCVSourceBar[],
  period = 10,
  multiplier = 3
): SupertrendPoint[] {
  const safePeriod = Math.max(1, Math.round(period));
  const safeMult = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 3;
  const atr = calcATRSeries(bars, safePeriod);
  const result: SupertrendPoint[] = new Array(bars.length).fill({});

  let prevFinalUpper: number | undefined;
  let prevFinalLower: number | undefined;
  let prevDir: 1 | -1 = 1;

  for (let i = 0; i < bars.length; i++) {
    const atrVal = atr[i];
    if (atrVal === undefined || !Number.isFinite(atrVal)) {
      result[i] = {};
      continue;
    }

    const bar = bars[i];
    const hl2 = (bar.high + bar.low) / 2;
    const basicUpper = hl2 + safeMult * atrVal;
    const basicLower = hl2 - safeMult * atrVal;

    if (prevFinalUpper === undefined || prevFinalLower === undefined) {
      prevFinalUpper = basicUpper;
      prevFinalLower = basicLower;
      prevDir = bar.close >= hl2 ? 1 : -1;
      result[i] = {
        value: prevDir === 1 ? prevFinalLower : prevFinalUpper,
        direction: prevDir,
      };
      continue;
    }

    const prevClose = bars[i - 1].close;
    const finalUpper =
      basicUpper < prevFinalUpper || prevClose > prevFinalUpper ? basicUpper : prevFinalUpper;
    const finalLower =
      basicLower > prevFinalLower || prevClose < prevFinalLower ? basicLower : prevFinalLower;

    let nextDir: 1 | -1 = prevDir;
    if (prevDir === 1 && bar.close < finalLower) {
      nextDir = -1;
    } else if (prevDir === -1 && bar.close > finalUpper) {
      nextDir = 1;
    }

    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevDir = nextDir;

    result[i] = {
      value: nextDir === 1 ? finalLower : finalUpper,
      direction: nextDir,
    };
  }

  return result;
}

export type VwapAnchorMode = 'session' | 'week';

function getVwapBucketKey(timestamp: number | undefined, anchor: VwapAnchorMode): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return 'all';
  const d = new Date(timestamp);
  if (anchor === 'week') {
    const utcDay = d.getUTCDay();
    const diffToMonday = (utcDay + 6) % 7;
    const mondayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday);
    return String(mondayMs);
  }
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

/**
 * Computes Volume Weighted Average Price (`Σ(HLC3 * Volume) / Σ(Volume)`)
 * resetting at each daily session (`session`) or Monday week boundary (`week`).
 */
export function calcVWAPSeries(
  bars: OHLCVSourceBar[],
  anchor: VwapAnchorMode = 'session'
): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(bars.length).fill(undefined);
  let activeBucket: string | null = null;
  let cumPV = 0;
  let cumVol = 0;
  let cumPriceFallback = 0;
  let fallbackCount = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const bucket = getVwapBucketKey(bar.timestamp, anchor);
    if (bucket !== activeBucket) {
      activeBucket = bucket;
      cumPV = 0;
      cumVol = 0;
      cumPriceFallback = 0;
      fallbackCount = 0;
    }

    const typical = (bar.high + bar.low + bar.close) / 3;
    const vol = typeof bar.volume === 'number' && Number.isFinite(bar.volume) && bar.volume > 0 ? bar.volume : 0;

    cumPV += typical * vol;
    cumVol += vol;
    cumPriceFallback += typical;
    fallbackCount++;

    result[i] = cumVol > 0 ? cumPV / cumVol : cumPriceFallback / fallbackCount;
  }

  return result;
}

/**
 * Transforms standard OHLCV bars into smoothed Heikin Ashi candlesticks while
 * preserving timestamps and volumes cleanly.
 */
export function computeHeikinAshiBars<T extends OHLCVSourceBar>(bars: T[]): T[] {
  const output: T[] = [];
  let prevHaOpen = 0;
  let prevHaClose = 0;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen = i === 0 ? (b.open + b.close) / 2 : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(b.high, haOpen, haClose);
    const haLow = Math.min(b.low, haOpen, haClose);

    output.push({
      ...b,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    });

    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }

  return output;
}
