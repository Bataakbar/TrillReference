import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatOverlayPriceForSymbol,
  pickContrastTextColor,
  snapOverlayPointsForSymbol,
  snapOverlayPriceForSymbol,
} from './overlayPriceSnap';

test('snapOverlayPriceForSymbol enforces BEI fraksi harga on IDX stocks and preserves decimals on US/crypto', () => {
  // PTRO.JK in 2,000..5,000 tier (tick 10): 2,277 is invalid -> snaps to 2,280
  assert.equal(snapOverlayPriceForSymbol('PTRO.JK', 2277.4, true), 2280);
  assert.equal(snapOverlayPriceForSymbol('PTRO.JK', 2273.1, true), 2270);
  assert.equal(snapOverlayPriceForSymbol('BBCA.JK', 9860, true), 9850); // >= 5,000 tick 25
  assert.equal(snapOverlayPriceForSymbol('BUMI.JK', 343.2, true), 344); // 200..500 tick 2

  // Sub-pane indicators (e.g. RSI) and non-IDX tickers preserve decimals cleanly
  assert.equal(snapOverlayPriceForSymbol('PTRO.JK', 45.32, false), 45.32);
  assert.equal(snapOverlayPriceForSymbol('AAPL', 227.77, true), 227.77);
});

test('formatOverlayPriceForSymbol never outputs illegal IDX prices like 2,277', () => {
  assert.equal(formatOverlayPriceForSymbol('PTRO.JK', 2277, 0, true), '2,280');
  assert.equal(formatOverlayPriceForSymbol('PTRO.JK', 5762, 0, true), '5,750');
  assert.equal(formatOverlayPriceForSymbol('AAPL', 227.75, 2, true), '227.75');
});

test('snapOverlayPointsForSymbol snaps all numeric point values cleanly without mutating timestamps', () => {
  const input = [
    { timestamp: 1700000000000, value: 2277 },
    { timestamp: 1700086400000, value: 2343 },
  ];
  const snapped = snapOverlayPointsForSymbol('PTRO.JK', input, true);
  assert.deepEqual(snapped, [
    { timestamp: 1700000000000, value: 2280 },
    { timestamp: 1700086400000, value: 2340 },
  ]);
  // Original array untouched
  assert.equal(input[0].value, 2277);
});

test('pickContrastTextColor picks dark ink for white/bright pills and white text for dark pills', () => {
  assert.equal(pickContrastTextColor('#ffffff'), '#131722');
  assert.equal(pickContrastTextColor('#facc15'), '#131722');
  assert.equal(pickContrastTextColor('#2962ff'), '#ffffff');
  assert.equal(pickContrastTextColor('#f23645'), '#ffffff');
});
