import { registerXAxis, registerYAxis, type Chart } from 'klinecharts';
import { isIdxSymbol, snapToIdxTick } from '../../shared/timeframes';
import type { YAxisScaleType } from '../types/chart';
import {
  buildTradingViewXTicks,
  buildTradingViewYTicks,
  logarithmToValue,
  valueToLogarithm,
} from './chartGrid';

export const TV_XAXIS_NAME = 'tv_grid_x';

/**
 * Registers TradingView-matched Y-axis templates on KLineChart v10:
 * - Clean 1-2-2.5-4-5-10 price intervals aligned 1:1 with horizontal grid lines
 * - BEI tick-size ("fraksi harga") snapping & deduplication for `.JK` tickers
 * (X-axis tick callback is bound via `chart.overrideXAxis` in TradingViewWorkspace
 * so it can read live `chart.getDataList()`, `getBarSpace()`, and `convertToPixel()`.)
 */
export function registerChartAxes(): void {
  registerXAxis({ name: TV_XAXIS_NAME });
  registerYAxis({
    name: 'tv_normal',
    createTicks: ({ range, bounding, defaultTicks }) =>
      buildTradingViewYTicks({
        defaultTicks,
        range,
        boundingHeight: bounding.height,
        isIdx: false,
        isLog: false,
      }),
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
    createTicks: ({ range, bounding, defaultTicks }) =>
      buildTradingViewYTicks({
        defaultTicks,
        range,
        boundingHeight: bounding.height,
        isIdx: false,
        isLog: true,
      }),
  });

  registerYAxis({
    name: 'idx_normal',
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ range, bounding, defaultTicks }) =>
      buildTradingViewYTicks({
        defaultTicks,
        range,
        boundingHeight: bounding.height,
        isIdx: true,
        isLog: false,
        precision: 0,
      }),
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
    createTicks: ({ range, bounding, defaultTicks }) =>
      buildTradingViewYTicks({
        defaultTicks,
        range,
        boundingHeight: bounding.height,
        isIdx: true,
        isLog: true,
        precision: 0,
      }),
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

/**
 * Applies TradingView-matched dynamic X-axis (timestamp-locked) and Y-axis
 * (nice price-step & BEI fraksi) overrides onto a KLineChart v10 instance.
 */
export function applyChartAxes(
  chart: Chart,
  symbol: string,
  yAxisScale: YAxisScaleType
): void {
  registerChartAxes();
  chart.overrideXAxis({
    name: TV_XAXIS_NAME,
    createTicks: ({ range, bounding, defaultTicks }) => {
      const bars = chart.getDataList();
      const barSpace = chart.getBarSpace();
      const period = chart.getPeriod();
      return buildTradingViewXTicks({
        defaultTicks,
        boundingWidth: bounding.width,
        bars,
        visibleFrom: range.from,
        visibleTo: range.to,
        barSpacePx: barSpace.bar,
        periodType: period?.type ?? 'day',
        barIndexToX: (dataIndex: number) => {
          const res = chart.convertToPixel([{ dataIndex }], { paneId: 'candle_pane' });
          const pt = Array.isArray(res) ? res[0] : res;
          return typeof pt?.x === 'number' ? pt.x : Number.NaN;
        },
      });
    },
  });
  chart.overrideYAxis({
    paneId: 'candle_pane',
    name: resolveCandleYAxisName(symbol, yAxisScale),
  });
}
