import test from 'node:test';
import assert from 'node:assert/strict';
import type { OHLCVBar } from './timeframes';
import {
  BUILT_IN_SCREENER_PRESETS,
  DEFAULT_SCREENER_FILTERS,
  computeScreenerTechnicals,
  countActiveScreenerFilters,
  filterScreenerRows,
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

test('computeScreenerTechnicals detects Price > EMA 9 on steady uptrend and computes RSI/MACD', () => {
  const bars = buildRisingBars(80, 100, 1.5);
  const snap = computeScreenerTechnicals(bars);

  assert.ok(snap.ema9 !== null);
  assert.ok(snap.ema20 !== null);
  assert.ok(snap.sma50 !== null);
  assert.ok(bars[bars.length - 1].close > (snap.ema9 as number));
  assert.equal(snap.ema9Signal, 'above');
  assert.ok((snap.ema9DiffPct ?? 0) > 0);
  assert.ok(snap.rsi14 !== null && snap.rsi14 > 70);
  assert.ok(snap.macdHist !== null);
  assert.ok(snap.techRating === 'Buy' || snap.techRating === 'Strong Buy');
});

test('computeScreenerTechnicals detects exact cross_above EMA 9 signal on breakout candle', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const baseTs = Date.UTC(2025, 0, 1);
  // 19 bars around 100 ending with a dip to 95 below EMA9, then final breakout bar to 112
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

test('filterScreenerRows filters Harga di atas EMA 9, Golden Stack, RSI oversold, and custom rules cleanly', () => {
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

  // Count active filters
  assert.equal(countActiveScreenerFilters(abovePreset.filters), 1);

  // Sorting pushes nulls cleanly to bottom and orders numerically
  const sortedByPe = sortScreenerRows(rows, { key: 'trailingPE', direction: 'asc' });
  assert.deepEqual(
    sortedByPe.map((r) => r.symbol),
    ['BBCA.JK', 'GOTO.JK']
  );
});
