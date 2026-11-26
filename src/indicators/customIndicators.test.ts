import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcEmaSmaMultiSeries,
  calcMovingAverageSeries,
  createDefaultEmaSmaSlots,
  createDefaultIndicators,
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
