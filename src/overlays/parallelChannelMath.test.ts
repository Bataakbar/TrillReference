import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeAlignedThirdPoint,
  computeLinearRegressionChannel,
  computeParallelChannelGeometry,
  resolveBarIndexFromPoint,
} from './parallelChannelMath';

test('computeParallelChannelGeometry creates bounded parallel segments and exact 50% midline', () => {
  // Upward base line from (100, 300) to (300, 200) -> slope = -0.5
  const c0 = { x: 100, y: 300 };
  const c1 = { x: 300, y: 200 };
  // Cursor at x=200 (midpoint where base y=250), placed 60px above at y=190
  const c2 = { x: 200, y: 190 };

  const geom = computeParallelChannelGeometry(c0, c1, c2);

  // Strictly bounded between x=100 and x=300 (NOT infinite!)
  assert.deepEqual(geom.baseLine, [
    { x: 100, y: 300 },
    { x: 300, y: 200 },
  ]);
  assert.deepEqual(geom.oppositeLine, [
    { x: 100, y: 240 },
    { x: 300, y: 140 },
  ]);
  assert.deepEqual(geom.midLine, [
    { x: 100, y: 270 },
    { x: 300, y: 170 },
  ]);

  // Opposite line passes strictly through cursor c2=(200, 190)
  const oppMidY = (geom.oppositeLine[0].y + geom.oppositeLine[1].y) / 2;
  assert.equal(oppMidY, c2.y);

  // Fill polygon connects P0 -> P1 -> Q1 -> Q0 cleanly
  assert.deepEqual(geom.fillPolygon, [
    { x: 100, y: 300 },
    { x: 300, y: 200 },
    { x: 300, y: 140 },
    { x: 100, y: 240 },
  ]);
});

test('computeParallelChannelGeometry extends right cleanly when extendRight is enabled', () => {
  const geom = computeParallelChannelGeometry(
    { x: 100, y: 300 },
    { x: 200, y: 250 },
    { x: 100, y: 240 },
    { extendRight: true, boundingWidth: 800 }
  );

  assert.deepEqual(geom.baseLine, [
    { x: 100, y: 300 },
    { x: 800, y: -50 },
  ]);
  assert.deepEqual(geom.oppositeLine, [
    { x: 100, y: 240 },
    { x: 800, y: -110 },
  ]);
});

test('computeParallelChannelGeometry handles vertical channels without NaN', () => {
  const geom = computeParallelChannelGeometry(
    { x: 150, y: 100 },
    { x: 150, y: 300 },
    { x: 210, y: 200 }
  );

  assert.deepEqual(geom.oppositeLine, [
    { x: 210, y: 100 },
    { x: 210, y: 300 },
  ]);
  assert.deepEqual(geom.midLine, [
    { x: 180, y: 100 },
    { x: 180, y: 300 },
  ]);
});

test('computeAlignedThirdPoint aligns 3rd anchor to P0 bar while keeping opposite line on cursor', () => {
  const p0 = { timestamp: 1000, dataIndex: 10, value: 5000 };
  const p1 = { timestamp: 3000, dataIndex: 30, value: 6000 }; // +50 / bar
  // Cursor at bar 20 (base=5500), price 5900 (+400 above base)
  const cursor = { timestamp: 2000, dataIndex: 20, value: 5900 };

  const aligned = computeAlignedThirdPoint(p0, p1, cursor);
  assert.deepEqual(aligned, {
    timestamp: 1000,
    dataIndex: 10,
    value: 5400, // 5000 + 400 -> opposite line at bar 20 is 5400 + 50*10 = 5900!
  });
});

test('computeLinearRegressionChannel fits exact OLS line and Pearson r on linear series', () => {
  // Perfect linear series y = 100 + 5*i
  const closes = [100, 105, 110, 115, 120, 125];
  const reg = computeLinearRegressionChannel(closes, 1, 5, 2);
  assert.ok(reg);
  assert.equal(reg.startIndex, 1);
  assert.equal(reg.endIndex, 5);
  assert.ok(Math.abs(reg.slope - 5) < 1e-9);
  assert.ok(Math.abs(reg.midStart - 105) < 1e-9);
  assert.ok(Math.abs(reg.midEnd - 125) < 1e-9);
  assert.ok(Math.abs(reg.stdDev) < 1e-9);
  assert.ok(Math.abs(reg.pearsonR - 1) < 1e-9);
});

test('computeLinearRegressionChannel computes symmetric +/-2 sigma upper and lower bands', () => {
  // Oscillating around y = 50 with exact residuals [+2, -2, +2, -2] -> stdDev = 2
  const closes = [52, 48, 52, 48];
  const reg = computeLinearRegressionChannel(closes, 3, 0, 2); // reversed indices handled
  assert.ok(reg);
  assert.equal(reg.startIndex, 0);
  assert.equal(reg.endIndex, 3);
  assert.ok(reg.stdDev > 1.5);
  assert.ok(Math.abs(reg.upperStart - reg.midStart - reg.stdDev * 2) < 1e-9);
  assert.ok(Math.abs(reg.midStart - reg.lowerStart - reg.stdDev * 2) < 1e-9);
  assert.ok(Math.abs(reg.upperEnd - reg.midEnd - reg.stdDev * 2) < 1e-9);
  assert.ok(Math.abs(reg.midEnd - reg.lowerEnd - reg.stdDev * 2) < 1e-9);
});

test('resolveBarIndexFromPoint prefers timestamp lookup and falls back to clamped dataIndex', () => {
  const ts = [1000, 2000, 3000, 4000, 5000];
  // Exact timestamp match overrides stale dataIndex
  assert.equal(resolveBarIndexFromPoint(ts, { timestamp: 3000, dataIndex: 0 }), 2);
  // Nearest timestamp match between 2000 and 3000
  assert.equal(resolveBarIndexFromPoint(ts, { timestamp: 2800 }), 2);
  assert.equal(resolveBarIndexFromPoint(ts, { timestamp: 2200 }), 1);
  // Fallback to clamped dataIndex when timestamp is undefined
  assert.equal(resolveBarIndexFromPoint(ts, { dataIndex: 99 }), 4);
  assert.equal(resolveBarIndexFromPoint(ts, { dataIndex: -5 }), 0);
});


