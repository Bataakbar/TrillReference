export type MovingAverageType = 'EMA' | 'SMA' | 'WMA' | 'RMA' | 'HMA' | 'VWMA';
export type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';

export interface OHLCVSourceBar {
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
