import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIMEFRAMES,
  alignBucketBoundary,
  buildFetchWindows,
  buildFetchWindowsForRange,
  computePaginatedRange,
  getTimeframeByKey,
  hasReachedEarliestHistory,
  periodToTimeframeKey,
  normalizeAndValidateSymbol,
  normalizeQuotesToBars,
  parseFirstTradeDateMs,
  resampleBars,
  computeQuoteSummary,
  getPricePrecision,
} from './timeframes';

test('TIMEFRAMES contains all 18 complete timeframes with unique keys and round-trip periods', () => {
  assert.equal(TIMEFRAMES.length, 18);
  const keys = new Set(TIMEFRAMES.map((t) => t.key));
  assert.equal(keys.size, 18);

  for (const tf of TIMEFRAMES) {
    assert.equal(getTimeframeByKey(tf.key), tf);
    assert.equal(periodToTimeframeKey(tf.period), tf.key);
  }
});

test('normalizeAndValidateSymbol accepts valid Yahoo Finance tickers and rejects unsafe inputs', () => {
  assert.equal(normalizeAndValidateSymbol(' bbca.jk '), 'BBCA.JK');
  assert.equal(normalizeAndValidateSymbol('^JKSE'), '^JKSE');
  assert.equal(normalizeAndValidateSymbol('USDIDR=X'), 'USDIDR=X');
  assert.equal(normalizeAndValidateSymbol('BTC-USD'), 'BTC-USD');
  assert.equal(normalizeAndValidateSymbol('GC=F'), 'GC=F');

  assert.equal(normalizeAndValidateSymbol(''), null);
  assert.equal(normalizeAndValidateSymbol('../etc/passwd'), null);
  assert.equal(normalizeAndValidateSymbol('AAPL; rm -rf /'), null);
  assert.equal(normalizeAndValidateSymbol('<script>alert(1)</script>'), null);
  assert.equal(normalizeAndValidateSymbol('A'.repeat(25)), null);
});

test('resampleBars aggregates 1m bars into accurate 3m OHLCV candles', () => {
  const base = Date.UTC(2026, 0, 1, 9, 0, 0); // 09:00:00 UTC (divisible by 3m)
  const bars = [
    { timestamp: base, open: 100, high: 105, low: 98, close: 102, volume: 10 },
    { timestamp: base + 60_000, open: 102, high: 110, low: 101, close: 108, volume: 25 },
    { timestamp: base + 120_000, open: 108, high: 109, low: 95, close: 99, volume: 15 },
    // Next 3m bucket
    { timestamp: base + 180_000, open: 99, high: 104, low: 99, close: 103, volume: 30 },
  ];

  const resampled = resampleBars(bars, 3 * 60 * 1000);
  assert.equal(resampled.length, 2);

  assert.deepEqual(resampled[0], {
    timestamp: base,
    open: 100,
    high: 110,
    low: 95,
    close: 99,
    volume: 50,
  });

  assert.deepEqual(resampled[1], {
    timestamp: base + 180_000,
    open: 99,
    high: 104,
    low: 99,
    close: 103,
    volume: 30,
  });
});

test('resampleBars aggregates monthly bars into yearly candles for 1Y timeframe', () => {
  const bars = [
    { timestamp: Date.UTC(2024, 0, 1), open: 10, high: 15, low: 9, close: 14, volume: 100 },
    { timestamp: Date.UTC(2024, 6, 1), open: 14, high: 20, low: 12, close: 18, volume: 200 },
    { timestamp: Date.UTC(2025, 0, 1), open: 18, high: 22, low: 17, close: 21, volume: 150 },
  ];

  const yearly = resampleBars(bars, 'YEAR');
  assert.equal(yearly.length, 2);
  assert.equal(yearly[0].timestamp, Date.UTC(2024, 0, 1));
  assert.equal(yearly[0].open, 10);
  assert.equal(yearly[0].high, 20);
  assert.equal(yearly[0].low, 9);
  assert.equal(yearly[0].close, 18);
  assert.equal(yearly[0].volume, 300);

  assert.equal(yearly[1].timestamp, Date.UTC(2025, 0, 1));
  assert.equal(yearly[1].close, 21);
});

test('resampleBars aggregates monthly bars into semi-annual candles for 6mo timeframe', () => {
  const bars = [
    { timestamp: Date.UTC(2025, 0, 1), open: 100, high: 120, low: 95, close: 110, volume: 50 },
    { timestamp: Date.UTC(2025, 4, 1), open: 110, high: 135, low: 105, close: 130, volume: 80 },
    { timestamp: Date.UTC(2025, 6, 1), open: 130, high: 140, low: 120, close: 125, volume: 60 },
    { timestamp: Date.UTC(2025, 11, 1), open: 125, high: 150, low: 118, close: 145, volume: 90 },
  ];

  const halfYearly = resampleBars(bars, 'SIX_MONTHS');
  assert.equal(halfYearly.length, 2);
  assert.equal(halfYearly[0].timestamp, Date.UTC(2025, 0, 1));
  assert.equal(halfYearly[0].open, 100);
  assert.equal(halfYearly[0].high, 135);
  assert.equal(halfYearly[0].low, 95);
  assert.equal(halfYearly[0].close, 130);
  assert.equal(halfYearly[0].volume, 130);

  assert.equal(halfYearly[1].timestamp, Date.UTC(2025, 6, 1));
  assert.equal(halfYearly[1].open, 130);
  assert.equal(halfYearly[1].high, 150);
  assert.equal(halfYearly[1].low, 118);
  assert.equal(halfYearly[1].close, 145);
  assert.equal(halfYearly[1].volume, 150);
});

test('normalizeQuotesToBars filters malformed rows, sorts chronologically, and deduplicates', () => {
  const t1 = Date.UTC(2026, 2, 1);
  const t2 = Date.UTC(2026, 2, 2);
  const normalized = normalizeQuotesToBars([
    { date: new Date(t2), open: 20, high: 22, low: 19, close: 21, volume: 500 },
    { date: new Date(t1), open: null, high: 12, low: 10, close: 11, volume: 100 },
    { date: new Date(t1), open: 10, high: 12, low: 9, close: 11, volume: 200 },
    { date: new Date(t1), open: 10, high: 13, low: 9, close: 12, volume: 250 },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].timestamp, t1);
  assert.equal(normalized[0].close, 12);
  assert.equal(normalized[1].timestamp, t2);
});

test('computeQuoteSummary calculates change and percentage accurately', () => {
  const summary = computeQuoteSummary(
    { regularMarketPrice: 9500, previousClose: 9000, regularMarketDayHigh: 9600, regularMarketDayLow: 8950, regularMarketVolume: 123456 },
    []
  );
  assert.equal(summary.price, 9500);
  assert.equal(summary.change, 500);
  assert.equal(Number(summary.changePercent.toFixed(2)), 5.56);
  assert.equal(summary.dayHigh, 9600);
  assert.equal(summary.dayLow, 8950);
  assert.equal(summary.volume, 123456);
});

test('computeQuoteSummary prefers previous daily bar over stale 10-year chartPreviousClose', () => {
  const bars = [
    { timestamp: Date.UTC(2026, 10, 23), open: 5600, high: 5700, low: 5580, close: 5675, volume: 100 },
    { timestamp: Date.UTC(2026, 10, 24), open: 5775, high: 5850, low: 5750, close: 5800, volume: 200 },
  ];
  const summary = computeQuoteSummary(
    {
      regularMarketPrice: 5800,
      chartPreviousClose: 2905, // 10 years ago!
      isIntraday: false,
    },
    bars
  );
  assert.equal(summary.prevClose, 5675);
  assert.equal(summary.change, 125);
  assert.equal(Number(summary.changePercent.toFixed(2)), 2.2);
});

test('getPricePrecision returns appropriate decimal places by market', () => {
  assert.equal(getPricePrecision('BBCA.JK', 5800), 0);
  assert.equal(getPricePrecision('EURUSD=X', 1.0842), 4);
  assert.equal(getPricePrecision('USDIDR=X', 15850), 2);
  assert.equal(getPricePrecision('AAPL', 225.4), 2);
  assert.equal(getPricePrecision('DOGE-USD', 0.1425), 5);
});

test('buildFetchWindows chunks 1m and 3m 30-day lookbacks into contiguous <=7-day Yahoo windows', () => {
  const nowMs = Date.UTC(2026, 10, 24, 12, 0, 0);
  const tf1m = getTimeframeByKey('1m')!;
  const tf3m = getTimeframeByKey('3m')!;
  const tf5m = getTimeframeByKey('5m')!;

  assert.ok(tf1m.daysBack !== null && tf1m.daysBack >= 29 && tf1m.maxDaysPerRequest === 7);
  assert.ok(tf3m.daysBack !== null && tf3m.daysBack >= 29 && tf3m.maxDaysPerRequest === 7);
  assert.ok(tf5m.daysBack !== null && tf5m.daysBack >= 30);

  const windows = buildFetchWindows(nowMs, tf1m.daysBack, tf1m.maxDaysPerRequest);
  assert.equal(windows.length, 5);
  assert.equal(windows[0].period2.getTime(), nowMs);

  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 0; i < windows.length; i++) {
    const spanDays = (windows[i].period2.getTime() - windows[i].period1.getTime()) / dayMs;
    assert.ok(spanDays > 0 && spanDays <= 7.001, `Window ${i} exceeded 7d: ${spanDays}`);
    if (i > 0) {
      // Contiguous with no gaps
      assert.equal(windows[i].period2.getTime(), windows[i - 1].period1.getTime());
    }
  }
  const totalSpanDays = (nowMs - windows[windows.length - 1].period1.getTime()) / dayMs;
  assert.equal(totalSpanDays, tf1m.daysBack);

  // Non-chunked timeframe returns a single window
  const single = buildFetchWindows(nowMs, tf5m.daysBack, tf5m.maxDaysPerRequest);
  assert.equal(single.length, 1);
  assert.equal((nowMs - single[0].period1.getTime()) / dayMs, tf5m.daysBack);
});

test('TIMEFRAMES defines valid lazy-loading initialDays, chunkDays, and IPO/intraday horizons', () => {
  for (const tf of TIMEFRAMES) {
    assert.ok(tf.initialDays > 0, `${tf.key} initialDays missing`);
    assert.ok(tf.chunkDays > 0, `${tf.key} chunkDays missing`);
    if (tf.group === 'days') {
      assert.equal(tf.daysBack, null, `${tf.key} should allow unbounded history back to IPO`);
    } else {
      assert.ok(tf.daysBack !== null && tf.daysBack > 0, `${tf.key} missing intraday horizon`);
    }
  }
});

test('computePaginatedRange steps 1m backwards within Yahoo 30d & 7d-per-request limits cleanly', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const nowMs = Date.UTC(2026, 10, 26, 9, 0, 0);
  const tf1m = getTimeframeByKey('1m')!;

  const step1 = computePaginatedRange({ cfg: tf1m, nowMs });
  assert.equal(step1.exhausted, false);
  assert.equal(step1.hasMoreBeforeStart, true);
  assert.ok(step1.nextCursor !== null);
  assert.ok(step1.fetchEndMs - step1.fetchStartMs <= 7 * dayMs);

  let cursor: number | null = step1.nextCursor;
  let steps = 1;
  while (cursor !== null) {
    const prevEnd: number = cursor;
    const nextPlan: ReturnType<typeof computePaginatedRange> = computePaginatedRange({
      cfg: tf1m,
      nowMs,
      beforeCursorMs: prevEnd,
    });
    assert.equal(nextPlan.exhausted, false);
    assert.equal(nextPlan.windowEndMs, prevEnd);
    assert.ok(nextPlan.windowStartMs < nextPlan.windowEndMs);
    assert.ok(nextPlan.fetchEndMs - nextPlan.fetchStartMs <= 7 * dayMs);
    assert.ok(nextPlan.fetchStartMs >= nowMs - 29.5 * dayMs);
    const windows = buildFetchWindowsForRange(
      nextPlan.fetchStartMs,
      nextPlan.fetchEndMs,
      tf1m.maxDaysPerRequest
    );
    assert.equal(windows.length, 1);
    cursor = nextPlan.nextCursor;
    steps += 1;
    assert.ok(steps <= 6, 'Exceeded expected chunk count for 29.5d horizon');
  }

  assert.equal(steps, 5);
  // Querying past floor yields exhausted=true
  const beyondFloor = computePaginatedRange({
    cfg: tf1m,
    nowMs,
    beforeCursorMs: nowMs - 29.5 * dayMs,
  });
  assert.equal(beyondFloor.exhausted, true);
  assert.equal(beyondFloor.hasMoreBeforeStart, false);
});

test('computePaginatedRange aligns resampled buckets (1y, 6mo, 4h, 3m) with zero split boundaries', () => {
  const nowMs = Date.UTC(2026, 10, 26, 9, 37, 0);

  const tf1y = getTimeframeByKey('1y')!;
  const p1yInit = computePaginatedRange({ cfg: tf1y, nowMs });
  assert.equal(p1yInit.windowStartMs, Date.UTC(new Date(p1yInit.windowStartMs).getUTCFullYear(), 0, 1));
  const p1yNext = computePaginatedRange({
    cfg: tf1y,
    nowMs,
    beforeCursorMs: p1yInit.nextCursor,
  });
  assert.equal(p1yNext.windowEndMs, p1yInit.windowStartMs);
  assert.equal(
    p1yNext.windowStartMs,
    Date.UTC(new Date(p1yNext.windowStartMs).getUTCFullYear(), 0, 1)
  );

  const tf6mo = getTimeframeByKey('6mo')!;
  const p6mo = computePaginatedRange({ cfg: tf6mo, nowMs });
  const m6 = new Date(p6mo.windowStartMs).getUTCMonth();
  assert.ok(m6 === 0 || m6 === 6);

  const tf4h = getTimeframeByKey('4h')!;
  const p4h = computePaginatedRange({ cfg: tf4h, nowMs });
  assert.equal(p4h.windowStartMs % (4 * 60 * 60 * 1000), 0);

  const tf3m = getTimeframeByKey('3m')!;
  const p3m = computePaginatedRange({ cfg: tf3m, nowMs });
  assert.equal(p3m.windowStartMs % (3 * 60 * 1000), 0);
  const ceilAligned = alignBucketBoundary(nowMs - 29.5 * 24 * 60 * 60 * 1000, tf3m.resampleMs, 'ceil');
  assert.equal(ceilAligned % (3 * 60 * 1000), 0);
});

test('hasReachedEarliestHistory and parseFirstTradeDateMs detect IPO cutoffs cleanly', () => {
  const nowMs = Date.UTC(2026, 10, 26, 9, 0, 0);
  const tf1d = getTimeframeByKey('1d')!;
  const tf1wk = getTimeframeByKey('1wk')!;

  const gotoFirstTrade = parseFirstTradeDateMs(new Date('2022-04-11T02:00:00.000Z'));
  const aaplFirstTrade = parseFirstTradeDateMs('1980-12-12T14:30:00.000Z');
  const secEpoch = parseFirstTradeDateMs(1609459200);
  assert.equal(secEpoch, Date.UTC(2021, 0, 1));
  assert.ok(gotoFirstTrade !== null && aaplFirstTrade !== null);

  // 1wk initial window (~6y = 2020) already reaches 2022 IPO of GOTO.JK
  const gotoWkInit = computePaginatedRange({ cfg: tf1wk, nowMs, firstTradeMs: gotoFirstTrade });
  assert.equal(gotoWkInit.hasMoreBeforeStart, false);

  // 1d initial window (~1.5y = May 2025) does NOT yet reach 1980 IPO of AAPL
  const aaplDailyInit = computePaginatedRange({ cfg: tf1d, nowMs, firstTradeMs: aaplFirstTrade });
  assert.equal(aaplDailyInit.hasMoreBeforeStart, true);

  assert.equal(
    hasReachedEarliestHistory({
      windowStartMs: Date.UTC(1980, 11, 1),
      cfg: tf1d,
      nowMs,
      firstTradeMs: aaplFirstTrade,
    }),
    true
  );
  assert.equal(
    hasReachedEarliestHistory({
      windowStartMs: Date.UTC(2024, 0, 1),
      cfg: tf1d,
      nowMs,
      firstTradeMs: aaplFirstTrade,
    }),
    false
  );
});
