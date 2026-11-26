import { calcEMA, calcMovingAverageSeries, calcRMA, calcSMA } from './movingAverageMath.js';
import type { OHLCVBar } from './timeframes.js';

export type ScreenerMarket = 'ID' | 'US' | 'GLOBAL' | 'CRYPTO' | 'WATCHLIST';
export type ScreenerTimeframe = '1d' | '1w' | '4h' | '1h' | '15m';
export type ScreenerTabId = 'overview' | 'technicals' | 'performance' | 'valuation' | 'dividends';
export type ScreenerViewMode = 'table' | 'charts' | 'heatmap';
export type ScreenerRefreshRate = 'manual' | '15s' | '60s';
export type TechRatingLabel = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
export type Ema9Signal = 'cross_above' | 'above' | 'cross_below' | 'below';
export type BollingerSignal = 'above_upper' | 'below_lower' | 'inside';
export type HeatmapColorMetric = 'changePercent' | 'ema9DiffPct' | 'rsi14';

export type CandlePatternId =
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'morning_star'
  | 'hammer'
  | 'shooting_star'
  | 'dragonfly_doji'
  | 'gravestone_doji'
  | 'doji'
  | 'marubozu_bull'
  | 'marubozu_bear';

export type CandlePatternSentiment = 'bullish' | 'bearish' | 'neutral';

export const CANDLE_PATTERN_META: Record<
  CandlePatternId,
  { label: string; shortLabel: string; sentiment: CandlePatternSentiment }
> = {
  bullish_engulfing: { label: 'Bullish Engulfing', shortLabel: 'Bull Engulf', sentiment: 'bullish' },
  bearish_engulfing: { label: 'Bearish Engulfing', shortLabel: 'Bear Engulf', sentiment: 'bearish' },
  morning_star: { label: 'Morning Star', shortLabel: 'Morning Star', sentiment: 'bullish' },
  hammer: { label: 'Hammer', shortLabel: 'Hammer', sentiment: 'bullish' },
  shooting_star: { label: 'Shooting Star', shortLabel: 'Shooting Star', sentiment: 'bearish' },
  dragonfly_doji: { label: 'Dragonfly Doji', shortLabel: 'Dragonfly', sentiment: 'bullish' },
  gravestone_doji: { label: 'Gravestone Doji', shortLabel: 'Gravestone', sentiment: 'bearish' },
  doji: { label: 'Doji', shortLabel: 'Doji', sentiment: 'neutral' },
  marubozu_bull: { label: 'Bullish Marubozu', shortLabel: 'Bull Marubozu', sentiment: 'bullish' },
  marubozu_bear: { label: 'Bearish Marubozu', shortLabel: 'Bear Marubozu', sentiment: 'bearish' },
};

export interface ScreenerTechnicalSnapshot {
  ema9: number | null;
  ema9DiffPct: number | null;
  ema9Signal: Ema9Signal | null;
  ema20: number | null;
  ema20DiffPct: number | null;
  ema50: number | null;
  ema50DiffPct: number | null;
  ema200: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbSignal: BollingerSignal | null;
  rsi14: number | null;
  mom10: number | null;
  awesomeOsc: number | null;
  cci20: number | null;
  stochK: number | null;
  stochD: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  candlePattern: CandlePatternId | null;
  candlePatternSentiment: CandlePatternSentiment | null;
  perf1w: number | null;
  perf1m: number | null;
  perf3m: number | null;
  perf6m: number | null;
  perfYtd: number | null;
  perf1y: number | null;
  volatility1w: number | null;
  volatility1m: number | null;
  maScore: number;
  maRating: TechRatingLabel;
  osScore: number;
  osRating: TechRatingLabel;
  techScore: number;
  techRating: TechRatingLabel;
  sparkline: number[];
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
  | 'above_ema50'
  | 'below_ema50'
  | 'above_sma50'
  | 'above_sma200'
  | 'below_sma200'
  | 'golden_cross'
  | 'cross_bb_upper'
  | 'below_bb_lower';

export type ChangeBandFilter = 'all' | 'gainers' | 'up2' | 'up5' | 'losers' | 'down2';
export type RsiBandFilter = 'all' | 'oversold' | 'bullish' | 'neutral' | 'overbought';
export type MacdSignalFilter = 'all' | 'bullish' | 'bearish';
export type TechRatingFilter = 'all' | 'buy_or_strong' | 'strong_buy' | 'sell_or_strong';
export type MarketCapBandFilter = 'all' | 'mega' | 'large' | 'mid' | 'small';
export type PatternFilterMode = 'all' | 'any' | 'bullish' | 'bearish';
export type PerfFilterMode = 'all' | '1w_up' | '1m_up' | '1m_up10' | '3m_up' | 'ytd_up' | '1m_down10';
export type ScreenerIndexId =
  | 'ALL'
  | 'IDX30'
  | 'LQ45'
  | 'IDXHIDIV20'
  | 'INFOBANK15'
  | 'IDXBUMN20'
  | 'NDX'
  | 'DJI';

export const SCREENER_INDEX_OPTIONS: ReadonlyArray<{
  id: ScreenerIndexId;
  label: string;
  markets: ScreenerMarket[];
}> = [
  { id: 'ALL', label: 'Index: All', markets: ['ID', 'US', 'GLOBAL', 'CRYPTO', 'WATCHLIST'] },
  { id: 'LQ45', label: 'LQ45', markets: ['ID'] },
  { id: 'IDX30', label: 'IDX 30', markets: ['ID'] },
  { id: 'IDXHIDIV20', label: 'IDX High Div 20', markets: ['ID'] },
  { id: 'INFOBANK15', label: 'Infobank 15', markets: ['ID'] },
  { id: 'IDXBUMN20', label: 'IDX BUMN 20', markets: ['ID'] },
  { id: 'NDX', label: 'NASDAQ 100', markets: ['US'] },
  { id: 'DJI', label: 'Dow Jones 30', markets: ['US'] },
];

const INDEX_MEMBERSHIP: Record<Exclude<ScreenerIndexId, 'ALL'>, ReadonlySet<string>> = {
  IDX30: new Set([
    'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'TLKM.JK', 'ASII.JK', 'UNTR.JK', 'AMMN.JK',
    'BREN.JK', 'ADRO.JK', 'ICBP.JK', 'INDF.JK', 'KLBF.JK', 'CPIN.JK', 'UNVR.JK', 'PGAS.JK',
    'PTBA.JK', 'ITMG.JK', 'ANTM.JK', 'INCO.JK', 'MDKA.JK', 'SMGR.JK', 'INKP.JK', 'GOTO.JK',
    'BRPT.JK', 'TPIA.JK', 'TOWR.JK', 'TBIG.JK', 'MAPI.JK', 'AMRT.JK',
  ]),
  LQ45: new Set([
    'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'BRIS.JK', 'BBTN.JK', 'NISP.JK', 'ARTO.JK',
    'TLKM.JK', 'ISAT.JK', 'EXCL.JK', 'TOWR.JK', 'TBIG.JK', 'MTEL.JK', 'SCMA.JK',
    'ASII.JK', 'UNTR.JK', 'AMMN.JK', 'BREN.JK', 'PGEO.JK', 'ADRO.JK', 'AADI.JK', 'PTBA.JK',
    'ITMG.JK', 'MEDC.JK', 'PGAS.JK', 'AKRA.JK', 'HRUM.JK', 'INDY.JK', 'ANTM.JK', 'INCO.JK',
    'MDKA.JK', 'MBMA.JK', 'NCKL.JK', 'TINS.JK', 'ICBP.JK', 'INDF.JK', 'KLBF.JK', 'CPIN.JK',
    'JPFA.JK', 'SIDO.JK', 'UNVR.JK', 'AMRT.JK', 'MAPI.JK', 'ACES.JK', 'SMGR.JK', 'INTP.JK',
    'INKP.JK', 'BRPT.JK', 'TPIA.JK', 'ESSA.JK', 'GOTO.JK', 'JSMR.JK', 'MIKA.JK', 'PWON.JK',
    'BSDE.JK', 'CTRA.JK', 'SMRA.JK',
  ]),
  IDXHIDIV20: new Set([
    'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'BNGA.JK', 'NISP.JK', 'BJBR.JK', 'BJTM.JK',
    'ADRO.JK', 'AADI.JK', 'PTBA.JK', 'ITMG.JK', 'PGAS.JK', 'ASII.JK', 'UNTR.JK', 'TLKM.JK',
    'INDF.JK', 'UNVR.JK', 'HMSP.JK', 'KLBF.JK', 'SIDO.JK', 'SMSM.JK', 'DMAS.JK',
  ]),
  INFOBANK15: new Set([
    'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'BRIS.JK', 'BBTN.JK', 'BNGA.JK', 'NISP.JK',
    'BDMN.JK', 'ARTO.JK', 'BTPS.JK', 'PNBN.JK', 'BJBR.JK', 'BJTM.JK', 'AGRO.JK',
  ]),
  IDXBUMN20: new Set([
    'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'BBTN.JK', 'BRIS.JK', 'TLKM.JK', 'PGAS.JK', 'PTBA.JK',
    'ANTM.JK', 'TINS.JK', 'SMGR.JK', 'JSMR.JK', 'WIKA.JK', 'PTPP.JK', 'ADHI.JK', 'PGEO.JK',
    'ELSA.JK', 'KAEF.JK',
  ]),
  NDX: new Set([
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'COST', 'NFLX',
    'AMD', 'INTC', 'QCOM', 'TXN', 'AMAT', 'MU', 'LRCX', 'ARM', 'SMCI', 'MRVL',
    'ADBE', 'CSCO', 'INTU', 'PLTR', 'PANW', 'CRWD', 'DDOG', 'ZS', 'MDB', 'PYPL',
    'PEP', 'ISRG', 'TMUS', 'ASML',
  ]),
  DJI: new Set([
    'AAPL', 'MSFT', 'NVDA', 'AMZN', 'JPM', 'V', 'UNH', 'JNJ', 'PG', 'HD',
    'CRM', 'CSCO', 'IBM', 'GS', 'WMT', 'MCD', 'DIS', 'NKE', 'BA', 'CAT',
    'HON', 'CVX', 'MRK',
  ]),
};

export function matchesIndexMembership(symbol: string, indexId: ScreenerIndexId): boolean {
  if (indexId === 'ALL') return true;
  const set = INDEX_MEMBERSHIP[indexId];
  return set ? set.has(symbol.toUpperCase()) : true;
}

export type ScreenerNumericField =
  | 'price'
  | 'changePercent'
  | 'ema9DiffPct'
  | 'ema20DiffPct'
  | 'ema50DiffPct'
  | 'rsi14'
  | 'mom10'
  | 'awesomeOsc'
  | 'cci20'
  | 'stochK'
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
  | 'perf6m'
  | 'perfYtd'
  | 'perf1y'
  | 'volatility1m'
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
  indexFilter: ScreenerIndexId;
  sector: string;
  flaggedOnly: boolean;
  ema9Mode: Ema9FilterMode;
  maTrendMode: MaTrendFilterMode;
  changeBand: ChangeBandFilter;
  rvolMin: number | null;
  minVolume: number | null;
  rsiBand: RsiBandFilter;
  macdFilter: MacdSignalFilter;
  techRatingFilter: TechRatingFilter;
  maRatingFilter: TechRatingFilter;
  osRatingFilter: TechRatingFilter;
  perfFilter: PerfFilterMode;
  patternFilter: PatternFilterMode;
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
  | 'mom10'
  | 'awesomeOsc'
  | 'cci20'
  | 'stochK'
  | 'stochD'
  | 'macdHist'
  | 'candlePattern'
  | 'techRating'
  | 'maRating'
  | 'osRating'
  | 'perf1w'
  | 'perf1m'
  | 'perf3m'
  | 'perf6m'
  | 'perfYtd'
  | 'perf1y'
  | 'volatility1w'
  | 'volatility1m'
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
  { key: 'symbol', label: 'Symbol', align: 'left' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'changePercent', label: 'Chg %', align: 'right' },
  { key: 'volume', label: 'Volume', align: 'right' },
  { key: 'relVolume', label: 'Rel Vol', align: 'right' },
  { key: 'marketCap', label: 'Mkt Cap', align: 'right' },
  { key: 'techRating', label: 'Tech Rating', align: 'center' },
  { key: 'maRating', label: 'MA Rating', align: 'center' },
  { key: 'osRating', label: 'Os Rating', align: 'center' },
  { key: 'ema9', label: 'EMA (9)', align: 'right' },
  { key: 'ema9DiffPct', label: 'vs EMA 9', align: 'right' },
  { key: 'ema20', label: 'EMA (20)', align: 'right' },
  { key: 'ema50', label: 'EMA (50)', align: 'right' },
  { key: 'sma50', label: 'SMA (50)', align: 'right' },
  { key: 'sma200', label: 'SMA (200)', align: 'right' },
  { key: 'rsi14', label: 'RSI, 14', align: 'right' },
  { key: 'mom10', label: 'Mom, 10', align: 'right' },
  { key: 'awesomeOsc', label: 'AO', align: 'right' },
  { key: 'cci20', label: 'CCI, 20', align: 'right' },
  { key: 'stochK', label: 'Stoch %K', align: 'right' },
  { key: 'stochD', label: 'Stoch %D', align: 'right' },
  { key: 'macdHist', label: 'MACD Hist', align: 'right' },
  { key: 'candlePattern', label: 'Pattern', align: 'left' },
  { key: 'perf1w', label: 'Perf 1W', align: 'right' },
  { key: 'perf1m', label: 'Perf 1M', align: 'right' },
  { key: 'perf3m', label: 'Perf 3M', align: 'right' },
  { key: 'perf6m', label: 'Perf 6M', align: 'right' },
  { key: 'perfYtd', label: 'Perf YTD', align: 'right' },
  { key: 'perf1y', label: 'Perf 1Y', align: 'right' },
  { key: 'volatility1w', label: 'Vol 1W', align: 'right' },
  { key: 'volatility1m', label: 'Vol 1M', align: 'right' },
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
      'volume',
      'relVolume',
      'marketCap',
      'ema9',
      'ema9DiffPct',
      'trailingPE',
      'divYieldPct',
      'techRating',
      'sector',
      'analystRating',
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
      'maRating',
      'osRating',
      'ema9',
      'ema9DiffPct',
      'rsi14',
      'mom10',
      'awesomeOsc',
      'cci20',
      'stochK',
      'stochD',
      'macdHist',
      'candlePattern',
      'ema20',
      'sma50',
      'sma200',
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
      'perf6m',
      'perfYtd',
      'perf1y',
      'volatility1w',
      'volatility1m',
      'fiftyTwoWeekRangePos',
      'relVolume',
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
  indexFilter: 'ALL',
  sector: 'All sectors',
  flaggedOnly: false,
  ema9Mode: 'all',
  maTrendMode: 'all',
  changeBand: 'all',
  rvolMin: null,
  minVolume: null,
  rsiBand: 'all',
  macdFilter: 'all',
  techRatingFilter: 'all',
  maRatingFilter: 'all',
  osRatingFilter: 'all',
  perfFilter: 'all',
  patternFilter: 'all',
  peMax: null,
  divYieldMin: null,
  marketCapBand: 'all',
  customRules: [],
};

export function normalizeScreenerFilters(
  partial?: Partial<ScreenerFilterState> | null
): ScreenerFilterState {
  if (!partial) {
    return { ...DEFAULT_SCREENER_FILTERS, customRules: [] };
  }
  return {
    ...DEFAULT_SCREENER_FILTERS,
    ...partial,
    customRules: Array.isArray(partial.customRules) ? [...partial.customRules] : [],
  };
}

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
    id: 'strong-buy-tech',
    name: 'Strong Buy (Tech & MA)',
    description: 'Konsensus TradingView Tech Rating & MA Rating berada di Buy / Strong Buy',
    isBuiltIn: true,
    tab: 'technicals',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      techRatingFilter: 'buy_or_strong',
      maRatingFilter: 'buy_or_strong',
    },
  },
  {
    id: 'bullish-patterns',
    name: 'Bullish Candlestick',
    description: 'Saham dengan pola candle pembalikan/lanjutan bullish (Engulfing, Hammer, Morning Star)',
    isBuiltIn: true,
    tab: 'technicals',
    filters: {
      ...DEFAULT_SCREENER_FILTERS,
      patternFilter: 'bullish',
    },
  },
  {
    id: 'oversold-pullback',
    name: 'Oversold Pullback (RSI < 30)',
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
  rsi14: 'RSI, 14',
  mom10: 'Mom, 10',
  awesomeOsc: 'Awesome Osc (AO)',
  cci20: 'CCI, 20',
  stochK: 'Stoch %K (14,3,3)',
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
  perf6m: 'Perf 6M (%)',
  perfYtd: 'Perf YTD (%)',
  perf1y: 'Perf 1Y (%)',
  volatility1m: 'Volatility 1M (%)',
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

function computeAwesomeOscLast(bars: OHLCVBar[]): { ao: number | null; prevAo: number | null } {
  if (bars.length < 34) return { ao: null, prevAo: null };
  const hl2 = bars.map((b) => (b.high + b.low) / 2);
  const sma5 = calcSMA(hl2, 5);
  const sma34 = calcSMA(hl2, 34);
  const last = bars.length - 1;
  const cur =
    sma5[last] !== undefined && sma34[last] !== undefined
      ? roundFinite((sma5[last] as number) - (sma34[last] as number), 4)
      : null;
  const prev =
    last > 0 && sma5[last - 1] !== undefined && sma34[last - 1] !== undefined
      ? roundFinite((sma5[last - 1] as number) - (sma34[last - 1] as number), 4)
      : null;
  return { ao: cur, prevAo: prev };
}

function computeCciLast(bars: OHLCVBar[], length = 20): { cci: number | null; prevCci: number | null } {
  if (bars.length < length) return { cci: null, prevCci: null };
  const tp = bars.map((b) => (b.high + b.low + b.close) / 3);
  const cciAt = (endIdx: number): number | null => {
    if (endIdx < length - 1) return null;
    let sum = 0;
    for (let i = endIdx - length + 1; i <= endIdx; i++) sum += tp[i];
    const mean = sum / length;
    let devSum = 0;
    for (let i = endIdx - length + 1; i <= endIdx; i++) devSum += Math.abs(tp[i] - mean);
    const meanDev = devSum / length;
    if (meanDev === 0) return 0;
    return roundFinite((tp[endIdx] - mean) / (0.015 * meanDev), 2);
  };
  return {
    cci: cciAt(bars.length - 1),
    prevCci: bars.length > length ? cciAt(bars.length - 2) : null,
  };
}

function computeStochLast(
  bars: OHLCVBar[],
  kLen = 14,
  kSmooth = 3,
  dSmooth = 3
): { stochK: number | null; stochD: number | null } {
  if (bars.length < kLen + kSmooth + dSmooth - 2) {
    return { stochK: null, stochD: null };
  }
  const rawK: Array<number | undefined> = new Array(bars.length).fill(undefined);
  for (let i = kLen - 1; i < bars.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kLen + 1; j <= i; j++) {
      if (bars[j].high > highest) highest = bars[j].high;
      if (bars[j].low < lowest) lowest = bars[j].low;
    }
    rawK[i] = highest === lowest ? 50 : ((bars[i].close - lowest) / (highest - lowest)) * 100;
  }
  const kSeries = calcSMA(rawK, kSmooth);
  const dSeries = calcSMA(kSeries, dSmooth);
  const lastIdx = bars.length - 1;
  return {
    stochK: roundFinite(kSeries[lastIdx], 2),
    stochD: roundFinite(dSeries[lastIdx], 2),
  };
}

function computeBollingerLast(
  closes: number[],
  sma20Val: number | null
): { bbUpper: number | null; bbLower: number | null; bbSignal: BollingerSignal | null } {
  if (closes.length < 20 || sma20Val === null) {
    return { bbUpper: null, bbLower: null, bbSignal: null };
  }
  const slice = closes.slice(-20);
  const variance = slice.reduce((acc, c) => acc + (c - sma20Val) ** 2, 0) / slice.length;
  const sd = Math.sqrt(Math.max(0, variance));
  const bbUpper = roundFinite(sma20Val + 2 * sd, 4);
  const bbLower = roundFinite(sma20Val - 2 * sd, 4);
  const lastPrice = closes[closes.length - 1];
  let bbSignal: BollingerSignal | null = 'inside';
  if (bbUpper !== null && lastPrice > bbUpper) bbSignal = 'above_upper';
  else if (bbLower !== null && lastPrice < bbLower) bbSignal = 'below_lower';
  return { bbUpper, bbLower, bbSignal };
}

function computeVolatilityPct(closes: number[], returnWindow: number): number | null {
  if (closes.length < returnWindow + 1) return null;
  const returns: number[] = [];
  const start = closes.length - returnWindow;
  for (let i = start; i < closes.length; i++) {
    const prev = closes[i - 1];
    const cur = closes[i];
    if (prev > 0 && Number.isFinite(cur) && Number.isFinite(prev)) {
      returns.push(((cur - prev) / prev) * 100);
    }
  }
  if (returns.length < Math.max(3, Math.floor(returnWindow * 0.7))) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return roundFinite(Math.sqrt(variance), 2);
}

export function detectCandlePattern(
  bars: OHLCVBar[]
): { pattern: CandlePatternId; sentiment: CandlePatternSentiment } | null {
  if (bars.length < 2) return null;
  const b0 = bars[bars.length - 1];
  const b1 = bars[bars.length - 2];
  const b2 = bars.length >= 3 ? bars[bars.length - 3] : null;

  const range0 = b0.high - b0.low;
  const range1 = b1.high - b1.low;
  if (!(range0 > 0) || !(range1 > 0)) return null;

  const body0 = Math.abs(b0.close - b0.open);
  const body1 = Math.abs(b1.close - b1.open);
  const upperShadow0 = b0.high - Math.max(b0.open, b0.close);
  const lowerShadow0 = Math.min(b0.open, b0.close) - b0.low;
  const isBull0 = b0.close > b0.open;
  const isBear0 = b0.close < b0.open;
  const isBull1 = b1.close > b1.open;
  const isBear1 = b1.close < b1.open;

  // 3-bar Morning Star
  if (b2) {
    const range2 = b2.high - b2.low;
    const body2 = Math.abs(b2.close - b2.open);
    const mid2 = (b2.open + b2.close) / 2;
    if (
      range2 > 0 &&
      b2.close < b2.open &&
      body2 >= range2 * 0.45 &&
      body1 <= range1 * 0.35 &&
      Math.max(b1.open, b1.close) <= Math.min(b2.open, b2.close) + body2 * 0.25 &&
      isBull0 &&
      b0.close >= mid2
    ) {
      return { pattern: 'morning_star', sentiment: 'bullish' };
    }
  }

  // Engulfing patterns
  if (isBear1 && isBull0 && body0 > body1 * 1.05 && b0.open <= b1.close && b0.close >= b1.open) {
    return { pattern: 'bullish_engulfing', sentiment: 'bullish' };
  }
  if (isBull1 && isBear0 && body0 > body1 * 1.05 && b0.open >= b1.close && b0.close <= b1.open) {
    return { pattern: 'bearish_engulfing', sentiment: 'bearish' };
  }

  // Doji variants (very thin open-close body <= 7% of total range)
  if (body0 <= range0 * 0.07) {
    if (lowerShadow0 >= range0 * 0.6 && upperShadow0 <= range0 * 0.15) {
      return { pattern: 'dragonfly_doji', sentiment: 'bullish' };
    }
    if (upperShadow0 >= range0 * 0.6 && lowerShadow0 <= range0 * 0.15) {
      return { pattern: 'gravestone_doji', sentiment: 'bearish' };
    }
    return { pattern: 'doji', sentiment: 'neutral' };
  }

  // Hammer / Shooting star (7%..35% body at top/bottom with long 2x+ shadow)
  if (body0 > range0 * 0.07 && body0 <= range0 * 0.35) {
    if (lowerShadow0 >= body0 * 2 && upperShadow0 <= body0 * 0.45) {
      return { pattern: 'hammer', sentiment: 'bullish' };
    }
    if (upperShadow0 >= body0 * 2 && lowerShadow0 <= body0 * 0.45) {
      return { pattern: 'shooting_star', sentiment: 'bearish' };
    }
  }

  // Strong Marubozu candles
  if (isBull0 && body0 >= range0 * 0.85) {
    return { pattern: 'marubozu_bull', sentiment: 'bullish' };
  }
  if (isBear0 && body0 >= range0 * 0.85) {
    return { pattern: 'marubozu_bear', sentiment: 'bearish' };
  }

  return null;
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
      sma20: null,
      sma50: options?.sma50Fallback ?? null,
      sma200: options?.sma200Fallback ?? null,
      bbUpper: null,
      bbLower: null,
      bbSignal: null,
      rsi14: null,
      mom10: null,
      awesomeOsc: null,
      cci20: null,
      stochK: null,
      stochD: null,
      macd: null,
      macdSignal: null,
      macdHist: null,
      candlePattern: null,
      candlePatternSentiment: null,
      perf1w: null,
      perf1m: null,
      perf3m: null,
      perf6m: null,
      perfYtd: null,
      perf1y: null,
      volatility1w: null,
      volatility1m: null,
      maScore: 0,
      maRating: 'Neutral',
      osScore: 0,
      osRating: 'Neutral',
      techScore: 0,
      techRating: 'Neutral',
      sparkline: [],
      barCount: 0,
    };
  }

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
  const sma20Arr = calcMovingAverageSeries(workBars, 'SMA', 20, 'close', 0);
  const sma50Arr = calcMovingAverageSeries(workBars, 'SMA', 50, 'close', 0);
  const sma200Arr = calcMovingAverageSeries(workBars, 'SMA', 200, 'close', 0);
  const rsiArr = computeRsiSeries(closes, 14);
  const macdObj = computeMacdLast(closes);
  const aoObj = computeAwesomeOscLast(workBars);
  const cciObj = computeCciLast(workBars, 20);
  const stochObj = computeStochLast(workBars, 14, 3, 3);

  const lastPrice = closes[lastIdx];
  const ema9 = roundFinite(ema9Arr[lastIdx], 4);
  const ema20 = roundFinite(ema20Arr[lastIdx], 4);
  const ema50 = roundFinite(ema50Arr[lastIdx], 4);
  const ema200 = roundFinite(ema200Arr[lastIdx], 4);
  const sma20 = roundFinite(sma20Arr[lastIdx], 4);
  const sma50 = roundFinite(sma50Arr[lastIdx], 4) ?? options?.sma50Fallback ?? null;
  const sma200 = roundFinite(sma200Arr[lastIdx], 4) ?? options?.sma200Fallback ?? null;
  const bb = computeBollingerLast(closes, sma20);
  const rsi14 = roundFinite(rsiArr[lastIdx], 2);
  const mom10 = closes.length > 10 ? roundFinite(lastPrice - closes[lastIdx - 10], 4) : null;

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

  const findCloseBeforeDays = (days: number): number | null => {
    const lastTs = workBars[lastIdx].timestamp;
    const targetTs = lastTs - days * 24 * 60 * 60 * 1000;
    for (let i = lastIdx - 1; i >= 0; i--) {
      if (workBars[i].timestamp <= targetTs) {
        return workBars[i].close;
      }
    }
    return null;
  };

  const findYtdBaseClose = (): number | null => {
    const lastYear = new Date(workBars[lastIdx].timestamp).getUTCFullYear();
    const jan1Ts = Date.UTC(lastYear, 0, 1);
    for (let i = lastIdx - 1; i >= 0; i--) {
      if (workBars[i].timestamp < jan1Ts) {
        return workBars[i].close;
      }
    }
    return null;
  };

  const perf1w = pctDiff(lastPrice, findCloseBeforeDays(7));
  const perf1m = pctDiff(lastPrice, findCloseBeforeDays(30));
  const perf3m = pctDiff(lastPrice, findCloseBeforeDays(90));
  const perf6m = pctDiff(lastPrice, findCloseBeforeDays(180));
  const perfYtd = pctDiff(lastPrice, findYtdBaseClose());
  const perf1y = pctDiff(lastPrice, findCloseBeforeDays(365));

  const volatility1w = computeVolatilityPct(closes, 5);
  const volatility1m = computeVolatilityPct(closes, 21);
  const detectedPattern = detectCandlePattern(workBars);

  // 1. Moving Averages Rating
  let maSum = 0;
  let maCount = 0;
  for (const ma of [ema9, sma20, ema20, ema50, sma50, ema200, sma200]) {
    if (ma === null) continue;
    maCount++;
    if (lastPrice > ma) maSum += 1;
    else if (lastPrice < ma) maSum -= 1;
  }
  const maScore = maCount > 0 ? roundFinite(maSum / maCount, 2) ?? 0 : 0;

  // 2. Oscillators Rating (RSI, Stoch, CCI, AO, Mom, MACD)
  let osSum = 0;
  let osCount = 0;
  if (rsi14 !== null) {
    osCount++;
    if (rsi14 < 30) osSum += 1;
    else if (rsi14 > 70) osSum -= 1;
  }
  if (stochObj.stochK !== null && stochObj.stochD !== null) {
    osCount++;
    if (stochObj.stochK < 20 && stochObj.stochK > stochObj.stochD) osSum += 1;
    else if (stochObj.stochK > 80 && stochObj.stochK < stochObj.stochD) osSum -= 1;
  }
  if (cciObj.cci !== null) {
    osCount++;
    if (cciObj.cci < -100 && (cciObj.prevCci === null || cciObj.cci > cciObj.prevCci)) osSum += 1;
    else if (cciObj.cci > 100 && (cciObj.prevCci === null || cciObj.cci < cciObj.prevCci)) osSum -= 1;
  }
  if (aoObj.ao !== null) {
    osCount++;
    if (aoObj.ao > 0 && (aoObj.prevAo === null || aoObj.ao > aoObj.prevAo)) osSum += 1;
    else if (aoObj.ao < 0 && (aoObj.prevAo === null || aoObj.ao < aoObj.prevAo)) osSum -= 1;
  }
  if (mom10 !== null) {
    osCount++;
    if (mom10 > 0) osSum += 1;
    else if (mom10 < 0) osSum -= 1;
  }
  if (macdObj.hist !== null) {
    osCount++;
    if (macdObj.hist > 0) osSum += 1;
    else if (macdObj.hist < 0) osSum -= 1;
  }
  const osScore = osCount > 0 ? roundFinite(osSum / osCount, 2) ?? 0 : 0;

  const techScore =
    maCount > 0 && osCount > 0
      ? roundFinite((maScore + osScore) / 2, 2) ?? 0
      : maCount > 0
        ? maScore
        : osScore;

  const sparkline = closes
    .slice(-30)
    .map((c) => roundFinite(c, 4))
    .filter((v): v is number => v !== null);

  return {
    ema9,
    ema9DiffPct: pctDiff(lastPrice, ema9),
    ema9Signal,
    ema20,
    ema20DiffPct: pctDiff(lastPrice, ema20),
    ema50,
    ema50DiffPct: pctDiff(lastPrice, ema50),
    ema200,
    sma20,
    sma50,
    sma200,
    bbUpper: bb.bbUpper,
    bbLower: bb.bbLower,
    bbSignal: bb.bbSignal,
    rsi14,
    mom10,
    awesomeOsc: aoObj.ao,
    cci20: cciObj.cci,
    stochK: stochObj.stochK,
    stochD: stochObj.stochD,
    macd: macdObj.macd,
    macdSignal: macdObj.signal,
    macdHist: macdObj.hist,
    candlePattern: detectedPattern?.pattern ?? null,
    candlePatternSentiment: detectedPattern?.sentiment ?? null,
    perf1w,
    perf1m,
    perf3m,
    perf6m,
    perfYtd,
    perf1y,
    volatility1w,
    volatility1m,
    maScore,
    maRating: scoreToTechRating(maScore),
    osScore,
    osRating: scoreToTechRating(osScore),
    techScore,
    techRating: scoreToTechRating(techScore),
    sparkline,
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

function matchesRatingFilter(rating: TechRatingLabel, filter: TechRatingFilter): boolean {
  switch (filter) {
    case 'strong_buy':
      return rating === 'Strong Buy';
    case 'buy_or_strong':
      return rating === 'Strong Buy' || rating === 'Buy';
    case 'sell_or_strong':
      return rating === 'Strong Sell' || rating === 'Sell';
    case 'all':
    default:
      return true;
  }
}

export function countActiveScreenerFilters(rawFilters: Partial<ScreenerFilterState>): number {
  const filters = normalizeScreenerFilters(rawFilters);
  let count = 0;
  if (filters.q.trim()) count++;
  if (filters.indexFilter !== 'ALL') count++;
  if (filters.sector !== 'All sectors') count++;
  if (filters.flaggedOnly) count++;
  if (filters.ema9Mode !== 'all') count++;
  if (filters.maTrendMode !== 'all') count++;
  if (filters.changeBand !== 'all') count++;
  if (filters.rvolMin !== null) count++;
  if (filters.minVolume !== null) count++;
  if (filters.rsiBand !== 'all') count++;
  if (filters.macdFilter !== 'all') count++;
  if (filters.techRatingFilter !== 'all') count++;
  if (filters.maRatingFilter !== 'all') count++;
  if (filters.osRatingFilter !== 'all') count++;
  if (filters.perfFilter !== 'all') count++;
  if (filters.patternFilter !== 'all') count++;
  if (filters.peMax !== null) count++;
  if (filters.divYieldMin !== null) count++;
  if (filters.marketCapBand !== 'all') count++;
  count += filters.customRules.length;
  return count;
}

export function filterScreenerRows(
  rows: ScreenerRow[],
  rawFilters: Partial<ScreenerFilterState>,
  options?: { flaggedSymbols?: ReadonlySet<string> }
): ScreenerRow[] {
  const filters = normalizeScreenerFilters(rawFilters);
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

    if (filters.indexFilter !== 'ALL' && !matchesIndexMembership(row.symbol, filters.indexFilter)) {
      return false;
    }

    if (filters.sector !== 'All sectors' && row.sector !== filters.sector) {
      return false;
    }

    if (filters.flaggedOnly) {
      const flaggedSet = options?.flaggedSymbols;
      if (!flaggedSet || !flaggedSet.has(row.symbol.toUpperCase())) return false;
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
      case 'above_ema50':
        if (row.ema50 === null || row.price <= row.ema50) return false;
        break;
      case 'below_ema50':
        if (row.ema50 === null || row.price >= row.ema50) return false;
        break;
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
      case 'cross_bb_upper':
        if (row.bbSignal !== 'above_upper') return false;
        break;
      case 'below_bb_lower':
        if (row.bbSignal !== 'below_lower') return false;
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

    if (!matchesRatingFilter(row.techRating, filters.techRatingFilter)) return false;
    if (!matchesRatingFilter(row.maRating, filters.maRatingFilter)) return false;
    if (!matchesRatingFilter(row.osRating, filters.osRatingFilter)) return false;

    switch (filters.perfFilter) {
      case '1w_up':
        if (row.perf1w === null || row.perf1w <= 0) return false;
        break;
      case '1m_up':
        if (row.perf1m === null || row.perf1m <= 0) return false;
        break;
      case '1m_up10':
        if (row.perf1m === null || row.perf1m < 10) return false;
        break;
      case '3m_up':
        if (row.perf3m === null || row.perf3m <= 0) return false;
        break;
      case 'ytd_up':
        if (row.perfYtd === null || row.perfYtd <= 0) return false;
        break;
      case '1m_down10':
        if (row.perf1m === null || row.perf1m > -10) return false;
        break;
      case 'all':
      default:
        break;
    }

    switch (filters.patternFilter) {
      case 'any':
        if (!row.candlePattern) return false;
        break;
      case 'bullish':
        if (row.candlePatternSentiment !== 'bullish') return false;
        break;
      case 'bearish':
        if (row.candlePatternSentiment !== 'bearish') return false;
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
    if (key === 'candlePattern') {
      const av = a.candlePattern ? CANDLE_PATTERN_META[a.candlePattern].label : '';
      const bv = b.candlePattern ? CANDLE_PATTERN_META[b.candlePattern].label : '';
      if (!av && !bv) return a.symbol.localeCompare(b.symbol);
      if (!av) return 1;
      if (!bv) return -1;
      return av.localeCompare(bv) * dir;
    }
    if (key === 'techRating' || key === 'maRating' || key === 'osRating') {
      const cmp = (TECH_RATING_RANK[a[key]] - TECH_RATING_RANK[b[key]]) * dir;
      if (cmp !== 0) return cmp;
      return a.symbol.localeCompare(b.symbol);
    }
    const av = a[key];
    const bv = b[key];
    const aNum = typeof av === 'number' && Number.isFinite(av) ? av : null;
    const bNum = typeof bv === 'number' && Number.isFinite(bv) ? bv : null;
    if (aNum === null && bNum === null) return a.symbol.localeCompare(b.symbol);
    if (aNum === null) return 1;
    if (bNum === null) return -1;
    if (aNum === bNum) return a.symbol.localeCompare(b.symbol);
    return (aNum - bNum) * dir;
  });
}

export interface TreemapItemInput<T> {
  id: string;
  weight: number;
  payload: T;
}

export interface TreemapRect<T> {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  payload: T;
}

export function layoutTreemapRects<T>(
  items: ReadonlyArray<TreemapItemInput<T>>,
  bounds: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 100, h: 100 }
): TreemapRect<T>[] {
  const valid = items
    .map((it) => ({ ...it, weight: Number.isFinite(it.weight) && it.weight > 0 ? it.weight : 1 }))
    .sort((a, b) => b.weight - a.weight);
  if (valid.length === 0 || bounds.w <= 0 || bounds.h <= 0) return [];

  const totalWeight = valid.reduce((sum, it) => sum + it.weight, 0);
  if (totalWeight <= 0) return [];

  const recurse = (
    list: typeof valid,
    listWeight: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): TreemapRect<T>[] => {
    if (list.length === 1) {
      return [{ id: list[0].id, x, y, w, h, payload: list[0].payload }];
    }
    // Split into two balanced weight halves so tiles maintain readable proportions
    let halfWeight = 0;
    let splitIdx = 1;
    for (let i = 0; i < list.length - 1; i++) {
      halfWeight += list[i].weight;
      splitIdx = i + 1;
      if (halfWeight >= listWeight * 0.45) break;
    }
    const leftList = list.slice(0, splitIdx);
    const rightList = list.slice(splitIdx);
    const leftWeight = leftList.reduce((s, it) => s + it.weight, 0);
    const rightWeight = listWeight - leftWeight;
    const ratio = listWeight > 0 ? leftWeight / listWeight : 0.5;

    if (w >= h) {
      const lw = w * ratio;
      return [
        ...recurse(leftList, leftWeight, x, y, lw, h),
        ...recurse(rightList, rightWeight, x + lw, y, w - lw, h),
      ];
    }
    const lh = h * ratio;
    return [
      ...recurse(leftList, leftWeight, x, y, w, lh),
      ...recurse(rightList, rightWeight, x, y + lh, w, h - lh),
    ];
  };

  return recurse(valid, totalWeight, bounds.x, bounds.y, bounds.w, bounds.h);
}
