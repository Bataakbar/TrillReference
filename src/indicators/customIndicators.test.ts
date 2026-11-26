import assert from 'node:assert/strict';
import test from 'node:test';
import { computeHeikinAshiBars } from '../../shared/movingAverageMath';
import {
  INDICATOR_CATALOG,
  calcATRSeries,
  calcEmaSmaMultiSeries,
  calcMovingAverageSeries,
  calcSupertrendSeries,
  calcVWAPSeries,
  createDefaultEmaSmaSlots,
  createDefaultIndicators,
  createIndicatorInstance,
  extractSourceValue,
  getActiveEmaSmaSlots,
  getIndicatorDisplayTitle,
  hexWithOpacity,
  isIndicatorVisibleForTimeframe,
  lineDashToKLine,
  type OHLCVSourceBar,
} from './indicatorModel';

const SAMPLE_BARS: OHLCVSourceBar[] = [
  { open: 10, high: 12, low: 8, close: 10, volume: 100 },
  { open: 10, high: 14, low: 9, close: 12, volume: 200 },
  { open: 12, high: 16, low: 11, close: 14, volume: 300 },
  { open: 14, high: 18, low: 13, close: 16, volume: 400 },
  { open: 16, high: 20, low: 15, close: 18, volume: 500 },
  { open: 18, high: 22, low: 17, close: 20, volume: 600 },
  { open: 20, high: 24, low: 19, close: 22, volume: 700 },
  { open: 22, high: 26, low: 21, close: 24, volume: 800 },
];

test('extractSourceValue computes open, high, low, close, hl2, hlc3, and ohlc4 accurately', () => {
  const bar: OHLCVSourceBar = { open: 10, high: 20, low: 8, close: 14 };
  assert.equal(extractSourceValue(bar, 'open'), 10);
  assert.equal(extractSourceValue(bar, 'high'), 20);
  assert.equal(extractSourceValue(bar, 'low'), 8);
  assert.equal(extractSourceValue(bar, 'close'), 14);
  assert.equal(extractSourceValue(bar, 'hl2'), 14);
  assert.equal(extractSourceValue(bar, 'hlc3'), 14);
  assert.equal(extractSourceValue(bar, 'ohlc4'), 13);
});

test('calcMovingAverageSeries computes exact SMA, EMA, WMA, RMA, HMA, and VWMA values', () => {
  const sma = calcMovingAverageSeries(SAMPLE_BARS, 'SMA', 3, 'close', 0);
  assert.equal(sma[0], undefined);
  assert.equal(sma[1], undefined);
  assert.equal(sma[2], 12); // (10 + 12 + 14) / 3
  assert.equal(sma[3], 14);

  const ema = calcMovingAverageSeries(SAMPLE_BARS, 'EMA', 3, 'close', 0);
  assert.equal(ema[2], 12); // SMA seed
  assert.equal(ema[3], 14); // 16 * 0.5 + 12 * 0.5

  const wma = calcMovingAverageSeries(SAMPLE_BARS, 'WMA', 3, 'close', 0);
  assert.ok(Math.abs((wma[2] ?? 0) - (10 * 1 + 12 * 2 + 14 * 3) / 6) < 1e-9);

  const rma = calcMovingAverageSeries(SAMPLE_BARS, 'RMA', 3, 'close', 0);
  assert.equal(rma[2], 12);
  assert.ok(Math.abs((rma[3] ?? 0) - (12 * 2 + 16) / 3) < 1e-9);

  const hma = calcMovingAverageSeries(SAMPLE_BARS, 'HMA', 4, 'close', 0);
  assert.ok(typeof hma[7] === 'number' && Number.isFinite(hma[7]));

  const vwma = calcMovingAverageSeries(SAMPLE_BARS, 'VWMA', 2, 'close', 0);
  const expectedVwma1 = (10 * 100 + 12 * 200) / 300;
  assert.ok(Math.abs((vwma[1] ?? 0) - expectedVwma1) < 1e-9);
});

test('calcMovingAverageSeries shifts series forward and backward with offset', () => {
  const base = calcMovingAverageSeries(SAMPLE_BARS, 'SMA', 3, 'close', 0);
  const forward = calcMovingAverageSeries(SAMPLE_BARS, 'SMA', 3, 'close', 2);
  const backward = calcMovingAverageSeries(SAMPLE_BARS, 'SMA', 3, 'close', -1);

  assert.equal(forward[4], base[2]);
  assert.equal(forward[2], undefined);
  assert.equal(backward[1], base[2]);
  assert.equal(backward[SAMPLE_BARS.length - 1], undefined);
});

test('calcEmaSmaMultiSeries computes active EMA/SMA slots and skips disabled or zero-length slots', () => {
  const slots = createDefaultEmaSmaSlots();
  // Customize first 3 slots for short sample test
  slots[0].length = 3; // EMA1 enabled
  slots[1].length = 4; // EMA2 enabled
  slots[2].enabled = false; // EMA3 disabled
  slots[7].length = 0; // EMA8 length=0
  slots[7].enabled = true; // still skipped because length <= 0
  slots[8].length = 3; // SMA1 enabled

  const res = calcEmaSmaMultiSeries(SAMPLE_BARS, slots, 'close');
  assert.equal(res[2].ema1, 12);
  assert.equal(res[2].sma1, 12);
  assert.equal(res[3].ema2, 13);
  assert.equal(res[2].ema3, undefined);
  assert.equal(res[2].ema8, undefined);
});

test('createDefaultEmaSmaSlots matches TradingView EMA/SMA default configuration', () => {
  const defaults = createDefaultIndicators();
  const emaSma = defaults.find((d) => d.kind === 'EMA_SMA');
  assert.ok(emaSma);
  assert.equal(getIndicatorDisplayTitle(emaSma), 'EMA/SMA');
  const active = getActiveEmaSmaSlots(emaSma);
  assert.deepEqual(
    active.map((s) => `${s.label}:${s.length}`),
    ['EMA1:10', 'EMA2:20', 'EMA3:50', 'EMA4:200', 'SMA1:65']
  );

  const vol = defaults.find((d) => d.kind === 'VOL');
  assert.ok(vol);
  assert.deepEqual(vol.params, [50, 20, 100, 200]);
  assert.equal(vol.slots?.length, 4);
  assert.equal(vol.slots?.filter((s) => s.enabled).length, 1);
  assert.equal(getIndicatorDisplayTitle(vol), 'VOL (MA50)');
});

test('hexWithOpacity and isIndicatorVisibleForTimeframe behave accurately', () => {
  assert.equal(hexWithOpacity('#1E88E5', 100), '#1E88E5');
  assert.equal(hexWithOpacity('#1E88E5', 50), 'rgba(30, 136, 229, 0.50)');

  const inst = createDefaultIndicators()[0];
  inst.visibility = { minutes: false, hours: true, days: true, weeks: true, months: false };
  assert.equal(isIndicatorVisibleForTimeframe(inst, '5m'), false);
  assert.equal(isIndicatorVisibleForTimeframe(inst, '1h'), true);
  assert.equal(isIndicatorVisibleForTimeframe(inst, '1d'), true);
  assert.equal(isIndicatorVisibleForTimeframe(inst, '1wk'), true);
  assert.equal(isIndicatorVisibleForTimeframe(inst, '1mo'), false);
  assert.equal(isIndicatorVisibleForTimeframe(inst, '1y'), false);
});

test('lineDashToKLine maps solid, dashed, and dotted presets correctly', () => {
  assert.deepEqual(lineDashToKLine('solid'), { style: 'solid', dashedValue: [] });
  assert.deepEqual(lineDashToKLine('dashed'), { style: 'dashed', dashedValue: [6, 4] });
  assert.deepEqual(lineDashToKLine('dotted'), { style: 'dashed', dashedValue: [2, 3] });
});

test('getIndicatorDisplayTitle formats flexible moving averages clearly', () => {
  const inst = createDefaultIndicators()[0];
  assert.equal(getIndicatorDisplayTitle(inst), 'EMA/SMA');
  assert.equal(
    getIndicatorDisplayTitle({
      id: 'flex_1',
      kind: 'FLEX_MA',
      pane: 'main',
      visible: true,
      maType: 'HMA',
      source: 'hl2',
      offset: 3,
      params: [55],
      plots: [],
    }),
    'HMA 55 hl2 +3'
  );
});

test('calcATRSeries, calcSupertrendSeries, calcVWAPSeries, and computeHeikinAshiBars compute accurate outputs', () => {
  // 1. ATR
  const atrBars: OHLCVSourceBar[] = [
    { timestamp: Date.UTC(2026, 0, 1, 2), open: 100, high: 110, low: 90, close: 105, volume: 1000 }, // TR = 20
    { timestamp: Date.UTC(2026, 0, 1, 3), open: 105, high: 115, low: 100, close: 112, volume: 2000 }, // TR = 15
    { timestamp: Date.UTC(2026, 0, 1, 4), open: 112, high: 120, low: 108, close: 118, volume: 1500 }, // TR = 12
    { timestamp: Date.UTC(2026, 0, 2, 2), open: 118, high: 122, low: 112, close: 120, volume: 3000 }, // new day TR = 10
    { timestamp: Date.UTC(2026, 0, 2, 3), open: 120, high: 121, low: 95, close: 96, volume: 5000 }, // reversal down
  ];
  const atr2 = calcATRSeries(atrBars, 2);
  assert.equal(atr2[0], undefined);
  assert.equal(atr2[1], 17.5); // (20 + 15) / 2
  assert.equal(atr2[2], 14.75); // (17.5 * 1 + 12) / 2

  // 2. VWAP daily session reset vs continuous
  const vwapSession = calcVWAPSeries(atrBars, 'session');
  const tp0 = (110 + 90 + 105) / 3;
  assert.ok(Math.abs((vwapSession[0] ?? 0) - tp0) < 1e-9);
  // Day 2 resets cleanly at index 3 (timestamp Jan 2)
  const tp3 = (122 + 112 + 120) / 3;
  assert.ok(Math.abs((vwapSession[3] ?? 0) - tp3) < 1e-9);

  const vwapWeek = calcVWAPSeries(atrBars, 'week'); // both Jan 1 & Jan 2 2026 are in same Mon-Sun week
  assert.ok(Math.abs((vwapWeek[3] ?? 0) - tp3) > 1);

  // 3. Supertrend flips cleanly from bullish (+1) to bearish (-1)
  const stBars: OHLCVSourceBar[] = Array.from({ length: 14 }, (_, i) => {
    if (i < 10) {
      const c = 100 + i * 2;
      return { open: c - 1, high: c + 2, low: c - 2, close: c, volume: 1000 };
    }
    const c = 115 - (i - 10) * 14;
    return { open: c + 4, high: c + 5, low: c - 2, close: c, volume: 2000 };
  });
  const st = calcSupertrendSeries(stBars, 3, 1.5);
  assert.equal(st[2]?.direction, 1);
  assert.equal(st[st.length - 1]?.direction, -1);

  // 4. Heikin Ashi smoothing preserves timestamp & volume
  const ha = computeHeikinAshiBars(atrBars);
  assert.equal(ha.length, atrBars.length);
  assert.equal(ha[0].close, (100 + 110 + 90 + 105) / 4);
  assert.equal(ha[0].open, (100 + 105) / 2);
  assert.equal(ha[1].open, (ha[0].open + ha[0].close) / 2);
  assert.equal(ha[0].timestamp, atrBars[0].timestamp);
  assert.equal(ha[0].volume, atrBars[0].volume);

  // 5. Catalog registration checks
  for (const kind of ['VWAP', 'SUPERTREND', 'ATR']) {
    assert.ok(INDICATOR_CATALOG.some((c) => c.kind === kind), `Missing catalog entry ${kind}`);
    const inst = createIndicatorInstance(kind);
    assert.equal(inst.kind, kind);
    assert.ok(getIndicatorDisplayTitle(inst).includes(kind));
  }
});
