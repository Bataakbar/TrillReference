export type YahooInterval =
  | '1m'
  | '2m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '90m'
  | '1d'
  | '5d'
  | '1wk'
  | '1mo'
  | '3mo';

export type TimeframeGroup = 'minutes' | 'hours' | 'days';

export type PeriodUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface ChartPeriod {
  span: number;
  type: PeriodUnit;
}

export interface TimeframeDefinition {
  key: string;
  label: string;
  fullLabel: string;
  group: TimeframeGroup;
  quickBar: boolean;
  yfInterval: YahooInterval;
  /** Number of calendar days loaded on initial chart open (~250-500+ bars). */
  initialDays: number;
  /** Number of calendar days loaded per backward scroll-left chunk. */
  chunkDays: number;
  /** Hard Yahoo lookback limit in days from now, or null when history goes back to IPO. */
  daysBack: number | null;
  maxDaysPerRequest?: number;
  resampleMs: number | 'SIX_MONTHS' | 'YEAR' | null;
  period: ChartPeriod;
}

export interface FetchWindow {
  period1: Date;
  period2: Date;
}

export interface OHLCVBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RawYahooQuote {
  date?: Date | string | number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

export interface QuoteSummaryInput {
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  chartPreviousClose?: number | null;
  previousClose?: number | null;
  regularMarketDayHigh?: number | null;
  regularMarketDayLow?: number | null;
  regularMarketVolume?: number | null;
  isIntraday?: boolean;
}

export interface ComputedQuoteSummary {
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
}

/**
 * Complete 18-timeframe matrix matching TradingView's Minutes / Hours / Days menu,
 * combining native Yahoo Finance intervals with deterministic OHLCV resampling
 * for 3m, 10m, 45m, 2h, 3h, 4h, 6mo, and 12mo (1y).
 */
export const TIMEFRAMES: readonly TimeframeDefinition[] = [
  {
    key: '1m',
    label: '1m',
    fullLabel: '1 minute',
    group: 'minutes',
    quickBar: false,
    yfInterval: '1m',
    initialDays: 6,
    chunkDays: 6,
    daysBack: 29.5,
    maxDaysPerRequest: 7,
    resampleMs: null,
    period: { span: 1, type: 'minute' },
  },
  {
    key: '2m',
    label: '2m',
    fullLabel: '2 minutes',
    group: 'minutes',
    quickBar: false,
    yfInterval: '2m',
    initialDays: 12,
    chunkDays: 15,
    daysBack: 58,
    resampleMs: null,
    period: { span: 2, type: 'minute' },
  },
  {
    key: '3m',
    label: '3m',
    fullLabel: '3 minutes',
    group: 'minutes',
    quickBar: false,
    yfInterval: '1m',
    initialDays: 6,
    chunkDays: 6,
    daysBack: 29.5,
    maxDaysPerRequest: 7,
    resampleMs: 3 * 60 * 1000,
    period: { span: 3, type: 'minute' },
  },
  {
    key: '5m',
    label: '5m',
    fullLabel: '5 minutes',
    group: 'minutes',
    quickBar: true,
    yfInterval: '5m',
    initialDays: 12,
    chunkDays: 15,
    daysBack: 58,
    resampleMs: null,
    period: { span: 5, type: 'minute' },
  },
  {
    key: '10m',
    label: '10m',
    fullLabel: '10 minutes',
    group: 'minutes',
    quickBar: false,
    yfInterval: '5m',
    initialDays: 18,
    chunkDays: 20,
    daysBack: 58,
    resampleMs: 10 * 60 * 1000,
    period: { span: 10, type: 'minute' },
  },
  {
    key: '15m',
    label: '15m',
    fullLabel: '15 minutes',
    group: 'minutes',
    quickBar: false,
    yfInterval: '15m',
    initialDays: 20,
    chunkDays: 20,
    daysBack: 58,
    resampleMs: null,
    period: { span: 15, type: 'minute' },
  },
  {
    key: '30m',
    label: '30m',
    fullLabel: '30 minutes',
    group: 'minutes',
    quickBar: true,
    yfInterval: '30m',
    initialDays: 30,
    chunkDays: 28,
    daysBack: 58,
    resampleMs: null,
    period: { span: 30, type: 'minute' },
  },
  {
    key: '45m',
    label: '45m',
    fullLabel: '45 minutes',
    group: 'minutes',
    quickBar: true,
    yfInterval: '15m',
    initialDays: 35,
    chunkDays: 23,
    daysBack: 58,
    resampleMs: 45 * 60 * 1000,
    period: { span: 45, type: 'minute' },
  },
  {
    key: '1h',
    label: '1H',
    fullLabel: '1 hour',
    group: 'hours',
    quickBar: false,
    yfInterval: '60m',
    initialDays: 90,
    chunkDays: 120,
    daysBack: 720,
    resampleMs: null,
    period: { span: 1, type: 'hour' },
  },
  {
    key: '2h',
    label: '2H',
    fullLabel: '2 hours',
    group: 'hours',
    quickBar: true,
    yfInterval: '60m',
    initialDays: 150,
    chunkDays: 180,
    daysBack: 720,
    resampleMs: 2 * 60 * 60 * 1000,
    period: { span: 2, type: 'hour' },
  },
  {
    key: '3h',
    label: '3H',
    fullLabel: '3 hours',
    group: 'hours',
    quickBar: false,
    yfInterval: '60m',
    initialDays: 180,
    chunkDays: 180,
    daysBack: 720,
    resampleMs: 3 * 60 * 60 * 1000,
    period: { span: 3, type: 'hour' },
  },
  {
    key: '4h',
    label: '4H',
    fullLabel: '4 hours',
    group: 'hours',
    quickBar: true,
    yfInterval: '60m',
    initialDays: 240,
    chunkDays: 240,
    daysBack: 720,
    resampleMs: 4 * 60 * 60 * 1000,
    period: { span: 4, type: 'hour' },
  },
  {
    key: '1d',
    label: '1D',
    fullLabel: '1 day',
    group: 'days',
    quickBar: true,
    yfInterval: '1d',
    initialDays: 550,
    chunkDays: 730,
    daysBack: null,
    resampleMs: null,
    period: { span: 1, type: 'day' },
  },
  {
    key: '1wk',
    label: '1W',
    fullLabel: '1 week',
    group: 'days',
    quickBar: true,
    yfInterval: '1wk',
    initialDays: 2190,
    chunkDays: 3650,
    daysBack: null,
    resampleMs: null,
    period: { span: 1, type: 'week' },
  },
  {
    key: '1mo',
    label: '1M',
    fullLabel: '1 month',
    group: 'days',
    quickBar: true,
    yfInterval: '1mo',
    initialDays: 7300,
    chunkDays: 14600,
    daysBack: null,
    resampleMs: null,
    period: { span: 1, type: 'month' },
  },
  {
    key: '3mo',
    label: '3M',
    fullLabel: '3 months',
    group: 'days',
    quickBar: false,
    yfInterval: '3mo',
    initialDays: 10950,
    chunkDays: 14600,
    daysBack: null,
    resampleMs: null,
    period: { span: 3, type: 'month' },
  },
  {
    key: '6mo',
    label: '6M',
    fullLabel: '6 months',
    group: 'days',
    quickBar: false,
    yfInterval: '1mo',
    initialDays: 10950,
    chunkDays: 14600,
    daysBack: null,
    resampleMs: 'SIX_MONTHS',
    period: { span: 6, type: 'month' },
  },
  {
    key: '1y',
    label: '12M',
    fullLabel: '12 months',
    group: 'days',
    quickBar: false,
    yfInterval: '1mo',
    initialDays: 14600,
    chunkDays: 14600,
    daysBack: null,
    resampleMs: 'YEAR',
    period: { span: 1, type: 'year' },
  },
];

const TIMEFRAME_MAP = new Map<string, TimeframeDefinition>(
  TIMEFRAMES.map((tf) => [tf.key, tf])
);

export function getTimeframeByKey(key: string): TimeframeDefinition | undefined {
  return TIMEFRAME_MAP.get(key);
}

export function periodToTimeframeKey(period: { span: number; type: string }): string {
  const match = TIMEFRAMES.find(
    (tf) => tf.period.span === period.span && tf.period.type === period.type
  );
  return match ? match.key : '1d';
}

const SYMBOL_REGEX = /^[A-Z0-9.\-^=]{1,20}$/;

export function normalizeAndValidateSymbol(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase();
  if (!SYMBOL_REGEX.test(cleaned)) return null;
  return cleaned;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Splits a total lookback into contiguous Yahoo Finance request windows ordered
 * newest-first. Used when totalDaysBack exceeds Yahoo's per-request cap (e.g.
 * 1m data allows up to 7 days per request across a 30-day retention horizon).
 */
export function buildFetchWindows(
  nowMs: number,
  totalDaysBack: number,
  maxDaysPerRequest?: number
): FetchWindow[] {
  const safeTotal = Math.max(totalDaysBack, 0.01);
  if (!maxDaysPerRequest || maxDaysPerRequest <= 0 || safeTotal <= maxDaysPerRequest) {
    return [
      {
        period1: new Date(nowMs - safeTotal * DAY_MS),
        period2: new Date(nowMs),
      },
    ];
  }

  const windows: FetchWindow[] = [];
  let cursorEndDaysAgo = 0;

  while (cursorEndDaysAgo < safeTotal - 1e-9) {
    const nextStartDaysAgo = Math.min(cursorEndDaysAgo + maxDaysPerRequest, safeTotal);
    windows.push({
      period1: new Date(nowMs - nextStartDaysAgo * DAY_MS),
      period2: new Date(nowMs - cursorEndDaysAgo * DAY_MS),
    });
    cursorEndDaysAgo = nextStartDaysAgo;
  }

  return windows;
}

export interface PaginatedRangePlan {
  isInitial: boolean;
  exhausted: boolean;
  windowStartMs: number;
  windowEndMs: number;
  fetchStartMs: number;
  fetchEndMs: number;
  hasMoreBeforeStart: boolean;
  nextCursor: number | null;
}

export function parseFirstTradeDateMs(raw: unknown): number | null {
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.abs(raw) < 1e11 ? raw * 1000 : raw;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function alignBucketBoundary(
  tsMs: number,
  resampleMs: TimeframeDefinition['resampleMs'],
  mode: 'floor' | 'ceil'
): number {
  if (resampleMs === 'YEAR') {
    const d = new Date(tsMs);
    const floorTs = Date.UTC(d.getUTCFullYear(), 0, 1);
    if (mode === 'floor' || tsMs === floorTs) return floorTs;
    return Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  }
  if (resampleMs === 'SIX_MONTHS') {
    const d = new Date(tsMs);
    const startMonth = d.getUTCMonth() < 6 ? 0 : 6;
    const floorTs = Date.UTC(d.getUTCFullYear(), startMonth, 1);
    if (mode === 'floor' || tsMs === floorTs) return floorTs;
    return startMonth === 0
      ? Date.UTC(d.getUTCFullYear(), 6, 1)
      : Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  }
  if (typeof resampleMs === 'number' && resampleMs > 0) {
    return mode === 'floor'
      ? Math.floor(tsMs / resampleMs) * resampleMs
      : Math.ceil(tsMs / resampleMs) * resampleMs;
  }
  return Math.trunc(tsMs);
}

function getFetchPaddingMs(cfg: TimeframeDefinition): number {
  if (cfg.resampleMs === 'YEAR' || cfg.yfInterval === '3mo') return 3 * DAY_MS;
  if (cfg.resampleMs === 'SIX_MONTHS' || cfg.yfInterval === '1mo' || cfg.yfInterval === '1wk') {
    return 2 * DAY_MS;
  }
  if (cfg.yfInterval === '1d') return DAY_MS;
  if (typeof cfg.resampleMs === 'number') return cfg.resampleMs;
  return 60 * 1000;
}

function getIpoMarginMs(cfg: TimeframeDefinition): number {
  if (cfg.resampleMs === 'YEAR' || cfg.yfInterval === '3mo') return 400 * DAY_MS;
  if (cfg.resampleMs === 'SIX_MONTHS') return 190 * DAY_MS;
  if (cfg.yfInterval === '1mo') return 35 * DAY_MS;
  if (cfg.yfInterval === '1wk') return 10 * DAY_MS;
  return 2 * DAY_MS;
}

export function hasReachedEarliestHistory(params: {
  windowStartMs: number;
  cfg: TimeframeDefinition;
  nowMs: number;
  firstTradeMs?: number | null;
}): boolean {
  const { windowStartMs, cfg, nowMs, firstTradeMs } = params;
  if (cfg.daysBack !== null) {
    const hardFloor = alignBucketBoundary(nowMs - cfg.daysBack * DAY_MS, cfg.resampleMs, 'ceil');
    if (windowStartMs <= hardFloor + 60_000) {
      return true;
    }
  } else if (windowStartMs <= Date.UTC(1950, 0, 1) + 60_000) {
    return true;
  }

  if (typeof firstTradeMs === 'number' && Number.isFinite(firstTradeMs)) {
    const ipoBoundary = firstTradeMs - getIpoMarginMs(cfg);
    if (windowStartMs <= ipoBoundary) {
      return true;
    }
  }

  return false;
}

export function computePaginatedRange(params: {
  cfg: TimeframeDefinition;
  nowMs: number;
  beforeCursorMs?: number | null;
  firstTradeMs?: number | null;
}): PaginatedRangePlan {
  const { cfg, nowMs, beforeCursorMs, firstTradeMs } = params;
  const isInitial = !(typeof beforeCursorMs === 'number' && Number.isFinite(beforeCursorMs));
  const windowEndMs = isInitial ? nowMs : Math.min(nowMs, Math.trunc(beforeCursorMs!));

  const rawMinFloorMs =
    cfg.daysBack !== null
      ? alignBucketBoundary(nowMs - cfg.daysBack * DAY_MS, cfg.resampleMs, 'ceil')
      : Date.UTC(1950, 0, 1);

  const ipoBoundMs =
    typeof firstTradeMs === 'number' && Number.isFinite(firstTradeMs)
      ? alignBucketBoundary(firstTradeMs - getIpoMarginMs(cfg), cfg.resampleMs, 'floor')
      : null;

  const effectiveFloorMs =
    ipoBoundMs !== null ? Math.max(rawMinFloorMs, ipoBoundMs) : rawMinFloorMs;

  if (!isInitial && windowEndMs <= effectiveFloorMs + 1000) {
    return {
      isInitial: false,
      exhausted: true,
      windowStartMs: windowEndMs,
      windowEndMs,
      fetchStartMs: windowEndMs,
      fetchEndMs: windowEndMs,
      hasMoreBeforeStart: false,
      nextCursor: null,
    };
  }

  const spanDays = isInitial ? cfg.initialDays : cfg.chunkDays;
  const rawStartMs = windowEndMs - spanDays * DAY_MS;
  const alignedStartMs = alignBucketBoundary(rawStartMs, cfg.resampleMs, 'floor');

  const hitFloor = alignedStartMs <= effectiveFloorMs;
  const windowStartMs = hitFloor ? effectiveFloorMs : alignedStartMs;
  const padMs = getFetchPaddingMs(cfg);

  const minFetchAllowed =
    cfg.daysBack !== null ? nowMs - cfg.daysBack * DAY_MS : Date.UTC(1950, 0, 1);
  let fetchStartMs = Math.max(minFetchAllowed, windowStartMs - padMs);
  const fetchEndMs = isInitial ? nowMs : Math.min(nowMs, windowEndMs + padMs);

  // Never let padded Yahoo window exceed Yahoo's per-request span limit (e.g. 7d for 1m)
  if (cfg.maxDaysPerRequest && cfg.maxDaysPerRequest > 0) {
    const maxSpanMs = cfg.maxDaysPerRequest * DAY_MS - 60_000;
    if (fetchEndMs - fetchStartMs > maxSpanMs) {
      fetchStartMs = Math.max(minFetchAllowed, Math.min(windowStartMs, fetchEndMs - maxSpanMs));
    }
  }

  if (fetchEndMs - fetchStartMs < 2000) {
    return {
      isInitial,
      exhausted: true,
      windowStartMs,
      windowEndMs,
      fetchStartMs,
      fetchEndMs,
      hasMoreBeforeStart: false,
      nextCursor: null,
    };
  }

  return {
    isInitial,
    exhausted: false,
    windowStartMs,
    windowEndMs,
    fetchStartMs,
    fetchEndMs,
    hasMoreBeforeStart: !hitFloor,
    nextCursor: hitFloor ? null : windowStartMs,
  };
}

export function buildFetchWindowsForRange(
  startMs: number,
  endMs: number,
  maxDaysPerRequest?: number
): FetchWindow[] {
  const safeEnd = Math.max(endMs, startMs + 2000);
  if (!maxDaysPerRequest || maxDaysPerRequest <= 0) {
    return [{ period1: new Date(startMs), period2: new Date(safeEnd) }];
  }
  const chunkMs = maxDaysPerRequest * DAY_MS;
  if (safeEnd - startMs <= chunkMs) {
    return [{ period1: new Date(startMs), period2: new Date(safeEnd) }];
  }
  const windows: FetchWindow[] = [];
  let cursorEnd = safeEnd;
  while (cursorEnd > startMs + 1000) {
    const nextStart = Math.max(startMs, cursorEnd - chunkMs);
    windows.push({
      period1: new Date(nextStart),
      period2: new Date(cursorEnd),
    });
    cursorEnd = nextStart;
  }
  return windows;
}

export function normalizeQuotesToBars(quotes: RawYahooQuote[]): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  for (const q of quotes) {
    if (!q || q.date == null) continue;
    if (
      typeof q.open !== 'number' ||
      typeof q.high !== 'number' ||
      typeof q.low !== 'number' ||
      typeof q.close !== 'number'
    ) {
      continue;
    }
    if (
      !Number.isFinite(q.open) ||
      !Number.isFinite(q.high) ||
      !Number.isFinite(q.low) ||
      !Number.isFinite(q.close)
    ) {
      continue;
    }
    const timestamp = q.date instanceof Date ? q.date.getTime() : new Date(q.date).getTime();
    if (!Number.isFinite(timestamp)) continue;

    bars.push({
      timestamp,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: typeof q.volume === 'number' && Number.isFinite(q.volume) ? q.volume : 0,
    });
  }

  bars.sort((a, b) => a.timestamp - b.timestamp);

  // Deduplicate identical timestamps keeping the latest entry
  const deduped: OHLCVBar[] = [];
  for (const bar of bars) {
    if (deduped.length > 0 && deduped[deduped.length - 1].timestamp === bar.timestamp) {
      deduped[deduped.length - 1] = bar;
    } else {
      deduped.push(bar);
    }
  }
  return deduped;
}

export function resampleBars(
  bars: OHLCVBar[],
  resampleMs: number | 'SIX_MONTHS' | 'YEAR' | null
): OHLCVBar[] {
  if (!resampleMs || bars.length === 0) return bars;
  const sorted = [...bars].sort((a, b) => a.timestamp - b.timestamp);
  const buckets = new Map<number, OHLCVBar>();

  for (const bar of sorted) {
    let bucketTs: number;
    if (resampleMs === 'YEAR') {
      const d = new Date(bar.timestamp);
      bucketTs = Date.UTC(d.getUTCFullYear(), 0, 1);
    } else if (resampleMs === 'SIX_MONTHS') {
      const d = new Date(bar.timestamp);
      bucketTs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() < 6 ? 0 : 6, 1);
    } else {
      bucketTs = Math.floor(bar.timestamp / resampleMs) * resampleMs;
    }

    const existing = buckets.get(bucketTs);
    if (!existing) {
      buckets.set(bucketTs, {
        timestamp: bucketTs,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });
    } else {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume += bar.volume;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function computeQuoteSummary(
  meta: QuoteSummaryInput,
  bars: OHLCVBar[]
): ComputedQuoteSummary {
  const lastBar = bars.length > 0 ? bars[bars.length - 1] : undefined;
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : undefined;

  const price =
    typeof meta.regularMarketPrice === 'number' && Number.isFinite(meta.regularMarketPrice)
      ? meta.regularMarketPrice
      : lastBar?.close ?? 0;

  // Prefer true daily previous close; avoid multi-year chartPreviousClose on daily+ charts
  let prevClose: number;
  if (
    typeof meta.regularMarketPreviousClose === 'number' &&
    Number.isFinite(meta.regularMarketPreviousClose) &&
    meta.regularMarketPreviousClose > 0
  ) {
    prevClose = meta.regularMarketPreviousClose;
  } else if (
    typeof meta.previousClose === 'number' &&
    Number.isFinite(meta.previousClose) &&
    meta.previousClose > 0
  ) {
    prevClose = meta.previousClose;
  } else if (!meta.isIntraday && prevBar && Number.isFinite(prevBar.close) && prevBar.close > 0) {
    prevClose = prevBar.close;
  } else if (
    typeof meta.chartPreviousClose === 'number' &&
    Number.isFinite(meta.chartPreviousClose) &&
    meta.chartPreviousClose > 0
  ) {
    prevClose = meta.chartPreviousClose;
  } else {
    prevClose = prevBar?.close ?? lastBar?.open ?? price;
  }

  const change =
    typeof meta.regularMarketChange === 'number' && Number.isFinite(meta.regularMarketChange)
      ? meta.regularMarketChange
      : price - prevClose;

  const changePercent =
    typeof meta.regularMarketChangePercent === 'number' &&
    Number.isFinite(meta.regularMarketChangePercent)
      ? meta.regularMarketChangePercent
      : prevClose !== 0
        ? (change / prevClose) * 100
        : 0;

  const dayHigh =
    typeof meta.regularMarketDayHigh === 'number' && Number.isFinite(meta.regularMarketDayHigh)
      ? meta.regularMarketDayHigh
      : lastBar?.high ?? price;

  const dayLow =
    typeof meta.regularMarketDayLow === 'number' && Number.isFinite(meta.regularMarketDayLow)
      ? meta.regularMarketDayLow
      : lastBar?.low ?? price;

  const volume =
    typeof meta.regularMarketVolume === 'number' && Number.isFinite(meta.regularMarketVolume)
      ? meta.regularMarketVolume
      : lastBar?.volume ?? 0;

  return {
    price,
    prevClose,
    change,
    changePercent,
    dayHigh,
    dayLow,
    volume,
  };
}

export function getPricePrecision(symbol: string, lastPrice?: number): number {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.JK')) return 0;
  if (upper.includes('=X')) {
    return lastPrice !== undefined && lastPrice > 100 ? 2 : 4;
  }
  if (lastPrice !== undefined && lastPrice > 0 && lastPrice < 1) return 5;
  return 2;
}
