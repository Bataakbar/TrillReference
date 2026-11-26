import { calcEMA, calcMovingAverageSeries, calcRMA } from './movingAverageMath.js';
import type { OHLCVBar } from './timeframes.js';

export type ScreenerMarket = 'ID' | 'US' | 'GLOBAL' | 'CRYPTO' | 'WATCHLIST';
export type ScreenerTimeframe = '1d' | '1w' | '4h' | '1h' | '15m';
export type ScreenerTabId = 'overview' | 'technicals' | 'performance' | 'valuation' | 'dividends';
export type TechRatingLabel = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
export type Ema9Signal = 'cross_above' | 'above' | 'cross_below' | 'below';

export interface ScreenerTechnicalSnapshot {
  ema9: number | null;
  ema9DiffPct: number | null;
  ema9Signal: Ema9Signal | null;
  ema20: number | null;
  ema20DiffPct: number | null;
  ema50: number | null;
  ema50DiffPct: number | null;
  ema200: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  perf1w: number | null;
  perf1m: number | null;
  perf3m: number | null;
  techScore: number;
  techRating: TechRatingLabel;
  barCount: number;
}

export interface ScreenerRow extends ScreenerTechnicalSnapshot {
  symbol: string;
  shortName: string;
  exchange: string;
  country?: string;
  sector?: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  avgVolume10d: number | null;
  avgVolume3m: number | null;
  relVolume: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  epsTTM: number | null;
  epsForward: number | null;
  bookValue: number | null;
  divYieldPct: number | null;
  divRate: number | null;
  beta: number | null;
  analystRating: string | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekRangePos: number | null;
}

export type Ema9FilterMode =
  | 'all'
  | 'above_ema9'
  | 'cross_above_ema9'
  | 'below_ema9'
  | 'above_ema9_20'
  | 'golden_stack';

export type MaTrendFilterMode =
  | 'all'
  | 'above_sma50'
  | 'above_sma200'
  | 'below_sma200'
  | 'golden_cross';

export type ChangeBandFilter = 'all' | 'gainers' | 'up2' | 'up5' | 'losers' | 'down2';
export type RsiBandFilter = 'all' | 'oversold' | 'bullish' | 'neutral' | 'overbought';
export type MacdSignalFilter = 'all' | 'bullish' | 'bearish';
export type TechRatingFilter = 'all' | 'buy_or_strong' | 'strong_buy' | 'sell_or_strong';
export type MarketCapBandFilter = 'all' | 'mega' | 'large' | 'mid' | 'small';

export type ScreenerNumericField =
  | 'price'
  | 'changePercent'
  | 'ema9DiffPct'
  | 'ema20DiffPct'
  | 'ema50DiffPct'
  | 'rsi14'
  | 'macdHist'
  | 'relVolume'
  | 'volume'
  | 'marketCap'
  | 'trailingPE'
  | 'forwardPE'
  | 'priceToBook'
  | 'divYieldPct'
  | 'perf1w'
  | 'perf1m'
  | 'perf3m'
  | 'fiftyTwoWeekRangePos';

export type ScreenerNumericOp = 'gt' | 'gte' | 'lt' | 'lte' | 'between';

export interface ScreenerNumericRule {
  id: string;
  field: ScreenerNumericField;
  operator: ScreenerNumericOp;
  value: number;
  valueMax?: number;
}

export interface ScreenerFilterState {
  q: string;
  sector: string;
  ema9Mode: Ema9FilterMode;
  maTrendMode: MaTrendFilterMode;
  changeBand: ChangeBandFilter;
  rvolMin: number | null;
  minVolume: number | null;
  rsiBand: RsiBandFilter;
  macdFilter: MacdSignalFilter;
  techRatingFilter: TechRatingFilter;
  peMax: number | null;
  divYieldMin: number | null;
  marketCapBand: MarketCapBandFilter;
  customRules: ScreenerNumericRule[];
}

export interface ScreenerPreset {
  id: string;
  name: string;
  description: string;
  isBuiltIn?: boolean;
  tab?: ScreenerTabId;
  filters: ScreenerFilterState;
}

export type ScreenerSortDirection = 'asc' | 'desc';

export type ScreenerColumnKey =
  | 'symbol'
  | 'price'
  | 'changePercent'
  | 'volume'
  | 'relVolume'
  | 'marketCap'
  | 'ema9'
  | 'ema9DiffPct'
  | 'ema20'
  | 'ema50'
  | 'sma50'
  | 'sma200'
  | 'rsi14'
  | 'macdHist'
  | 'techRating'
  | 'perf1w'
  | 'perf1m'
  | 'perf3m'
  | 'fiftyTwoWeekRangePos'
  | 'trailingPE'
  | 'forwardPE'
  | 'priceToBook'
  | 'epsTTM'
  | 'epsForward'
  | 'divYieldPct'
  | 'divRate'
  | 'beta'
  | 'analystRating'
  | 'sector';

export interface ScreenerSortState {
  key: ScreenerColumnKey;
  direction: ScreenerSortDirection;
}

export interface ScreenerColumnMeta {
  key: ScreenerColumnKey;
  label: string;
  shortLabel?: string;
  align: 'left' | 'right' | 'center';
}

export const SCREENER_COLUMNS: readonly ScreenerColumnMeta[] = [
  { key: 'symbol', label: 'Ticker', align: 'left' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'changePercent', label: 'Chg %', align: 'right' },
  { key: 'volume', label: 'Volume', align: 'right' },
  { key: 'relVolume', label: 'Rel Vol', align: 'right' },
  { key: 'marketCap', label: 'Mkt Cap', align: 'right' },
  { key: 'ema9', label: 'EMA (9)', align: 'right' },
  { key: 'ema9DiffPct', label: 'vs EMA 9', align: 'right' },
  { key: 'ema20', label: 'EMA (20)', align: 'right' },
  { key: 'ema50', label: 'EMA (50)', align: 'right' },
  { key: 'sma50', label: 'SMA (50)', align: 'right' },
  { key: 'sma200', label: 'SMA (200)', align: 'right' },
  { key: 'rsi14', label: 'RSI (14)', align: 'right' },
  { key: 'macdHist', label: 'MACD Hist', align: 'right' },
  { key: 'techRating', label: 'Tech Rating', align: 'center' },
  { key: 'perf1w', label: 'Perf 1W', align: 'right' },
  { key: 'perf1m', label: 'Perf 1M', align: 'right' },
  { key: 'perf3m', label: 'Perf 3M', align: 'right' },
  { key: 'fiftyTwoWeekRangePos', label: '52W Range', align: 'center' },
  { key: 'trailingPE', label: 'P/E', align: 'right' },
  { key: 'forwardPE', label: 'Fwd P/E', align: 'right' },
  { key: 'priceToBook', label: 'P/B', align: 'right' },
  { key: 'epsTTM', label: 'EPS (TTM)', align: 'right' },
  { key: 'epsForward', label: 'EPS (Fwd)', align: 'right' },
  { key: 'divYieldPct', label: 'Div Yield %', align: 'right' },
  { key: 'divRate', label: 'Div / Yr', align: 'right' },
  { key: 'beta', label: 'Beta', align: 'right' },
  { key: 'analystRating', label: 'Analyst', align: 'center' },
  { key: 'sector', label: 'Sector', align: 'left' },
];

export const SCREENER_TABS: ReadonlyArray<{
  id: ScreenerTabId;
  label: string;
  columns: ScreenerColumnKey[];
}> = [
  {
    id: 'overview',
    label: 'Overview',
    columns: [
      'symbol',
      'price',
      'changePercent',
      'ema9',
      'ema9DiffPct',
      'volume',
      'relVolume',
      'marketCap',
      'rsi14',
      'techRating',
      'sector',
    ],
  },
  {
    id: 'technicals',
    label: 'Technicals',
    columns: [
      'symbol',
      'price',
      'changePercent',
      'techRating',
      'ema9',
      'ema9DiffPct',
      'ema20',
      'ema50',
      'sma50',
      'sma200',
      'rsi14',
      'macdHist',
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    columns: [
      'symbol',
      'price',
      'changePercent',
      'perf1w',
      'perf1m',
      'perf3m',
      'fiftyTwoWeekRangePos',
      'volume',
      'relVolume',
      'ema9DiffPct',
    ],
  },
  {
    id: 'valuation',
    label: 'Valuation',
    columns: [
      'symbol',
      'price',
      'changePercent',
      'marketCap',
      'trailingPE',
      'forwardPE',
      'priceToBook',
      'epsTTM',
      'epsForward',
      'analystRating',
      'sector',
    ],
  },
  {
    id: 'dividends',
    label: 'Dividends',
    columns: [
      'symbol',
      'price',
      'changePercent',
      'divYieldPct',
      'divRate',
      'marketCap',
      'trailingPE',
      'beta',
      'sector',
    ],
  },
];

export const DEFAULT_SCREENER_FILTERS: ScreenerFilterState = {
  q: '',
  sector: 'All sectors',
  ema9Mode: 'all',
  maTrendMode: 'all',
  changeBand: 'all',
  rvolMin: null,
  minVolume: null,
  rsiBand: 'all',
  macdFilter: 'all',
  techRatingFilter: 'all',
  peMax: null,
  divYieldMin: null,
  marketCapBand: 'all',
  customRules: [],
};

export const BUILT_IN_SCREENER_PRESETS: readonly ScreenerPreset[] = [
  {
    id: 'all',
    name: 'All Stocks',
    description: 'Tampilkan semua saham di pasar terpilih',
    isBuiltIn: true,
    tab: 'overview',
    filters: { ...DEFAULT_SCREENER_FILTERS },
  },
  {
    id: 'above-ema9',
    name: 'Harga di atas EMA 9',
    description: 'Saham dengan harga penutupan berada di atas EMA(9) aktif',
    isBuiltIn: true,
    tab: 'technicals',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      ema9Mode: 'above_ema9',
    },
  },
  {
    id: 'ema9-cross-above',
    name: 'Breakout Cross EMA 9',
    description: 'Harga baru saja menembus ke atas garis EMA(9) pada bar terakhir',
    isBuiltIn: true,
    tab: 'technicals',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      ema9Mode: 'cross_above_ema9',
    },
  },
  {
    id: 'golden-stack',
    name: 'Strong Trend (EMA 9 > 20 > SMA 50)',
    description: 'Susunan tren bullish: Harga > EMA 9 > EMA 20 > SMA 50',
    isBuiltIn: true,
    tab: 'technicals',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      ema9Mode: 'golden_stack',
    },
  },
  {
    id: 'rvol-momentum',
    name: 'High RVOL + Green',
    description: 'Volume relatif >= 1.5x rata-rata 10 hari, harga naik, di atas EMA 9',
    isBuiltIn: true,
    tab: 'overview',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      ema9Mode: 'above_ema9',
      changeBand: 'gainers',
      rvolMin: 1.5,
    },
  },
  {
    id: 'oversold-pullback',
    name: 'Oversold Pullback (RSI < 35)',
    description: 'RSI(14) jenuh jual (< 30) untuk mencari potensi pantulan',
    isBuiltIn: true,
    tab: 'technicals',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      rsiBand: 'oversold',
    },
  },
  {
    id: 'value-dividend',
    name: 'Value & Dividen >= 3%',
    description: 'P/E rasio <= 15 dan Dividend Yield >= 3%',
    isBuiltIn: true,
    tab: 'dividends',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      peMax: 15,
      divYieldMin: 3,
    },
  },
];

export const NUMERIC_RULE_FIELD_LABELS: Record<ScreenerNumericField, string> = {
  price: 'Price',
  changePercent: 'Change %',
  ema9DiffPct: 'Dist vs EMA 9 (%)',
  ema20DiffPct: 'Dist vs EMA 20 (%)',
  ema50DiffPct: 'Dist vs EMA 50 (%)',
  rsi14: 'RSI (14)',
  macdHist: 'MACD Histogram',
  relVolume: 'Relative Volume (x)',
  volume: 'Volume',
  marketCap: 'Market Cap',
  trailingPE: 'P/E (TTM)',
  forwardPE: 'Forward P/E',
  priceToBook: 'P/B',
  divYieldPct: 'Dividend Yield (%)',
  perf1w: 'Perf 1W (%)',
  perf1m: 'Perf 1M (%)',
  perf3m: 'Perf 3M (%)',
  fiftyTwoWeekRangePos: '52W Position (%)',
};

function roundFinite(val: number | undefined, decimals = 4): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function pctDiff(price: number | null, ref: number | null): number | null {
  if (price === null || ref === null || ref === 0 || !Number.isFinite(price) || !Number.isFinite(ref)) {
    return null;
  }
  return roundFinite(((price - ref) / ref) * 100, 2);
}

function computeRsiSeries(closes: number[], length = 14): Array<number | undefined> {
  const result: Array<number | undefined> = new Array(closes.length).fill(undefined);
  if (closes.length <= length) return result;

  const gains: Array<number | undefined> = new Array(closes.length).fill(undefined);
  const losses: Array<number | undefined> = new Array(closes.length).fill(undefined);
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains[i] = diff > 0 ? diff : 0;
    losses[i] = diff < 0 ? -diff : 0;
  }

  const avgGains = calcRMA(gains, length);
  const avgLosses = calcRMA(losses, length);

  for (let i = 0; i < closes.length; i++) {
    const ag = avgGains[i];
    const al = avgLosses[i];
    if (ag === undefined || al === undefined) continue;
    if (al === 0) {
      result[i] = ag === 0 ? 50 : 100;
    } else {
      const rs = ag / al;
      result[i] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

function computeMacdLast(
  closes: number[]
): { macd: number | null; signal: number | null; hist: number | null } {
  if (closes.length < 35) return { macd: null, signal: null, hist: null };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = closes.map((_, i) =>
    ema12[i] !== undefined && ema26[i] !== undefined
      ? (ema12[i] as number) - (ema26[i] as number)
      : undefined
  );
  const signalLine = calcEMA(macdLine, 9);
  const lastIdx = closes.length - 1;
  const m = macdLine[lastIdx];
  const s = signalLine[lastIdx];
  if (m === undefined || s === undefined) {
    return { macd: roundFinite(m, 4), signal: null, hist: null };
  }
  return {
    macd: roundFinite(m, 4),
    signal: roundFinite(s, 4),
    hist: roundFinite(m - s, 4),
  };
}

function scoreToTechRating(score: number): TechRatingLabel {
  if (score >= 0.5) return 'Strong Buy';
  if (score >= 0.15) return 'Buy';
  if (score <= -0.5) return 'Strong Sell';
  if (score <= -0.15) return 'Sell';
  return 'Neutral';
}

export function computeScreenerTechnicals(
  bars: OHLCVBar[],
  options?: { livePrice?: number | null; sma50Fallback?: number | null; sma200Fallback?: number | null }
): ScreenerTechnicalSnapshot {
  if (!Array.isArray(bars) || bars.length === 0) {
    return {
      ema9: null,
      ema9DiffPct: null,
      ema9Signal: null,
      ema20: null,
      ema20DiffPct: null,
      ema50: null,
      ema50DiffPct: null,
      ema200: null,
      sma50: options?.sma50Fallback ?? null,
      sma200: options?.sma200Fallback ?? null,
      rsi14: null,
      macd: null,
      macdSignal: null,
      macdHist: null,
      perf1w: null,
      perf1m: null,
      perf3m: null,
      techScore: 0,
      techRating: 'Neutral',
      barCount: 0,
    };
  }

  // If live quote price differs cleanly on latest forming session, mirror latest close for live comparison
  const workBars = bars.map((b) => ({ ...b }));
  const lastIdx = workBars.length - 1;
  if (
    typeof options?.livePrice === 'number' &&
    Number.isFinite(options.livePrice) &&
    options.livePrice > 0
  ) {
    workBars[lastIdx].close = options.livePrice;
  }

  const closes = workBars.map((b) => b.close);
  const ema9Arr = calcMovingAverageSeries(workBars, 'EMA', 9, 'close', 0);
  const ema20Arr = calcMovingAverageSeries(workBars, 'EMA', 20, 'close', 0);
  const ema50Arr = calcMovingAverageSeries(workBars, 'EMA', 50, 'close', 0);
  const ema200Arr = calcMovingAverageSeries(workBars, 'EMA', 200, 'close', 0);
  const sma50Arr = calcMovingAverageSeries(workBars, 'SMA', 50, 'close', 0);
  const sma200Arr = calcMovingAverageSeries(workBars, 'SMA', 200, 'close', 0);
  const rsiArr = computeRsiSeries(closes, 14);
  const macdObj = computeMacdLast(closes);

  const lastPrice = closes[lastIdx];
  const ema9 = roundFinite(ema9Arr[lastIdx], 4);
  const ema20 = roundFinite(ema20Arr[lastIdx], 4);
  const ema50 = roundFinite(ema50Arr[lastIdx], 4);
  const ema200 = roundFinite(ema200Arr[lastIdx], 4);
  const sma50 = roundFinite(sma50Arr[lastIdx], 4) ?? options?.sma50Fallback ?? null;
  const sma200 = roundFinite(sma200Arr[lastIdx], 4) ?? options?.sma200Fallback ?? null;
  const rsi14 = roundFinite(rsiArr[lastIdx], 2);

  let ema9Signal: Ema9Signal | null = null;
  if (ema9 !== null) {
    const prevEma9 = lastIdx > 0 ? ema9Arr[lastIdx - 1] : undefined;
    const prevClose = lastIdx > 0 ? closes[lastIdx - 1] : undefined;
    if (lastPrice > ema9) {
      ema9Signal =
        prevEma9 !== undefined && prevClose !== undefined && prevClose <= prevEma9
          ? 'cross_above'
          : 'above';
    } else {
      ema9Signal =
        prevEma9 !== undefined && prevClose !== undefined && prevClose >= prevEma9
          ? 'cross_below'
          : 'below';
    }
  }

  // Approximate lookbacks based on timestamp (~5 trading bars/wk, ~21/mo, ~63/3mo) or calendar days
  const findCloseBeforeDays = (days: number): number | null => {
    const lastTs = workBars[lastIdx].timestamp;
    const targetTs = lastTs - days * 24 * 60 * 60 * 1000;
    let candidate: OHLCVBar | null = null;
    for (let i = lastIdx - 1; i >= 0; i--) {
      candidate = workBars[i];
      if (workBars[i].timestamp <= targetTs) {
        return workBars[i].close;
      }
    }
    return workBars.length > 5 && candidate ? null : null;
  };

  const perf1w = pctDiff(lastPrice, findCloseBeforeDays(7));
  const perf1m = pctDiff(lastPrice, findCloseBeforeDays(30));
  const perf3m = pctDiff(lastPrice, findCloseBeforeDays(90));

  // Composite TradingView-inspired technical rating from available signals (-1 to +1)
  let signalSum = 0;
  let signalCount = 0;
  const maRefs = [ema9, ema20, ema50, ema200, sma50, sma200];
  for (const ma of maRefs) {
    if (ma === null) continue;
    signalCount++;
    if (lastPrice > ma) signalSum += 1;
    else if (lastPrice < ma) signalSum -= 1;
  }
  if (rsi14 !== null) {
    signalCount++;
    if (rsi14 < 30) signalSum += 1; // oversold buy opportunity
    else if (rsi14 > 70) signalSum -= 1; // overbought caution
    else if (rsi14 >= 55) signalSum += 0.5;
    else if (rsi14 <= 45) signalSum -= 0.5;
  }
  if (macdObj.hist !== null) {
    signalCount++;
    if (macdObj.hist > 0) signalSum += 1;
    else if (macdObj.hist < 0) signalSum -= 1;
  }

  const techScore = signalCount > 0 ? roundFinite(signalSum / signalCount, 2) ?? 0 : 0;

  return {
    ema9,
    ema9DiffPct: pctDiff(lastPrice, ema9),
    ema9Signal,
    ema20,
    ema20DiffPct: pctDiff(lastPrice, ema20),
    ema50,
    ema50DiffPct: pctDiff(lastPrice, ema50),
    ema200,
    sma50,
    sma200,
    rsi14,
    macd: macdObj.macd,
    macdSignal: macdObj.signal,
    macdHist: macdObj.hist,
    perf1w,
    perf1m,
    perf3m,
    techScore,
    techRating: scoreToTechRating(techScore),
    barCount: workBars.length,
  };
}

function matchesMarketCapBand(
  marketCap: number | null,
  band: MarketCapBandFilter,
  currency: string
): boolean {
  if (band === 'all') return true;
  if (marketCap === null || !Number.isFinite(marketCap)) return false;
  // Normalize IDR roughly vs USD (~15,500) so Indonesian IDX large/mid caps filter sensibly
  const usdEquivalent = currency.toUpperCase() === 'IDR' ? marketCap / 15_500 : marketCap;
  switch (band) {
    case 'mega':
      return usdEquivalent >= 100e9;
    case 'large':
      return usdEquivalent >= 10e9;
    case 'mid':
      return usdEquivalent >= 2e9 && usdEquivalent < 10e9;
    case 'small':
      return usdEquivalent < 2e9;
    default:
      return true;
  }
}

export function countActiveScreenerFilters(filters: ScreenerFilterState): number {
  let count = 0;
  if (filters.q.trim()) count++;
  if (filters.sector !== 'All sectors') count++;
  if (filters.ema9Mode !== 'all') count++;
  if (filters.maTrendMode !== 'all') count++;
  if (filters.changeBand !== 'all') count++;
  if (filters.rvolMin !== null) count++;
  if (filters.minVolume !== null) count++;
  if (filters.rsiBand !== 'all') count++;
  if (filters.macdFilter !== 'all') count++;
  if (filters.techRatingFilter !== 'all') count++;
  if (filters.peMax !== null) count++;
  if (filters.divYieldMin !== null) count++;
  if (filters.marketCapBand !== 'all') count++;
  count += filters.customRules.length;
  return count;
}

export function filterScreenerRows(
  rows: ScreenerRow[],
  filters: ScreenerFilterState
): ScreenerRow[] {
  const query = filters.q.trim().toLowerCase();

  return rows.filter((row) => {
    if (query) {
      const hit =
        row.symbol.toLowerCase().includes(query) ||
        row.shortName.toLowerCase().includes(query) ||
        (row.sector ?? '').toLowerCase().includes(query) ||
        row.exchange.toLowerCase().includes(query);
      if (!hit) return false;
    }

    if (filters.sector !== 'All sectors' && row.sector !== filters.sector) {
      return false;
    }

    switch (filters.ema9Mode) {
      case 'above_ema9':
        if (row.ema9 === null || row.price <= row.ema9) return false;
        break;
      case 'cross_above_ema9':
        if (row.ema9Signal !== 'cross_above') return false;
        break;
      case 'below_ema9':
        if (row.ema9 === null || row.price >= row.ema9) return false;
        break;
      case 'above_ema9_20':
        if (row.ema9 === null || row.ema20 === null || !(row.price > row.ema9 && row.ema9 > row.ema20)) {
          return false;
        }
        break;
      case 'golden_stack': {
        const anchor50 = row.sma50 ?? row.ema50;
        if (
          row.ema9 === null ||
          row.ema20 === null ||
          anchor50 === null ||
          !(row.price > row.ema9 && row.ema9 > row.ema20 && row.ema20 > anchor50)
        ) {
          return false;
        }
        break;
      }
      case 'all':
      default:
        break;
    }

    switch (filters.maTrendMode) {
      case 'above_sma50':
        if (row.sma50 === null || row.price <= row.sma50) return false;
        break;
      case 'above_sma200':
        if (row.sma200 === null || row.price <= row.sma200) return false;
        break;
      case 'below_sma200':
        if (row.sma200 === null || row.price >= row.sma200) return false;
        break;
      case 'golden_cross':
        if (row.sma50 === null || row.sma200 === null || row.sma50 <= row.sma200) return false;
        break;
      case 'all':
      default:
        break;
    }

    switch (filters.changeBand) {
      case 'gainers':
        if (row.changePercent <= 0) return false;
        break;
      case 'up2':
        if (row.changePercent < 2) return false;
        break;
      case 'up5':
        if (row.changePercent < 5) return false;
        break;
      case 'losers':
        if (row.changePercent >= 0) return false;
        break;
      case 'down2':
        if (row.changePercent > -2) return false;
        break;
      case 'all':
      default:
        break;
    }

    if (filters.rvolMin !== null) {
      if (row.relVolume === null || row.relVolume < filters.rvolMin) return false;
    }

    if (filters.minVolume !== null) {
      if (row.volume === null || row.volume < filters.minVolume) return false;
    }

    switch (filters.rsiBand) {
      case 'oversold':
        if (row.rsi14 === null || row.rsi14 >= 30) return false;
        break;
      case 'bullish':
        if (row.rsi14 === null || row.rsi14 < 50 || row.rsi14 > 70) return false;
        break;
      case 'neutral':
        if (row.rsi14 === null || row.rsi14 < 30 || row.rsi14 > 70) return false;
        break;
      case 'overbought':
        if (row.rsi14 === null || row.rsi14 <= 70) return false;
        break;
      case 'all':
      default:
        break;
    }

    switch (filters.macdFilter) {
      case 'bullish':
        if (row.macdHist === null || row.macdHist <= 0) return false;
        break;
      case 'bearish':
        if (row.macdHist === null || row.macdHist >= 0) return false;
        break;
      case 'all':
      default:
        break;
    }

    switch (filters.techRatingFilter) {
      case 'strong_buy':
        if (row.techRating !== 'Strong Buy') return false;
        break;
      case 'buy_or_strong':
        if (row.techRating !== 'Strong Buy' && row.techRating !== 'Buy') return false;
        break;
      case 'sell_or_strong':
        if (row.techRating !== 'Strong Sell' && row.techRating !== 'Sell') return false;
        break;
      case 'all':
      default:
        break;
    }

    if (filters.peMax !== null) {
      if (row.trailingPE === null || row.trailingPE <= 0 || row.trailingPE > filters.peMax) {
        return false;
      }
    }

    if (filters.divYieldMin !== null) {
      if (row.divYieldPct === null || row.divYieldPct < filters.divYieldMin) {
        return false;
      }
    }

    if (!matchesMarketCapBand(row.marketCap, filters.marketCapBand, row.currency)) {
      return false;
    }

    for (const rule of filters.customRules) {
      const rawVal = row[rule.field];
      if (typeof rawVal !== 'number' || !Number.isFinite(rawVal)) return false;
      if (rule.operator === 'gt' && !(rawVal > rule.value)) return false;
      if (rule.operator === 'gte' && !(rawVal >= rule.value)) return false;
      if (rule.operator === 'lt' && !(rawVal < rule.value)) return false;
      if (rule.operator === 'lte' && !(rawVal <= rule.value)) return false;
      if (rule.operator === 'between') {
        const hi = typeof rule.valueMax === 'number' ? rule.valueMax : rule.value;
        const lo = Math.min(rule.value, hi);
        const top = Math.max(rule.value, hi);
        if (rawVal < lo || rawVal > top) return false;
      }
    }

    return true;
  });
}

const TECH_RATING_RANK: Record<TechRatingLabel, number> = {
  'Strong Buy': 5,
  Buy: 4,
  Neutral: 3,
  Sell: 2,
  'Strong Sell': 1,
};

export function sortScreenerRows(
  rows: ScreenerRow[],
  sort: ScreenerSortState
): ScreenerRow[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const key = sort.key;
    if (key === 'symbol' || key === 'sector' || key === 'analystRating') {
      const av = (a[key] ?? '').toString();
      const bv = (b[key] ?? '').toString();
      return av.localeCompare(bv) * dir;
    }
    if (key === 'techRating') {
      return (TECH_RATING_RANK[a.techRating] - TECH_RATING_RANK[b.techRating]) * dir;
    }
    const av = a[key];
    const bv = b[key];
    const aNum = typeof av === 'number' && Number.isFinite(av) ? av : null;
    const bNum = typeof bv === 'number' && Number.isFinite(bv) ? bv : null;
    if (aNum === null && bNum === null) return a.symbol.localeCompare(b.symbol);
    if (aNum === null) return 1; // Push nulls to bottom regardless of direction
    if (bNum === null) return -1;
    if (aNum === bNum) return a.symbol.localeCompare(b.symbol);
    return (aNum - bNum) * dir;
  });
}
