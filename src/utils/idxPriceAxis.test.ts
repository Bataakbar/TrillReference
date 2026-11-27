import assert from 'node:assert/strict';
import test from 'node:test';
import type { AxisRange } from 'klinecharts';
import { clampYAxisZoomRange, resolveCandleYAxisName } from './yAxisRangeClamp';

function makeRange(from: number, to: number): AxisRange {
  return {
    from,
    to,
    range: to - from,
    realFrom: from,
    realTo: to,
    realRange: to - from,
    displayFrom: from,
    displayTo: to,
    displayRange: to - from,
  };
}

test('clampYAxisZoomRange stops continuous upward Y drag before IDX ticks & grid lines disappear', () => {
  // PTRO.JK around 2,350 (BEI tick 10) dragged down to 6 IDR span -> clamps cleanly to 80 IDR (8 ticks)
  const micro = clampYAxisZoomRange(makeRange(2347, 2353), { isIdx: true, isLog: false });
  assert.equal(micro.range, 80);
  assert.equal((micro.from + micro.to) / 2, 2350);
  assert.equal(micro.displayRange, 80);

  // Dragging cursor past top of viewport (pageY <= 0 -> negative/inverted span) preserves center & never inverts
  const inverted = clampYAxisZoomRange(
    {
      from: 2406,
      to: 2394,
      range: -12,
      realFrom: 2406,
      realTo: 2394,
      realRange: -12,
      displayFrom: 2406,
      displayTo: 2394,
      displayRange: -12,
    },
    { isIdx: true, isLog: false }
  );
  assert.equal(inverted.range, 80);
  assert.equal(inverted.from, 2360);
  assert.equal(inverted.to, 2440);
});

test('clampYAxisZoomRange enforces BEI minimum spans in Log mode and on non-IDX symbols without restricting normal zoom', () => {
  // Normal wide range passes through untouched
  const normal = makeRange(2000, 2600);
  assert.equal(clampYAxisZoomRange(normal, { isIdx: true, isLog: false }), normal);

  // Log mode clamp recomputes realFrom/realTo cleanly
  const microLog = clampYAxisZoomRange(makeRange(2348, 2352), { isIdx: true, isLog: true });
  assert.equal(microLog.range, 80);
  assert.ok(microLog.realRange > 0 && Number.isFinite(microLog.realFrom));

  // Global stock AAPL (~230) stops cleanly above zero-span
  const usMicro = clampYAxisZoomRange(makeRange(230.01, 229.99), { isIdx: false, isLog: false, precision: 2 });
  assert.ok(usMicro.range >= 0.08 && usMicro.from < usMicro.to);
});

test('resolveCandleYAxisName routes IDX and global scales cleanly', () => {
  assert.equal(resolveCandleYAxisName('PTRO.JK', 'normal'), 'idx_normal');
  assert.equal(resolveCandleYAxisName('PTRO.JK', 'logarithm'), 'idx_logarithm');
  assert.equal(resolveCandleYAxisName('AAPL', 'normal'), 'price_normal');
  assert.equal(resolveCandleYAxisName('AAPL', 'logarithm'), 'price_logarithm');
  assert.equal(resolveCandleYAxisName('AAPL', 'percentage'), 'percentage');
});
