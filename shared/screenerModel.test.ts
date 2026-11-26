import test from 'node:test';
import assert from 'node:assert/strict';
import { TIMEFRAMES, getTimeframeByKey, type OHLCVBar } from './timeframes';
import {
  BUILT_IN_SCREENER_PRESETS,
  DEFAULT_SCREENER_FILTERS,
  SCREENER_FETCH_SPEC,
  SCREENER_TIMEFRAMES,
  computeScreenerTechnicals,
  countActiveScreenerFilters,
  detectCandlePattern,
  filterScreenerRows,
  formatEmaFilterLabel,
  layoutTreemapRects,
  matchesIndexMembership,
  normalizeScreenerFilters,
  normalizeScreenerTimeframe,
  resolveRowEma,
  sortScreenerRows,
  type ScreenerRow,
} from './screenerModel';

function buildRisingBars(count: number, startPrice = 100, step = 2): OHLCVBar[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const baseTs = Date.UTC(2025, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const close = startPrice + i * step;
    return {
      timestamp: baseTs + i * dayMs,
      open: close - 1,
      high: close + 2,
      low: close - 2,
      close,
      volume: 1_000_000 + i * 10_000,
    };
  });
}

test('computeScreenerTechnicals detects Price > EMA 9 on steady uptrend and computes TradingView oscillators & split ratings', () => {
  const bars = buildRisingBars(80, 100, 1.5);
  const snap = computeScreenerTechnicals(bars);

  assert.ok(snap.ema9 !== null);
  assert.ok(snap.ema20 !== null);
  assert.ok(snap.sma50 !== null);
  assert.ok(bars[bars.length - 1].close > (snap.ema9 as number));
  assert.equal(snap.ema9Signal, 'above');
  assert.ok((snap.ema9DiffPct ?? 0) > 0);
  assert.ok(snap.rsi14 !== null && snap.rsi14 > 70);
  assert.ok(snap.mom10 !== null && snap.mom10 > 0);
  assert.ok(snap.awesomeOsc !== null);
  assert.ok(snap.cci20 !== null);
  assert.ok(snap.stochK !== null && snap.stochD !== null);
  assert.ok(snap.bbUpper !== null && snap.bbLower !== null);
  assert.ok(snap.macdHist !== null);
  assert.equal(snap.maRating, 'Strong Buy');
  assert.ok(snap.techRating === 'Buy' || snap.techRating === 'Strong Buy');
  assert.equal(snap.sparkline.length, 30);
});

test('computeScreenerTechnicals detects exact cross_above EMA 9 signal on breakout candle', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const baseTs = Date.UTC(2025, 0, 1);
  const bars: OHLCVBar[] = Array.from({ length: 20 }, (_, i) => ({
    timestamp: baseTs + i * dayMs,
    open: 100,
    high: 101,
    low: 95,
    close: i === 19 ? 112 : i === 18 ? 95 : 100 - (i % 2 === 0 ? 1 : 2),
    volume: 1_000_000,
  }));

  const snap = computeScreenerTechnicals(bars);
  assert.equal(snap.ema9Signal, 'cross_above');
  assert.ok((snap.ema9DiffPct ?? 0) > 0);
});

test('detectCandlePattern identifies Bullish Engulfing and Hammer cleanly', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const baseTs = Date.UTC(2026, 0, 1);

  const engulfBars: OHLCVBar[] = [
    { timestamp: baseTs, open: 100, high: 101, low: 97, close: 98, volume: 1000 },
    { timestamp: baseTs + dayMs, open: 102, high: 103, low: 98, close: 99, volume: 1200 },
    { timestamp: baseTs + 2 * dayMs, open: 98, high: 105, low: 97.5, close: 104, volume: 1800 },
  ];
  assert.deepEqual(detectCandlePattern(engulfBars), {
    pattern: 'bullish_engulfing',
    sentiment: 'bullish',
  });

  const hammerBars: OHLCVBar[] = [
    { timestamp: baseTs, open: 105, high: 106, low: 102, close: 103, volume: 1000 },
    { timestamp: baseTs + dayMs, open: 98, high: 100, low: 90, close: 99.8, volume: 1500 },
  ];
  assert.deepEqual(detectCandlePattern(hammerBars), {
    pattern: 'hammer',
    sentiment: 'bullish',
  });

  const dojiBars: OHLCVBar[] = [
    { timestamp: baseTs, open: 105, high: 106, low: 102, close: 103, volume: 1000 },
    { timestamp: baseTs + dayMs, open: 99.7, high: 100, low: 90, close: 99.8, volume: 1500 },
  ];
  assert.deepEqual(detectCandlePattern(dojiBars), {
    pattern: 'dragonfly_doji',
    sentiment: 'bullish',
  });
});

test('filterScreenerRows filters EMA 9, Index (LQ45), Flagged, Patterns, and custom rules cleanly', () => {
  const baseTech = computeScreenerTechnicals(buildRisingBars(60, 100, 1));
  const rows: ScreenerRow[] = [
    {
      ...baseTech,
      symbol: 'BBCA.JK',
      shortName: 'Bank Central Asia',
      exchange: 'IDX',
      country: 'ID',
      sector: 'Finance',
      currency: 'IDR',
      price: 10_200,
      change: 250,
      changePercent: 2.51,
      volume: 85_000_000,
      avgVolume10d: 40_000_000,
      avgVolume3m: 45_000_000,
      relVolume: 2.13,
      marketCap: 1_250e12,
      trailingPE: 21.5,
      forwardPE: 19.2,
      priceToBook: 4.3,
      epsTTM: 474,
      epsForward: 530,
      bookValue: 2370,
      divYieldPct: 2.8,
      divRate: 285,
      beta: 0.85,
      analystRating: '1.6 - Buy',
      fiftyTwoWeekLow: 8700,
      fiftyTwoWeekHigh: 10950,
      fiftyTwoWeekRangePos: 66.7,
      ema9: 9950,
      ema9DiffPct: 2.51,
      ema9Signal: 'cross_above',
      ema20: 9800,
      ema20DiffPct: 4.08,
      ema50: 9600,
      ema50DiffPct: 6.25,
      sma50: 9550,
      sma200: 9300,
      rsi14: 61.4,
      macdHist: 35.2,
      candlePattern: 'bullish_engulfing',
      candlePatternSentiment: 'bullish',
      maRating: 'Strong Buy',
      osRating: 'Buy',
      techRating: 'Strong Buy',
    },
    {
      ...baseTech,
      symbol: 'GOTO.JK',
      shortName: 'GoTo Gojek Tokopedia',
      exchange: 'IDX',
      country: 'ID',
      sector: 'Technology Services',
      currency: 'IDR',
      price: 62,
      change: -2,
      changePercent: -3.12,
      volume: 1_200_000_000,
      avgVolume10d: 1_500_000_000,
      avgVolume3m: 1_400_000_000,
      relVolume: 0.8,
      marketCap: 74e12,
      trailingPE: null,
      forwardPE: null,
      priceToBook: 1.9,
      epsTTM: -5,
      epsForward: -2,
      bookValue: 32,
      divYieldPct: null,
      divRate: null,
      beta: 1.4,
      analystRating: '2.5 - Hold',
      fiftyTwoWeekLow: 50,
      fiftyTwoWeekHigh: 90,
      fiftyTwoWeekRangePos: 30,
      ema9: 65,
      ema9DiffPct: -4.62,
      ema9Signal: 'below',
      ema20: 68,
      ema20DiffPct: -8.82,
      ema50: 71,
      ema50DiffPct: -12.68,
      sma50: 72,
      sma200: 74,
      rsi14: 26.5,
      macdHist: -1.4,
      candlePattern: null,
      candlePatternSentiment: null,
      maRating: 'Sell',
      osRating: 'Neutral',
      techRating: 'Sell',
    },
  ];

  // Above EMA 9 preset
  const abovePreset = BUILT_IN_SCREENER_PRESETS.find((p) => p.id === 'above-ema9')!;
  const aboveMatches = filterScreenerRows(rows, abovePreset.filters);
  assert.deepEqual(
    aboveMatches.map((r) => r.symbol),
    ['BBCA.JK']
  );

  // Breakout cross above EMA 9
  const crossMatches = filterScreenerRows(rows, {
    ...DEFAULT_SCREENER_FILTERS,
    ema9Mode: 'cross_above_ema9',
  });
  assert.deepEqual(
    crossMatches.map((r) => r.symbol),
    ['BBCA.JK']
  );

  // Oversold RSI < 30
  const oversoldMatches = filterScreenerRows(rows, {
    ...DEFAULT_SCREENER_FILTERS,
    rsiBand: 'oversold',
  });
  assert.deepEqual(
    oversoldMatches.map((r) => r.symbol),
    ['GOTO.JK']
  );

  // Index membership filter (INFOBANK15 has BBCA.JK, not GOTO.JK)
  assert.equal(matchesIndexMembership('BBCA.JK', 'INFOBANK15'), true);
  assert.equal(matchesIndexMembership('GOTO.JK', 'INFOBANK15'), false);
  const infobankMatches = filterScreenerRows(rows, {
    ...DEFAULT_SCREENER_FILTERS,
    indexFilter: 'INFOBANK15',
  });
  assert.deepEqual(
    infobankMatches.map((r) => r.symbol),
    ['BBCA.JK']
  );

  // Flagged-only filter & Candlestick pattern filter
  const flaggedMatches = filterScreenerRows(
    rows,
    { ...DEFAULT_SCREENER_FILTERS, flaggedOnly: true, patternFilter: 'bullish' },
    { flaggedSymbols: new Set(['BBCA.JK']) }
  );
  assert.deepEqual(
    flaggedMatches.map((r) => r.symbol),
    ['BBCA.JK']
  );

  // Backwards-compatible legacy filter normalization
  const legacyNormalized = normalizeScreenerFilters({ ema9Mode: 'above_ema9' });
  assert.equal(legacyNormalized.indexFilter, 'ALL');
  assert.equal(legacyNormalized.patternFilter, 'all');

  // Custom numeric rule: ema9DiffPct >= 2
  const customMatches = filterScreenerRows(rows, {
    ...DEFAULT_SCREENER_FILTERS,
    customRules: [
      { id: 'r1', field: 'ema9DiffPct', operator: 'gte', value: 2 },
    ],
  });
  assert.deepEqual(
    customMatches.map((r) => r.symbol),
    ['BBCA.JK']
  );

  assert.equal(countActiveScreenerFilters(abovePreset.filters), 1);

  const sortedByPe = sortScreenerRows(rows, { key: 'trailingPE', direction: 'asc' });
  assert.deepEqual(
    sortedByPe.map((r) => r.symbol),
    ['BBCA.JK', 'GOTO.JK']
  );
});

test('layoutTreemapRects partitions bounds into non-overlapping proportional tiles', () => {
  const rects = layoutTreemapRects(
    [
      { id: 'A', weight: 60, payload: 'A' },
      { id: 'B', weight: 30, payload: 'B' },
      { id: 'C', weight: 10, payload: 'C' },
    ],
    { x: 0, y: 0, w: 100, h: 100 }
  );

  assert.equal(rects.length, 3);
  const totalArea = rects.reduce((s, r) => s + r.w * r.h, 0);
  assert.ok(Math.abs(totalArea - 10_000) < 0.01);
  for (const r of rects) {
    assert.ok(r.w > 0 && r.h > 0);
    assert.ok(r.x >= 0 && r.y >= 0);
  }
});

test('manual EMA period and (>, <, <=, >=) operators evaluate dynamically via closeHistory', () => {
  const upTech = computeScreenerTechnicals(buildRisingBars(40, 100, 2)); // rising: price > any EMA
  const flatBars = Array.from({ length: 40 }, (_, i) => ({
    timestamp: Date.UTC(2025, 0, 1) + i * 86_400_000,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 1000,
  }));
  const flatTech = computeScreenerTechnicals(flatBars); // price === 100 === EMA(21)

  const makeRow = (sym: string, price: number, tech: typeof upTech): ScreenerRow => ({
    ...tech,
    symbol: sym,
    shortName: sym,
    exchange: 'IDX',
    country: 'ID',
    sector: 'Finance',
    currency: 'IDR',
    price,
    change: 0,
    changePercent: 0,
    volume: 1_000_000,
    avgVolume10d: 1_000_000,
    avgVolume3m: 1_000_000,
    relVolume: 1,
    marketCap: 10e12,
    trailingPE: 12,
    forwardPE: 11,
    priceToBook: 1.5,
    epsTTM: 10,
    epsForward: 12,
    bookValue: 50,
    divYieldPct: 2,
    divRate: 10,
    beta: 1,
    analystRating: 'Buy',
    fiftyTwoWeekLow: 80,
    fiftyTwoWeekHigh: 200,
    fiftyTwoWeekRangePos: 50,
  });

  const upRow = makeRow('UP.JK', 178, upTech);
  const eqRow = makeRow('EQ.JK', 100, flatTech);
  const downTech = computeScreenerTechnicals(buildRisingBars(40, 200, -2)); // falling: price < EMA(21)
  const downRow = makeRow('DOWN.JK', 122, downTech);
  const rows = [upRow, eqRow, downRow];

  // Dynamic EMA(21) calculation from closeHistory
  assert.ok(resolveRowEma(upRow, 21).value !== null);
  assert.equal(resolveRowEma(eqRow, 21).value, 100);

  // Operators against custom EMA 21
  assert.deepEqual(
    filterScreenerRows(rows, { ...DEFAULT_SCREENER_FILTERS, ema9Mode: 'gt', emaPeriod: 21 }).map((r) => r.symbol),
    ['UP.JK']
  );
  assert.deepEqual(
    filterScreenerRows(rows, { ...DEFAULT_SCREENER_FILTERS, ema9Mode: 'gte', emaPeriod: 21 }).map((r) => r.symbol),
    ['UP.JK', 'EQ.JK']
  );
  assert.deepEqual(
    filterScreenerRows(rows, { ...DEFAULT_SCREENER_FILTERS, ema9Mode: 'lt', emaPeriod: 21 }).map((r) => r.symbol),
    ['DOWN.JK']
  );
  assert.deepEqual(
    filterScreenerRows(rows, { ...DEFAULT_SCREENER_FILTERS, ema9Mode: 'lte', emaPeriod: 21 }).map((r) => r.symbol),
    ['EQ.JK', 'DOWN.JK']
  );

  // Label formatting & custom EMA sort
  assert.equal(formatEmaFilterLabel('lte', 21), 'Harga <= EMA 21');
  assert.equal(formatEmaFilterLabel('gte', 50), 'Harga >= EMA 50');
  const sortedByEma21Diff = sortScreenerRows(rows, { key: 'ema9DiffPct', direction: 'desc' }, { emaPeriod: 21 });
  assert.deepEqual(
    sortedByEma21Diff.map((r) => r.symbol),
    ['UP.JK', 'EQ.JK', 'DOWN.JK']
  );
});

test('screener timeframes cover all 18 chart TIMEFRAMES and respect Yahoo retention bounds', () => {
  assert.equal(SCREENER_TIMEFRAMES.length, 18);
  assert.deepEqual(
    SCREENER_TIMEFRAMES,
    TIMEFRAMES.map((t) => t.key)
  );

  // Legacy 1w alias maps cleanly to canonical 1wk
  assert.equal(normalizeScreenerTimeframe('1w'), '1wk');
  assert.equal(normalizeScreenerTimeframe('1W'), '1wk');
  assert.equal(normalizeScreenerTimeframe('4H'), '4h');
  assert.equal(normalizeScreenerTimeframe('12M'), '1d'); // unknown falls back safely to 1d
  assert.equal(normalizeScreenerTimeframe('1y'), '1y');
  assert.equal(normalizeScreenerTimeframe('invalid'), '1d');

  for (const tf of SCREENER_TIMEFRAMES) {
    assert.equal(normalizeScreenerTimeframe(tf), tf);
    const cfg = getTimeframeByKey(tf);
    assert.ok(cfg, `Expected TimeframeDefinition for ${tf}`);
    const spec = SCREENER_FETCH_SPEC[tf];
    assert.ok(spec.lookbackDays > 0);
    assert.ok(spec.ttlMs > 0);
    if (cfg.daysBack !== null) {
      assert.ok(
        spec.lookbackDays <= cfg.daysBack,
        `${tf} lookbackDays (${spec.lookbackDays}) must fit Yahoo daysBack (${cfg.daysBack})`
      );
    }
    if (cfg.maxDaysPerRequest) {
      assert.ok(
        spec.lookbackDays <= cfg.maxDaysPerRequest,
        `${tf} lookbackDays (${spec.lookbackDays}) should stay within single request limit (${cfg.maxDaysPerRequest})`
      );
    }
  }
});
