import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TV_DEFAULT_GRID_HEIGHT_PX,
  TV_DEFAULT_GRID_WIDTH_PX,
  subdivideXAxisGridTicks,
  subdivideYAxisGridTicks,
  type AxisTickLike,
} from './chartGrid';

test('subdivideXAxisGridTicks turns wide X-axis intervals into ~44px TradingView columns without duplicating text labels', () => {
  const defaultTicks: AxisTickLike[] = [
    { coord: 160, value: 1, text: '11-24' },
    { coord: 400, value: 2, text: '11-25' },
    { coord: 640, value: 3, text: '11-26' },
    { coord: 880, value: 4, text: '11-27' },
  ];

  const ticks = subdivideXAxisGridTicks(defaultTicks, 960, TV_DEFAULT_GRID_WIDTH_PX);
  // Original labeled ticks remain intact
  const labeled = ticks.filter((t) => t.text !== '');
  assert.deepEqual(
    labeled.map((t) => t.text),
    ['11-24', '11-25', '11-26', '11-27']
  );

  // Subdivided unlabeled grid lines snap cleanly to integer coordinates for sharp 1px strokes
  assert.ok(ticks.filter((t) => t.text === '').every((t) => Number.isInteger(t.coord)));

  // Subdivided ticks produce ~20+ evenly spaced ~40-48px vertical columns including left/right margins
  assert.ok(ticks.length >= 19);
  for (let i = 1; i < ticks.length; i++) {
    const gap = ticks[i].coord - ticks[i - 1].coord;
    assert.ok(gap >= 32 && gap <= 62, `Expected column width ~44px, got ${gap}`);
  }
});

test('subdivideXAxisGridTicks subdivides 70px gaps into ~35px columns at default 44px box width', () => {
  const mediumTicks: AxisTickLike[] = [
    { coord: 100, value: 1, text: '10:00' },
    { coord: 170, value: 2, text: '11:00' },
    { coord: 240, value: 3, text: '12:00' },
  ];
  const ticks = subdivideXAxisGridTicks(mediumTicks, 400, TV_DEFAULT_GRID_WIDTH_PX);
  const inner = ticks.filter((t) => t.coord >= 100 && t.coord <= 240);
  assert.equal(inner.length, 5);
  assert.deepEqual(
    inner.filter((t) => t.text !== '').map((t) => t.text),
    ['10:00', '11:00', '12:00']
  );
});

test('subdivideXAxisGridTicks handles single or empty default ticks safely', () => {
  const emptyTicks = subdivideXAxisGridTicks([], 400);
  assert.ok(emptyTicks.length >= 5);
  assert.ok(emptyTicks.every((t) => t.text === ''));

  const singleTicks = subdivideXAxisGridTicks([{ coord: 180, value: 1, text: '10:00' }], 400);
  assert.equal(singleTicks.filter((t) => t.text === '10:00').length, 1);
  assert.ok(singleTicks.length >= 5);
});

test('subdivideYAxisGridTicks bisects sparse horizontal grid rows cleanly with >=32px clearance and BEI fraksi snap', () => {
  // Sparse Y-axis ticks ~100px apart (typical before subdivision)
  const sparseIdxTicks: AxisTickLike[] = [
    { coord: 50, value: 2400, text: '2,400' },
    { coord: 150, value: 2300, text: '2,300' },
    { coord: 250, value: 2200, text: '2,200' },
  ];

  const dense = subdivideYAxisGridTicks(sparseIdxTicks, {
    isIdx: true,
    targetBoxHeight: TV_DEFAULT_GRID_HEIGHT_PX,
  });

  // 2400 -> 2350 -> 2300 -> 2250 -> 2200
  assert.deepEqual(
    dense.map((t) => t.text),
    ['2,400', '2,350', '2,300', '2,250', '2,200']
  );
  for (let i = 1; i < dense.length; i++) {
    assert.ok(Math.abs(dense[i].coord - dense[i - 1].coord) >= 32);
  }
});

test('subdivideYAxisGridTicks supports decimal non-IDX stocks and logarithmic geometric midpoints', () => {
  const usTicks: AxisTickLike[] = [
    { coord: 60, value: 100, text: '100.00' },
    { coord: 160, value: 50, text: '50.00' },
  ];
  const lin = subdivideYAxisGridTicks(usTicks, { isIdx: false, isLog: false });
  assert.deepEqual(
    lin.map((t) => t.text),
    ['100.00', '75.00', '50.00']
  );

  const logTicks: AxisTickLike[] = [
    { coord: 60, value: 400, text: '400.00' },
    { coord: 160, value: 100, text: '100.00' },
  ];
  const log = subdivideYAxisGridTicks(logTicks, { isIdx: false, isLog: true });
  assert.deepEqual(
    log.map((t) => t.text),
    ['400.00', '200.00', '100.00']
  );
});
