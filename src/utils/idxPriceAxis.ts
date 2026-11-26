import { registerXAxis, registerYAxis } from 'klinecharts';
import { isIdxSymbol, snapToIdxTick } from '../../shared/timeframes';
import type { YAxisScaleType } from '../types/chart';
import { subdivideXAxisGridTicks, subdivideYAxisGridTicks } from './chartGrid';

export const TV_XAXIS_NAME = 'tv_grid_x';

let chartAxesRegistered = false;

function valueToLogarithm(value: number): number {
  return value < 0 ? -Math.log10(1 - value) : Math.log10(1 + value);
}

function logarithmToValue(value: number): number {
  return value < 0 ? 1 - Math.pow(10, -value) : Math.pow(10, value) - 1;
}

/**
 * Registers TradingView-matched Y-axis and X-axis templates on KLineChart v10:
 * - Uniform ~64x50px grid boxes ("kotak-kotak") across both IDX and global markets
 * - BEI tick-size ("fraksi harga") snapping & deduplication for `.JK` tickers
 */
export function registerChartAxes(): void {
  if (chartAxesRegistered) return;
  chartAxesRegistered = true;

  registerXAxis({
    name: TV_XAXIS_NAME,
    createTicks: ({ defaultTicks, bounding }) =>
      subdivideXAxisGridTicks(defaultTicks, bounding.width),
  });

  registerYAxis({
    name: 'tv_normal',
    createTicks: ({ defaultTicks }) =>
      subdivideYAxisGridTicks(defaultTicks, { isIdx: false, isLog: false }),
  });

  registerYAxis({
    name: 'tv_logarithm',
    minSpan: (precision: number) => 0.05 * Math.pow(10, -precision),
    valueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToDisplayValue: (value: number) => logarithmToValue(value),
    displayValueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToValue: (value: number) => logarithmToValue(value),
    createRange: ({ defaultRange }) => {
      const { from, to, range } = defaultRange;
      const realFrom = valueToLogarithm(from);
      const realTo = valueToLogarithm(to);
      return {
        ...defaultRange,
        from,
        to,
        range,
        realFrom,
        realTo,
        realRange: realTo - realFrom,
        displayFrom: from,
        displayTo: to,
        displayRange: range,
      };
    },
    createTicks: ({ defaultTicks }) =>
      subdivideYAxisGridTicks(defaultTicks, { isIdx: false, isLog: true }),
  });

  registerYAxis({
    name: 'idx_normal',
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ defaultTicks }) =>
      subdivideYAxisGridTicks(defaultTicks, { isIdx: true, isLog: false }),
  });

  registerYAxis({
    name: 'idx_logarithm',
    minSpan: (precision: number) => 0.05 * Math.pow(10, -precision),
    valueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToDisplayValue: (value: number) => logarithmToValue(value),
    displayValueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToValue: (value: number) => logarithmToValue(value),
    createRange: ({ defaultRange }) => {
      const { from, to, range } = defaultRange;
      const realFrom = valueToLogarithm(from);
      const realTo = valueToLogarithm(to);
      return {
        ...defaultRange,
        from,
        to,
        range,
        realFrom,
        realTo,
        realRange: realTo - realFrom,
        displayFrom: from,
        displayTo: to,
        displayRange: range,
      };
    },
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ defaultTicks }) =>
      subdivideYAxisGridTicks(defaultTicks, { isIdx: true, isLog: true }),
  });
}

/** Backwards-compatible alias for `registerChartAxes`. */
export const registerIdxYAxes = registerChartAxes;

export function resolveCandleYAxisName(symbol: string, scale: YAxisScaleType): string {
  if (isIdxSymbol(symbol)) {
    return scale === 'logarithm' ? 'idx_logarithm' : 'idx_normal';
  }
  return scale === 'logarithm' ? 'tv_logarithm' : 'tv_normal';
}
