import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TV_DARK_GRID_COLOR,
  TV_LIGHT_GRID_COLOR,
  buildTradingViewXTicks,
  buildTradingViewYTicks,
  type AxisRangeLike,
  type AxisTickLike,
} from './chartGrid';

function makeDailyBars(count: number, startUtcMs = Date.UTC(2026, 7, 1, 0, 0, 0)) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: startUtcMs + i * 86_400_000,
  }));
}

function makeIntradayBars(count: number, startUtcMs = Date.UTC(2026, 10, 23, 2, 0, 0)) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: startUtcMs + i * 900_000,
  }));
}

test('grid colors match TradingView subtle 5.5%-6% opacity ("lebih buram")', () => {
  assert.equal(TV_DARK_GRID_COLOR, 'rgba(240, 243, 250, 0.055)');
  assert.equal(TV_LIGHT_GRID_COLOR, 'rgba(42, 46, 57, 0.06)');
});

test('buildTradingViewXTicks aligns 1:1 with real timestamps and adapts dynamically across X zoom OUT, NORMAL, and IN', () => {
  const bars = makeDailyBars(420);
  const boundingWidth = 1000;

  // 1. Zoom X OUT wide (~2.2px/bar -> ~450 bars visible): thins cleanly to Month/Year boundaries
  const zoomedOut = buildTradingViewXTicks({
    defaultTicks: [],
    boundingWidth,
    bars,
    visibleFrom: 0,
    visibleTo: 420,
    barSpacePx: 2.2,
    barIndexToX: (idx) => idx * 2.2,
    periodType: 'day',
    useUtc: true,
  });
  assert.ok(zoomedOut.length >= 6 && zoomedOut.length <= 16);
  assert.ok(
    zoomedOut.every((t) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|202\d)$/.test(t.text)),
    `Expected Month/Year ticks on wide zoom out, got ${zoomedOut.map((t) => t.text).join(', ')}`
  );

  // 2. Normal X zoom (~12px/bar -> ~83 bars): shows clean Month & Day ticks ~54-90px apart
  const normalZoom = buildTradingViewXTicks({
    defaultTicks: [],
    boundingWidth,
    bars,
    visibleFrom: 60,
    visibleTo: 143,
    barSpacePx: 12,
    barIndexToX: (idx) => (idx - 60) * 12,
    periodType: 'day',
    useUtc: true,
  });
  assert.ok(normalZoom.length >= 10);
  assert.ok(normalZoom.every((t) => t.text !== ''), 'Every vertical grid line must have an X-axis label');
  for (let i = 1; i < normalZoom.length; i++) {
    assert.ok(normalZoom[i].coord - normalZoom[i - 1].coord >= 38);
  }

  // 3. Zoom X IN extreme (~64px/bar -> ~15 bars): shows vertical grid line + label for EVERY bar
  const zoomedIn = buildTradingViewXTicks({
    defaultTicks: [],
    boundingWidth,
    bars,
    visibleFrom: 60,
    visibleTo: 75,
    barSpacePx: 64,
    barIndexToX: (idx) => (idx - 60) * 64,
    periodType: 'day',
    useUtc: true,
  });
  assert.ok(zoomedIn.length >= 13);
  assert.ok(zoomedIn.every((t) => t.text !== ''));
});

test('buildTradingViewXTicks avoids edge clipping near Y-axis and formats intraday sessions cleanly', () => {
  // 90 bars * 30m = ~45 hours spanning two dates cleanly inside viewport
  const startUtcMs = Date.UTC(2026, 10, 23, 18, 0, 0);
  const bars = Array.from({ length: 90 }, (_, i) => ({
    timestamp: startUtcMs + i * 1_800_000,
  }));
  const ticks = buildTradingViewXTicks({
    defaultTicks: [],
    boundingWidth: 800,
    bars,
    visibleFrom: 0,
    visibleTo: 89,
    barSpacePx: 8.8,
    barIndexToX: (idx) => idx * 8.8,
    periodType: 'minute',
    useUtc: true,
  });

  assert.ok(ticks.length >= 8);
  assert.ok(ticks.every((t) => t.coord >= 20 && t.coord <= 780));
  assert.ok(ticks.some((t) => /^\d{2}-\d{2}$/.test(t.text)));
  assert.ok(ticks.some((t) => /^\d{2}:\d{2}$/.test(t.text)));
});

test('buildTradingViewYTicks matches TradingView nice step ladder (10 -> 50 -> 1000) across Y scale changes & IDX fraksi', () => {
  const makeRange = (from: number, to: number): AxisRangeLike => ({
    from,
    to,
    range: to - from,
    realFrom: from,
    realTo: to,
    realRange: to - from,
    displayFrom: from,
    displayTo: to,
    displayRange: to - from,
  });

  // Compressed Y (-1,000 .. 8,000) -> step 1,000
  const compressed = buildTradingViewYTicks({
    defaultTicks: [],
    range: makeRange(-1000, 8000),
    boundingHeight: 400,
    isIdx: true,
  });
  assert.ok(compressed.length >= 6);
  for (let i = 1; i < compressed.length; i++) {
    assert.equal(Number(compressed[i].value) - Number(compressed[i - 1].value), 1000);
  }

  // Normal Y (2,100 .. 2,550) -> clean step 50 (never awkward 30/60)
  const normal = buildTradingViewYTicks({
    defaultTicks: [],
    range: makeRange(2100, 2550),
    boundingHeight: 420,
    isIdx: true,
  });
  assert.deepEqual(
    normal.map((t) => t.text),
    ['2,150', '2,200', '2,250', '2,300', '2,350', '2,400', '2,450', '2,500']
  );

  // Expanded Y (3,835 .. 3,925) -> clean step 10
  const expanded = buildTradingViewYTicks({
    defaultTicks: [],
    range: makeRange(3835, 3925),
    boundingHeight: 420,
    isIdx: true,
  });
  assert.deepEqual(
    expanded.map((t) => t.text),
    ['3,840', '3,850', '3,860', '3,870', '3,880', '3,890', '3,900', '3,910', '3,920']
  );

  // Stretched IDX Y inside 2,000..5,000 tier (tick 10) never picks 25 -> uniform spacing
  const stretched = buildTradingViewYTicks({
    defaultTicks: [],
    range: makeRange(2130, 2550),
    boundingHeight: 600,
    isIdx: true,
  });
  assert.ok(stretched.length >= 6);
  const stretchedDiffs = new Set<number>();
  for (let i = 1; i < stretched.length; i++) {
    stretchedDiffs.add(Number(stretched[i].value) - Number(stretched[i - 1].value));
  }
  assert.equal(stretchedDiffs.size, 1, `Expected uniform IDX step, got ${[...stretchedDiffs].join(',')}`);
});

test('buildTradingViewYTicks falls back safely on invalid ranges', () => {
  const fallback: AxisTickLike[] = [{ coord: 100, value: 500, text: '500' }];
  const out = buildTradingViewYTicks({
    defaultTicks: fallback,
    range: {
      from: 0,
      to: 0,
      range: 0,
      realFrom: 0,
      realTo: 0,
      realRange: 0,
      displayFrom: 0,
      displayTo: 0,
      displayRange: 0,
    },
    boundingHeight: 0,
    isIdx: true,
  });
  assert.deepEqual(out, fallback);
});
