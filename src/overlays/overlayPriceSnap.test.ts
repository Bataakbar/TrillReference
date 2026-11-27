import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTradingViewYAxisPill,
  detectChartThemeFromStyles,
  formatOverlayPriceForSymbol,
  isLightColorHex,
  pickContrastTextColor,
  resolveNonOverlappingYPositions,
  resolveThemeAwareOverlayColor,
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

test('detectChartThemeFromStyles and resolveThemeAwareOverlayColor adapt monochrome ink across themes', () => {
  assert.equal(detectChartThemeFromStyles({ overlay: { line: { color: '#1e293b' } } }), 'light');
  assert.equal(detectChartThemeFromStyles({ overlay: { line: { color: '#ffffff' } } }), 'dark');
  assert.equal(detectChartThemeFromStyles({ yAxis: { tickText: { color: '#64748b' } } }), 'light');
  assert.equal(detectChartThemeFromStyles(null), 'dark');

  assert.equal(resolveThemeAwareOverlayColor('#FFFFFF', 'light'), '#1E293B');
  assert.equal(resolveThemeAwareOverlayColor('#1E293B', 'dark'), '#FFFFFF');
  // Explicit colors stay preserved across Light and Dark themes
  assert.equal(resolveThemeAwareOverlayColor('#FACC15', 'light'), '#FACC15');
  assert.equal(resolveThemeAwareOverlayColor('#2962FF', 'dark'), '#2962FF');
  assert.equal(isLightColorHex('#ffffff'), true);
  assert.equal(isLightColorHex('#1e293b'), false);
});

test('buildTradingViewYAxisPill aligns flush past 1px axisLine, clips offscreen, and strokes near-white pills', () => {
  const pill = buildTradingViewYAxisPill({
    boundingWidth: 72,
    boundingHeight: 400,
    isFromZero: true,
    y: 120,
    text: '2,350',
    color: '#1E293B',
  });
  assert.ok(pill);
  assert.equal(pill.attrs.x, 1);
  assert.equal(pill.styles.paddingLeft, 7);
  assert.equal(pill.styles.color, '#ffffff');
  assert.equal(pill.styles.style, 'fill');

  const brightPill = buildTradingViewYAxisPill({
    boundingWidth: 72,
    boundingHeight: 400,
    isFromZero: true,
    y: 120,
    text: '2,350',
    color: '#f8fafc',
  });
  assert.ok(brightPill);
  assert.equal(brightPill.styles.style, 'stroke_fill');
  assert.equal(brightPill.styles.borderSize, 1);
  assert.equal(brightPill.styles.color, '#131722');

  // Offscreen lines should not leak half-clipped Y-axis tags
  assert.equal(
    buildTradingViewYAxisPill({
      boundingWidth: 72,
      boundingHeight: 400,
      isFromZero: true,
      y: -15,
      text: '3,000',
      color: '#FACC15',
    }),
    null
  );
  assert.equal(
    buildTradingViewYAxisPill({
      boundingWidth: 72,
      boundingHeight: 400,
      isFromZero: true,
      y: 418,
      text: '1,800',
      color: '#FACC15',
    }),
    null
  );
});

test('resolveNonOverlappingYPositions separates colliding TP/Entry/SL pills cleanly', () => {
  const ys = resolveNonOverlappingYPositions(
    [
      { y: 100, priority: 0 },
      { y: 104, priority: 1 },
      { y: 108, priority: 2 },
    ],
    400,
    18
  );
  assert.ok(ys[1] - ys[0] >= 18);
  assert.ok(ys[2] - ys[1] >= 18);
});
