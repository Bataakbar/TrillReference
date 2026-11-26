import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_BAR_SPACE,
  MAX_BAR_SPACE,
  DEFAULT_BAR_SPACE,
  clampBarSpace,
  computeSteppedBarSpace,
  computeFitBarSpace,
} from './chartZoom';

test('clampBarSpace allows sub-pixel X compression down to MIN_BAR_SPACE and caps at MAX_BAR_SPACE', () => {
  assert.equal(clampBarSpace(0.01), MIN_BAR_SPACE);
  assert.equal(clampBarSpace(0.15), 0.15);
  assert.equal(clampBarSpace(150), MAX_BAR_SPACE);
  assert.equal(clampBarSpace(Number.NaN), DEFAULT_BAR_SPACE);
});

test('computeSteppedBarSpace shrinks and expands bar space cleanly without stalling above min', () => {
  const shrunk = computeSteppedBarSpace(1, 0.6);
  assert.ok(shrunk < 1 && shrunk >= MIN_BAR_SPACE);

  const clampedMin = computeSteppedBarSpace(0.06, 0.5);
  assert.equal(clampedMin, MIN_BAR_SPACE);

  const grown = computeSteppedBarSpace(8, 1.5);
  assert.equal(grown, 12);
});

test('computeFitBarSpace fits 7,000 1m bars (~30 days) into a 1100px canvas cleanly', () => {
  const space = computeFitBarSpace(1100, 7000);
  // (1100 - 76) * 0.96 / 7000 ≈ 0.1404 px/bar
  assert.ok(space > 0.13 && space < 0.15, `Expected ~0.14 px/bar, got ${space}`);

  // Even 30,000 bars clamps safely to MIN_BAR_SPACE
  assert.equal(computeFitBarSpace(1100, 30000), MIN_BAR_SPACE);

  // Small bar count (e.g. 5 bars) caps safely at MAX_BAR_SPACE
  assert.equal(computeFitBarSpace(1100, 5), MAX_BAR_SPACE);
});
