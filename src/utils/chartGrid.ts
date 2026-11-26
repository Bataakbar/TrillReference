import {
  deduplicateIdxAxisTicks,
  getIdxTickSize,
  snapToIdxTick,
  type PeriodUnit,
} from '../../shared/timeframes';

export interface AxisTickLike {
  coord: number;
  value: number | string;
  text: string;
}

export interface AxisRangeLike {
  from: number;
  to: number;
  range: number;
  realFrom: number;
  realTo: number;
  realRange: number;
  displayFrom: number;
  displayTo: number;
  displayRange: number;
}

export type GridPeriodType = PeriodUnit | 'second';

export interface XGridTickOptions {
  defaultTicks: ReadonlyArray<AxisTickLike>;
  boundingWidth: number;
  bars: ReadonlyArray<{ timestamp: number }>;
  visibleFrom: number;
  visibleTo: number;
  barSpacePx: number;
  barIndexToX: (dataIndex: number) => number;
  periodType?: GridPeriodType;
  useUtc?: boolean;
}

export interface YGridTickOptions {
  defaultTicks: ReadonlyArray<AxisTickLike>;
  range: AxisRangeLike;
  boundingHeight: number;
  isIdx?: boolean;
  isLog?: boolean;
  reverse?: boolean;
  precision?: number;
}

/**
 * TradingView Canvas grid defaults: `#F0F3FA` at 5.5% alpha in dark mode so
 * horizontal and vertical hairlines sit subtly ("lebih buram") behind candles.
 */
export const TV_DARK_GRID_COLOR = 'rgba(240, 243, 250, 0.055)';
export const TV_LIGHT_GRID_COLOR = 'rgba(42, 46, 57, 0.06)';

const MIN_X_TICK_SPACING_PX = 54;
const X_EDGE_PADDING_PX = 20;
const MIN_X_LABEL_PIXEL_GAP = 38;
const TARGET_Y_ROW_PX = 46;
const MIN_Y_ROW_PX = 30;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const enum TimeWeight {
  Minute = 1,
  Hour = 2,
  Day = 3,
  Month = 4,
  Year = 5,
}

interface WeightedBarTick {
  dataIndex: number;
  timestamp: number;
  weight: TimeWeight;
  text: string;
}

interface TimeTickSourceCache {
  barsRef: ReadonlyArray<{ timestamp: number }>;
  barCount: number;
  firstTs: number;
  lastTs: number;
  endIndex: number;
  isIntraday: boolean;
  periodType: GridPeriodType;
  useUtc: boolean;
  ticksByWeight: WeightedBarTick[][];
  selectedByBetween: Map<number, WeightedBarTick[]>;
}

let cachedXTickSource: TimeTickSourceCache | null = null;

export function valueToLogarithm(value: number): number {
  return value < 0 ? -Math.log10(1 - value) : Math.log10(1 + value);
}

export function logarithmToValue(value: number): number {
  return value < 0 ? 1 - Math.pow(10, -value) : Math.pow(10, value) - 1;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isIntradayPeriod(periodType: GridPeriodType): boolean {
  return periodType === 'second' || periodType === 'minute' || periodType === 'hour';
}

function estimateBarIntervalMs(bars: ReadonlyArray<{ timestamp: number }>, isIntraday: boolean): number {
  const diffs: number[] = [];
  const start = Math.max(1, bars.length - 12);
  for (let i = start; i < bars.length; i++) {
    const d = bars[i].timestamp - bars[i - 1].timestamp;
    if (Number.isFinite(d) && d > 0) diffs.push(d);
  }
  if (diffs.length === 0) return isIntraday ? 900_000 : 86_400_000;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

function getDateParts(ts: number, useUtc: boolean) {
  const d = new Date(ts);
  if (useUtc) {
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      weekday: d.getUTCDay(),
    };
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    weekday: d.getDay(),
  };
}

function advanceProjectedTimestamp(
  prevTs: number,
  stepMs: number,
  isIntraday: boolean,
  useUtc: boolean
): number {
  let nextTs = prevTs + stepMs;
  if (!isIntraday && stepMs <= 86_400_000 * 1.5) {
    for (let guard = 0; guard < 3; guard++) {
      const wd = getDateParts(nextTs, useUtc).weekday;
      if (wd !== 0 && wd !== 6) break;
      nextTs += 86_400_000;
    }
  }
  return nextTs;
}

function classifyTimestampTick(
  ts: number,
  prevParts: ReturnType<typeof getDateParts> | null,
  isIntraday: boolean,
  periodType: GridPeriodType,
  useUtc: boolean
): { weight: TimeWeight; text: string; parts: ReturnType<typeof getDateParts> } {
  const parts = getDateParts(ts, useUtc);

  if (!prevParts || parts.year !== prevParts.year) {
    return {
      weight: prevParts ? TimeWeight.Year : isIntraday ? TimeWeight.Day : TimeWeight.Month,
      text: prevParts ? String(parts.year) : MONTH_NAMES[parts.month],
      parts,
    };
  }

  if (parts.month !== prevParts.month && periodType !== 'year') {
    return {
      weight: TimeWeight.Month,
      text: MONTH_NAMES[parts.month],
      parts,
    };
  }

  if (parts.day !== prevParts.day && periodType !== 'month' && periodType !== 'year') {
    return {
      weight: TimeWeight.Day,
      text: isIntraday ? `${pad2(parts.month + 1)}-${pad2(parts.day)}` : String(parts.day),
      parts,
    };
  }

  if (isIntraday && parts.hour !== prevParts.hour) {
    return {
      weight: TimeWeight.Hour,
      text: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
      parts,
    };
  }

  return {
    weight: isIntraday ? TimeWeight.Minute : TimeWeight.Day,
    text: isIntraday ? `${pad2(parts.hour)}:${pad2(parts.minute)}` : String(parts.day),
    parts,
  };
}

function selectWeightedTimeTicks(
  ticksByWeight: ReadonlyArray<ReadonlyArray<WeightedBarTick>>,
  tickBetweenBarCount: number
): WeightedBarTick[] {
  let selectedTicks: WeightedBarTick[] = [];

  for (let weight = TimeWeight.Year; weight >= TimeWeight.Minute; weight--) {
    const prevSelected = selectedTicks;
    selectedTicks = [];
    let prevPtr = 0;
    let leftDataIndex = -Infinity;
    let rightDataIndex = Infinity;
    const currentTicks = ticksByWeight[weight];

    for (const tick of currentTicks) {
      while (prevPtr < prevSelected.length) {
        const prevTick = prevSelected[prevPtr];
        if (prevTick.dataIndex < tick.dataIndex) {
          selectedTicks.push(prevTick);
          prevPtr++;
          leftDataIndex = prevTick.dataIndex;
          rightDataIndex = Infinity;
        } else {
          rightDataIndex = prevTick.dataIndex;
          break;
        }
      }

      if (
        tick.dataIndex - leftDataIndex >= tickBetweenBarCount &&
        rightDataIndex - tick.dataIndex >= tickBetweenBarCount
      ) {
        selectedTicks.push(tick);
        leftDataIndex = tick.dataIndex;
      }
    }

    for (; prevPtr < prevSelected.length; prevPtr++) {
      selectedTicks.push(prevSelected[prevPtr]);
    }
  }

  return selectedTicks;
}

/**
 * Generates TradingView-aligned X-axis ticks anchored strictly to real candlestick
 * timestamps (1 vertical grid line per time label, dynamically splitting into
 * hours/days/bars on zoom-in and thinning to months/years on zoom-out).
 */
export function buildTradingViewXTicks(options: XGridTickOptions): AxisTickLike[] {
  const {
    defaultTicks,
    boundingWidth,
    bars,
    visibleFrom,
    visibleTo,
    barSpacePx,
    barIndexToX,
    periodType = 'day',
    useUtc = false,
  } = options;

  if (
    !bars.length ||
    !Number.isFinite(boundingWidth) ||
    boundingWidth <= 0 ||
    !Number.isFinite(barSpacePx) ||
    barSpacePx <= 0
  ) {
    return [...defaultTicks];
  }

  const isIntraday = isIntradayPeriod(periodType);
  const firstTs = bars[0].timestamp;
  const lastTs = bars[bars.length - 1].timestamp;
  const requiredEndIndex = Math.max(bars.length - 1, Math.ceil(visibleTo) + 8);

  const cacheInvalid =
    !cachedXTickSource ||
    cachedXTickSource.barsRef !== bars ||
    cachedXTickSource.barCount !== bars.length ||
    cachedXTickSource.firstTs !== firstTs ||
    cachedXTickSource.lastTs !== lastTs ||
    cachedXTickSource.isIntraday !== isIntraday ||
    cachedXTickSource.periodType !== periodType ||
    cachedXTickSource.useUtc !== useUtc ||
    cachedXTickSource.endIndex < requiredEndIndex;

  if (cacheInvalid) {
    const endIndex = Math.max(bars.length + 120, requiredEndIndex + 60);
    const ticksByWeight: WeightedBarTick[][] = Array.from(
      { length: TimeWeight.Year + 1 },
      () => []
    );
    const stepMs = estimateBarIntervalMs(bars, isIntraday);

    let prevParts: ReturnType<typeof getDateParts> | null = null;
    let projectedTs = lastTs;

    for (let idx = 0; idx <= endIndex; idx++) {
      let ts: number;
      if (idx < bars.length) {
        ts = bars[idx].timestamp;
      } else {
        projectedTs = advanceProjectedTimestamp(projectedTs, stepMs, isIntraday, useUtc);
        ts = projectedTs;
      }
      if (!Number.isFinite(ts)) continue;
      const classified = classifyTimestampTick(ts, prevParts, isIntraday, periodType, useUtc);
      prevParts = classified.parts;
      ticksByWeight[classified.weight].push({
        dataIndex: idx,
        timestamp: ts,
        weight: classified.weight,
        text: classified.text,
      });
    }

    cachedXTickSource = {
      barsRef: bars,
      barCount: bars.length,
      firstTs,
      lastTs,
      endIndex,
      isIntraday,
      periodType,
      useUtc,
      ticksByWeight,
      selectedByBetween: new Map(),
    };
  }

  const tickBetweenBarCount = Math.max(1, Math.ceil(MIN_X_TICK_SPACING_PX / barSpacePx));
  let selected = cachedXTickSource!.selectedByBetween.get(tickBetweenBarCount);
  if (!selected) {
    selected = selectWeightedTimeTicks(cachedXTickSource!.ticksByWeight, tickBetweenBarCount);
    cachedXTickSource!.selectedByBetween.set(tickBetweenBarCount, selected);
  }

  const minIdx = Math.max(0, Math.floor(visibleFrom) - 1);
  const maxIdx = Math.ceil(visibleTo) + 1;
  const out: AxisTickLike[] = [];
  let lastCoord = -Infinity;

  for (const tick of selected) {
    if (tick.dataIndex < minIdx) continue;
    if (tick.dataIndex > maxIdx) break;
    const coord = barIndexToX(tick.dataIndex);
    if (!Number.isFinite(coord)) continue;
    if (coord < X_EDGE_PADDING_PX || coord > boundingWidth - X_EDGE_PADDING_PX) continue;
    if (coord - lastCoord < MIN_X_LABEL_PIXEL_GAP) continue;
    lastCoord = coord;
    out.push({
      coord,
      value: tick.timestamp,
      text: tick.text,
    });
  }

  return out;
}

const NICE_PRICE_MULTIPLIERS = [1, 2, 2.5, 4, 5, 10] as const;

export function pickTradingViewPriceStep(
  displayRange: number,
  boundingHeight: number,
  isIdx: boolean,
  midPrice?: number
): number {
  const targetCount = Math.max(2, Math.min(20, Math.round(boundingHeight / TARGET_Y_ROW_PX)));
  const rawStep = displayRange / targetCount;
  if (!Number.isFinite(rawStep) || rawStep <= 0) return isIdx ? 10 : 1;

  const minIdxTick =
    isIdx && typeof midPrice === 'number' && Number.isFinite(midPrice)
      ? getIdxTickSize(Math.max(1, midPrice))
      : 1;

  const minExponent = Math.floor(Math.log10(rawStep));
  let bestStep = Math.pow(10, minExponent + 1);
  let bestScore = Infinity;

  for (let exp = minExponent - 1; exp <= minExponent + 2; exp++) {
    const base = Math.pow(10, exp);
    for (const mult of NICE_PRICE_MULTIPLIERS) {
      const candidate = Number((mult * base).toPrecision(6));
      if (isIdx && candidate < minIdxTick) continue;
      if (isIdx && candidate > 1 && !Number.isInteger(candidate)) continue;
      if (isIdx && candidate % minIdxTick !== 0) continue;
      const rowPx = (candidate / displayRange) * boundingHeight;
      if (rowPx < MIN_Y_ROW_PX) continue;
      const score = Math.abs(rowPx - TARGET_Y_ROW_PX);
      if (score < bestScore) {
        bestScore = score;
        bestStep = candidate;
      }
    }
  }

  return isIdx ? Math.max(minIdxTick, Math.round(bestStep)) : bestStep;
}

function inferStepPrecision(step: number, explicitPrecision?: number): number {
  const str = step.toString();
  const eIdx = str.indexOf('e-');
  let stepDec = 0;
  if (eIdx !== -1) {
    stepDec = Number(str.slice(eIdx + 2));
  } else {
    const dotIdx = str.indexOf('.');
    if (dotIdx !== -1) stepDec = str.length - dotIdx - 1;
  }
  return Math.min(6, Math.max(explicitPrecision ?? 0, stepDec));
}

function formatYPriceLabel(val: number, isIdx: boolean, decimals: number): string {
  if (!Number.isFinite(val)) return '';
  if (isIdx) {
    return Math.round(val).toLocaleString('en-US');
  }
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function valueToYPixel(
  value: number,
  range: AxisRangeLike,
  boundingHeight: number,
  isLog: boolean,
  reverse: boolean
): number {
  const realValue = isLog ? valueToLogarithm(value) : value;
  const rate = (realValue - range.realFrom) / range.realRange;
  return reverse ? Math.round(rate * boundingHeight) : Math.round((1 - rate) * boundingHeight);
}

/**
 * Generates TradingView-aligned Y-axis price ticks (1 horizontal grid line per
 * clean 1-2-2.5-4-5-10 price tick, obeying IDX BEI fraksi rules and adapting
 * smoothly as the user scales Y up or down).
 */
export function buildTradingViewYTicks(options: YGridTickOptions): AxisTickLike[] {
  const {
    defaultTicks,
    range,
    boundingHeight,
    isIdx = false,
    isLog = false,
    reverse = false,
    precision,
  } = options;

  if (
    !Number.isFinite(boundingHeight) ||
    boundingHeight <= 0 ||
    !Number.isFinite(range.displayRange) ||
    range.displayRange <= 0 ||
    !Number.isFinite(range.realRange) ||
    range.realRange === 0
  ) {
    return isIdx ? deduplicateIdxAxisTicks(defaultTicks) : [...defaultTicks];
  }

  const candidateValues: number[] = [];
  let decimals = isIdx ? 0 : Math.min(6, precision ?? 2);

  if (isLog && range.displayFrom > 0 && range.displayTo / range.displayFrom > 2.2) {
    // Multi-decade log scale: canonical [1, 2, 2.5, 5] * 10^exp
    const minExp = Math.floor(Math.log10(range.displayFrom)) - 1;
    const maxExp = Math.ceil(Math.log10(range.displayTo)) + 1;
    const logMults = [1, 2, 2.5, 5];
    for (let exp = minExp; exp <= maxExp; exp++) {
      const base = Math.pow(10, exp);
      for (const m of logMults) {
        const val = Number((m * base).toPrecision(6));
        if (val >= range.displayFrom && val <= range.displayTo) {
          candidateValues.push(val);
        }
      }
    }
    decimals = isIdx ? 0 : Math.min(4, precision ?? 2);
  } else {
    const midPrice = (range.displayFrom + range.displayTo) / 2;
    const step = pickTradingViewPriceStep(range.displayRange, boundingHeight, isIdx, midPrice);
    decimals = isIdx ? 0 : inferStepPrecision(step, precision);
    const first = Math.ceil(range.displayFrom / step) * step;
    const last = Math.floor(range.displayTo / step) * step;

    for (let i = 0; i < 80; i++) {
      const raw = first + step * i;
      if (raw > last + step * 1e-6) break;
      candidateValues.push(Number(raw.toFixed(Math.max(0, decimals + 2))));
    }
  }

  const out: AxisTickLike[] = [];
  let prevY = NaN;
  const minEdge = 12;
  const maxEdge = boundingHeight - 12;

  for (const rawVal of candidateValues) {
    const finalVal = isIdx ? snapToIdxTick(rawVal) : rawVal;
    const y = valueToYPixel(finalVal, range, boundingHeight, isLog, reverse);
    if (y < minEdge || y > maxEdge) continue;
    if (Number.isFinite(prevY) && Math.abs(prevY - y) < 28) continue;
    prevY = y;
    out.push({
      coord: y,
      value: finalVal,
      text: formatYPriceLabel(finalVal, isIdx, decimals),
    });
  }

  return isIdx ? deduplicateIdxAxisTicks(out) : out;
}
